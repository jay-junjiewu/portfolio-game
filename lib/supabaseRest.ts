// Minimal Supabase REST (PostgREST) helpers for the serverless functions.
//
// Uses global fetch (Node 18+) instead of @supabase/supabase-js. The official
// client eagerly builds a realtime (WebSocket) client, which (a) throws on
// Node < 22 with no native WebSocket, and (b) crashes when bundled as ESM —
// "Dynamic require of 'events' is not supported" — which is exactly what made
// the Vercel function fail (FUNCTION_INVOCATION_FAILED). We only ever do REST
// (insert / select / rpc), so a few fetch calls are all we need.
//
// Lives in /lib (not /src) so the browser-scoped app tsconfig doesn't type-check
// its `process.env` usage; Vercel still bundles it via the function imports.

function creds(): { url: string; key: string } | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return { url: url.replace(/\/+$/, ""), key };
}

export function supabaseConfigured(): boolean {
  return creds() !== null;
}

function authHeaders(key: string, extra?: Record<string, string>): Record<string, string> {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

/** Insert a row. No-op (resolves) when Supabase isn't configured. */
export async function sbInsert(table: string, row: unknown): Promise<void> {
  const c = creds();
  if (!c) return;
  const res = await fetch(`${c.url}/rest/v1/${table}`, {
    method: "POST",
    headers: authHeaders(c.key, { Prefer: "return=minimal" }),
    body: JSON.stringify(row),
  });
  if (!res.ok) throw new Error(`Supabase insert ${table} failed: ${res.status} ${await res.text()}`);
}

/**
 * Patch rows matching a PostgREST filter (the part after `?`, e.g.
 * `session_id=eq.abc`). No-op when Supabase isn't configured.
 */
export async function sbUpdate(table: string, query: string, patch: unknown): Promise<void> {
  const c = creds();
  if (!c) return;
  const res = await fetch(`${c.url}/rest/v1/${table}?${query}`, {
    method: "PATCH",
    headers: authHeaders(c.key, { Prefer: "return=minimal" }),
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(`Supabase update ${table} failed: ${res.status} ${await res.text()}`);
}

/** Run a PostgREST query (the part after `?`) and return the rows. */
export async function sbSelect<T>(table: string, query: string): Promise<T[]> {
  const c = creds();
  if (!c) return [];
  const res = await fetch(`${c.url}/rest/v1/${table}?${query}`, {
    headers: authHeaders(c.key),
  });
  if (!res.ok) throw new Error(`Supabase select ${table} failed: ${res.status}`);
  return (await res.json()) as T[];
}

/** Exact row count via the Content-Range header (e.g. "0-0/1234"). */
export async function sbCount(table: string): Promise<number | null> {
  const c = creds();
  if (!c) return null;
  const res = await fetch(`${c.url}/rest/v1/${table}?select=id&limit=1`, {
    headers: authHeaders(c.key, { Prefer: "count=exact" }),
  });
  const range = res.headers.get("content-range");
  if (!range) return null;
  const total = Number(range.split("/")[1]);
  return Number.isFinite(total) ? total : null;
}

/** Call a Postgres function (RPC) and return its JSON result. */
export async function sbRpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const c = creds();
  if (!c) throw new Error("Supabase not configured");
  const res = await fetch(`${c.url}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: authHeaders(c.key),
    body: JSON.stringify(args),
  });
  if (!res.ok) throw new Error(`Supabase rpc ${fn} failed: ${res.status}`);
  return (await res.json()) as T;
}
