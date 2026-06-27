import type { VercelRequest, VercelResponse } from "@vercel/node";
import { sbSelect, sbCount, supabaseConfigured } from "../lib/supabaseRest.js";

// Loosely typed — `select=*` returns every column, including the ~36 added
// later. We only read a few here for aggregates; the rest pass through to the
// dashboard untouched, so an index signature keeps this forgiving.
type Visit = {
  created_at: string;
  ip: string | null;
  country: string | null;
  device_type: string | null;
  [key: string]: unknown;
};

type ChatMessageRow = {
  created_at: string;
  ip: string | null;
  session_id: string | null;
  question: string | null;
  answer: string | null;
  model: string | null;
};

/**
 * Private analytics dashboard API. GET only, gated by STATS_SECRET. Returns
 * computed aggregates plus the latest 100 visits. Aggregates are derived in JS
 * from a single fetched window so the dashboard stays one round-trip.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const provided = pickKey(req);
  const expected = process.env.STATS_SECRET;
  if (!expected || !timingSafeEqual(provided, expected)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  if (!supabaseConfigured()) {
    res.status(500).json({ error: "Supabase not configured" });
    return;
  }

  try {
    // True all-time total via a count query (no rows transferred); the windowed
    // rows below drive the recent list and the aggregates.
    const totalCount = await sbCount("visits");

    const visits = await sbSelect<Visit>(
      "visits",
      "select=*&order=created_at.desc&limit=5000"
    );
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayMs = startOfToday.getTime();

    let today = 0;
    const ips = new Set<string>();
    const countryCounts = new Map<string, number>();
    const deviceCounts = new Map<string, number>();

    for (const v of visits) {
      if (v.created_at && new Date(v.created_at).getTime() >= todayMs) today += 1;
      if (v.ip) ips.add(v.ip);
      if (v.country) countryCounts.set(v.country, (countryCounts.get(v.country) ?? 0) + 1);
      const device = v.device_type ?? "unknown";
      deviceCounts.set(device, (deviceCounts.get(device) ?? 0) + 1);
    }

    const byCountry = [...countryCounts.entries()]
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const byDevice = [...deviceCounts.entries()]
      .map(([device, count]) => ({ device, count }))
      .sort((a, b) => b.count - a.count);

    // Chat usage — per-IP daily message counts from the rate-limiter table.
    const chatUsage = await sbSelect<{ ip: string; day: string; count: number }>(
      "chat_usage",
      "select=ip,day,count&order=day.desc,count.desc&limit=5000"
    );
    const todayStr = new Date().toISOString().slice(0, 10); // UTC — matches the limiter
    let chatToday = 0;
    let chatTotal = 0;
    for (const row of chatUsage) {
      chatTotal += row.count ?? 0;
      if (row.day === todayStr) chatToday += row.count ?? 0;
    }

    // Full question/answer transcripts, all-time, most recent first. Isolated so
    // a missing table (schema not yet applied) doesn't 500 the whole dashboard.
    let chatMessages: ChatMessageRow[] = [];
    try {
      chatMessages = await sbSelect<ChatMessageRow>(
        "chat_messages",
        "select=*&order=created_at.desc&limit=5000",
      );
    } catch {
      // chat_messages may not exist yet — show no transcripts.
    }

    // Enrich each transcript with the sender's timezone + location, looked up
    // from their visit row (by session id, else the most recent visit for that
    // IP). `visits` is ordered newest-first, so the first match per key wins.
    const visitBySession = new Map<string, Visit>();
    const visitByIp = new Map<string, Visit>();
    for (const v of visits) {
      const sid = typeof v.session_id === "string" ? v.session_id : null;
      if (sid && !visitBySession.has(sid)) visitBySession.set(sid, v);
      const vip = typeof v.ip === "string" ? v.ip : null;
      if (vip && !visitByIp.has(vip)) visitByIp.set(vip, v);
    }
    const field = (v: Visit | undefined, key: string): string | null => {
      const val = v?.[key];
      return typeof val === "string" && val.trim().length > 0 ? val : null;
    };
    const messages = chatMessages.map((m) => {
      const ctx =
        (m.session_id ? visitBySession.get(m.session_id) : undefined) ??
        (m.ip ? visitByIp.get(m.ip) : undefined);
      return {
        ...m,
        timezone: field(ctx, "timezone"),
        country: field(ctx, "country"),
        city: field(ctx, "city"),
      };
    });

    res.status(200).json({
      total: totalCount ?? visits.length,
      today,
      uniqueIps: ips.size,
      byCountry,
      byDevice,
      recent: visits.slice(0, 100),
      chat: {
        messagesToday: chatToday,
        messagesTotal: chatTotal,
        recent: chatUsage,
        messages,
      },
    });
  } catch {
    res.status(500).json({ error: "Failed to load stats" });
  }
}

function pickKey(req: VercelRequest): string {
  // Read the secret only from a header — never the query string, which lands
  // in browser history and access logs.
  const fromHeader = req.headers["x-stats-key"];
  if (Array.isArray(fromHeader)) return fromHeader[0] ?? "";
  return fromHeader ?? "";
}

/** Constant-ish comparison: bail on length, then OR every char difference. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
