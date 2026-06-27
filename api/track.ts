import type { VercelRequest, VercelResponse } from "@vercel/node";
import { sbInsert } from "../lib/supabaseRest";

/**
 * Visitor analytics logger. POST one visit row to Supabase on every page load.
 *
 * Best-effort by design: any failure (missing env, bad insert, malformed body)
 * resolves to a 204 so the client tracker never throws and never blocks the
 * page. Geo/IP fields are derived entirely from Vercel's edge headers — no
 * third-party geo lookup.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const body = (req.body ?? {}) as {
      screen?: string;
      language?: string;
      isReturning?: boolean;
      path?: string;
      referrer?: string;
    };

    const userAgent = header(req, "user-agent") ?? "";
    const ua = parseUserAgent(userAgent);

    await sbInsert("visits", {
      ip: clientIp(req),
      country: header(req, "x-vercel-ip-country") ?? null,
      region: header(req, "x-vercel-ip-country-region") ?? null,
      city: decode(header(req, "x-vercel-ip-city")),
      latitude: header(req, "x-vercel-ip-latitude") ?? null,
      longitude: header(req, "x-vercel-ip-longitude") ?? null,
      user_agent: userAgent || null,
      browser: ua.browser,
      os: ua.os,
      device_type: ua.deviceType,
      referrer: body.referrer || header(req, "referer") || null,
      screen: body.screen ?? null,
      language: body.language ?? null,
      is_returning: typeof body.isReturning === "boolean" ? body.isReturning : null,
      path: body.path ?? null,
    });
  } catch {
    // Swallow — analytics must never break a request.
  }

  res.status(204).end();
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
