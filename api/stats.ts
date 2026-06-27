import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { WebSocket } from "ws";

// supabase-js builds a realtime client that throws on Node < 22 without a
// native WebSocket; we only use REST, so pass `ws` so createClient never throws.
// Cast: ws's WebSocket constructor differs slightly from supabase's loose
// WebSocketLikeConstructor type, but is compatible at runtime.
const SUPABASE_OPTS = { realtime: { transport: WebSocket as unknown as never } };

type Visit = {
  created_at: string;
  ip: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  latitude: string | null;
  longitude: string | null;
  user_agent: string | null;
  browser: string | null;
  os: string | null;
  device_type: string | null;
  referrer: string | null;
  screen: string | null;
  language: string | null;
  is_returning: boolean | null;
  path: string | null;
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

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    res.status(500).json({ error: "Supabase not configured" });
    return;
  }

  try {
    const supabase = createClient(url, serviceKey, SUPABASE_OPTS);

    // True all-time total via a head/count query (no rows transferred); the
    // windowed rows below drive the recent list and the aggregates.
    const { count: totalCount } = await supabase
      .from("visits")
      .select("*", { count: "exact", head: true });

    const { data, error } = await supabase
      .from("visits")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5000);

    if (error) throw error;

    const visits = (data ?? []) as Visit[];
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
    const { data: chatRows } = await supabase
      .from("chat_usage")
      .select("ip, day, count")
      .order("day", { ascending: false })
      .order("count", { ascending: false })
      .limit(200);

    const chatUsage = (chatRows ?? []) as { ip: string; day: string; count: number }[];
    const todayStr = new Date().toISOString().slice(0, 10); // UTC — matches the limiter
    let chatToday = 0;
    let chatTotal = 0;
    for (const row of chatUsage) {
      chatTotal += row.count ?? 0;
      if (row.day === todayStr) chatToday += row.count ?? 0;
    }

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
