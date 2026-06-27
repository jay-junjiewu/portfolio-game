import type { VercelRequest, VercelResponse } from "@vercel/node";
import { sbInsert, sbUpdate } from "../lib/supabaseRest.js";

/**
 * Visitor analytics logger.
 *
 *  • Load beacon  → INSERT a rich visit row (geo/IP from Vercel headers, device
 *    fingerprint from the client body, ISP/org from a best-effort ipwho.is
 *    lookup, bot/hosting heuristics).
 *  • Exit beacon  → UPDATE that row (matched by session_id) with engagement:
 *    dwell time, sections viewed, chat used, click count.
 *
 * Best-effort by design: any failure resolves to 204 so the client tracker
 * never throws and never blocks the page.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const body = parseBody(req.body);

  try {
    if (body.type === "engagement") {
      await updateEngagement(body);
    } else {
      await insertVisit(req, body);
    }
  } catch {
    // Swallow — analytics must never break a request.
  }

  res.status(204).end();
}

// --- INSERT: one row per page load -----------------------------------------

async function insertVisit(req: VercelRequest, body: Record<string, unknown>): Promise<void> {
  const userAgent = header(req, "user-agent") ?? "";
  const ua = parseUserAgent(userAgent);
  const ip = clientIp(req);
  const net = await lookupNetwork(ip);

  await sbInsert("visits", {
    // geo / network (Vercel edge headers)
    ip,
    country: header(req, "x-vercel-ip-country") ?? null,
    region: header(req, "x-vercel-ip-country-region") ?? null,
    city: decode(header(req, "x-vercel-ip-city")),
    latitude: header(req, "x-vercel-ip-latitude") ?? null,
    longitude: header(req, "x-vercel-ip-longitude") ?? null,
    postal_code: header(req, "x-vercel-ip-postal-code") ?? null,
    // network intelligence (ipwho.is + heuristics)
    isp: net.isp,
    org: net.org,
    asn: net.asn,
    is_hosting: net.is_hosting,
    is_bot: BOT_RE.test(userAgent),
    // user agent
    user_agent: userAgent || null,
    browser: ua.browser,
    os: ua.os,
    device_type: ua.deviceType,
    // core client fields
    referrer: str(body.referrer) ?? header(req, "referer") ?? null,
    path: str(body.path),
    is_returning: bool(body.isReturning),
    screen: str(body.screen),
    language: str(body.language),
    languages: str(body.languages),
    // identity + traffic source
    visitor_id: str(body.visitorId),
    session_id: str(body.sessionId),
    visit_count: num(body.visitCount),
    utm_source: str(body.utmSource),
    utm_medium: str(body.utmMedium),
    utm_campaign: str(body.utmCampaign),
    query_string: str(body.queryString),
    // device fingerprint
    timezone: str(body.timezone) ?? header(req, "x-vercel-ip-timezone") ?? null,
    viewport: str(body.viewport),
    pixel_ratio: num(body.pixelRatio),
    color_depth: num(body.colorDepth),
    cpu_cores: num(body.cpuCores),
    device_memory: num(body.deviceMemory),
    touch_points: num(body.touchPoints),
    color_scheme: str(body.colorScheme),
    platform: str(body.platform),
    gpu: str(body.gpu),
    gpu_vendor: str(body.gpuVendor),
    connection_type: str(body.connectionType),
    downlink: num(body.downlink),
    rtt: num(body.rtt),
    device_model: str(body.deviceModel),
    os_version: str(body.osVersion),
    cpu_arch: str(body.cpuArch),
  });
}

// --- UPDATE: engagement on exit (matched by session_id) --------------------

async function updateEngagement(body: Record<string, unknown>): Promise<void> {
  const sessionId = str(body.sessionId);
  if (!sessionId) return;
  await sbUpdate("visits", `session_id=eq.${encodeURIComponent(sessionId)}`, {
    dwell_ms: num(body.dwellMs),
    sections_viewed: str(body.sectionsViewed),
    chat_used: bool(body.chatUsed),
    clicks: num(body.clicks),
  });
}

// --- ISP / organization lookup (best-effort, free, no key) ------------------

const HOSTING_RE =
  /\b(amazon|aws|google|gcp|azure|microsoft|digitalocean|ovh|hetzner|linode|vultr|cloudflare|akamai|fastly|leaseweb|choopa|contabo|m247|datacamp|oracle cloud|alibaba|tencent cloud|hosting|datacenter|data ?center|colo|cloud)\b/i;

const BOT_RE =
  /(bot|crawl|spider|slurp|headless|phantomjs|puppeteer|playwright|python-requests|curl\/|wget|axios|node-fetch|go-http|java\/|bingpreview|facebookexternalhit|embedly|preview|monitor|scan)/i;

interface IpWho {
  success?: boolean;
  connection?: { isp?: string; org?: string; asn?: number | string };
}

async function lookupNetwork(
  ip: string | null,
): Promise<{ isp: string | null; org: string | null; asn: string | null; is_hosting: boolean | null }> {
  const empty = { isp: null, org: null, asn: null, is_hosting: null };
  if (!ip || ip === "unknown" || isPrivateIp(ip)) return empty;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 1500);
    const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}?fields=success,connection`, {
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return empty;
    const data = (await res.json()) as IpWho;
    if (!data?.success || !data.connection) return empty;
    const isp = data.connection.isp ?? null;
    const org = data.connection.org ?? null;
    const asn = data.connection.asn != null ? String(data.connection.asn) : null;
    const haystack = `${isp ?? ""} ${org ?? ""}`;
    return { isp, org, asn, is_hosting: HOSTING_RE.test(haystack) };
  } catch {
    return empty;
  }
}

function isPrivateIp(ip: string): boolean {
  return (
    ip === "::1" ||
    ip.startsWith("127.") ||
    ip.startsWith("10.") ||
    ip.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(ip) ||
    ip.startsWith("fc") ||
    ip.startsWith("fd") ||
    ip.startsWith("169.254.")
  );
}

// --- helpers ----------------------------------------------------------------

function parseBody(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === "object") return raw as Record<string, unknown>;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  }
  return {};
}

/** Trimmed non-empty string, else null. Coerces numbers/booleans to text. */
function str(v: unknown): string | null {
  if (typeof v === "string") {
    const t = v.trim();
    return t.length > 0 ? t : null;
  }
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return null;
}

/** Finite number, else null. */
function num(v: unknown): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
}

function bool(v: unknown): boolean | null {
  return typeof v === "boolean" ? v : null;
}

function header(req: VercelRequest, name: string): string | undefined {
  const value = req.headers[name];
  return Array.isArray(value) ? value[0] : value;
}

/** First hop is the real client; subsequent entries are proxies we added. */
function clientIp(req: VercelRequest): string | null {
  const vercel = header(req, "x-vercel-forwarded-for");
  if (vercel) return vercel.split(",")[0].trim();
  const forwarded = header(req, "x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return header(req, "x-real-ip") ?? null;
}

function decode(value: string | undefined): string | null {
  if (!value) return null;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function parseUserAgent(ua: string): { browser: string; os: string; deviceType: string } {
  // Order matters: Edge/Chrome both contain "Chrome"; Chrome contains "Safari".
  let browser = "Unknown";
  if (/Edg[A-Z]?\//i.test(ua)) browser = "Edge";
  else if (/Firefox\//i.test(ua)) browser = "Firefox";
  else if (/Chrome\//i.test(ua)) browser = "Chrome";
  else if (/Safari\//i.test(ua)) browser = "Safari";

  let os = "Unknown";
  if (/Windows/i.test(ua)) os = "Windows";
  else if (/Android/i.test(ua)) os = "Android";
  else if (/iPhone|iPad|iPod/i.test(ua)) os = "iOS";
  else if (/Mac OS X|Macintosh/i.test(ua)) os = "macOS";
  else if (/Linux/i.test(ua)) os = "Linux";

  const deviceType = /Mobi|Android|iPhone|iPod|iPad/i.test(ua) ? "mobile" : "desktop";

  return { browser, os, deviceType };
}
