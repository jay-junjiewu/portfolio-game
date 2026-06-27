-- ─────────────────────────────────────────────────────────────
-- Supabase schema for the portfolio's serverless features.
-- Run this once (or re-run after updates) in the Supabase SQL editor
-- (Dashboard → SQL Editor). Every statement is idempotent, so re-running
-- it on an existing database only adds what's missing.
--
-- All tables are written/read ONLY by the Vercel serverless functions
-- using the service-role key, which bypasses row-level security. RLS is
-- enabled with no public policies so the anon/public key can't read them.
-- ─────────────────────────────────────────────────────────────

-- ── Per-visit analytics log (api/track.ts inserts/updates; api/stats.ts reads) ──
create table if not exists public.visits (
  id           bigint generated always as identity primary key,
  created_at   timestamptz not null default now(),
  ip           text,
  country      text,
  region       text,
  city         text,
  latitude     text,
  longitude    text,
  user_agent   text,
  browser      text,
  os           text,
  device_type  text,
  referrer     text,
  screen       text,
  language     text,
  is_returning boolean,
  path         text
);

-- New columns added over time. ADD COLUMN IF NOT EXISTS makes this safe to
-- re-run against a table that already has the original 16 columns above.
alter table public.visits add column if not exists postal_code     text;     -- geo (Vercel header)
-- Device / browser fingerprint (client-reported) ------------------------------
alter table public.visits add column if not exists timezone        text;     -- e.g. Australia/Sydney
alter table public.visits add column if not exists languages       text;     -- full navigator.languages list
alter table public.visits add column if not exists viewport        text;     -- inner window WxH
alter table public.visits add column if not exists pixel_ratio      real;     -- devicePixelRatio (retina)
alter table public.visits add column if not exists color_depth      integer;  -- screen.colorDepth
alter table public.visits add column if not exists cpu_cores        integer;  -- hardwareConcurrency
alter table public.visits add column if not exists device_memory    real;     -- navigator.deviceMemory (GB)
alter table public.visits add column if not exists touch_points     integer;  -- maxTouchPoints
alter table public.visits add column if not exists gpu              text;     -- WebGL unmasked renderer
alter table public.visits add column if not exists gpu_vendor       text;     -- WebGL unmasked vendor
alter table public.visits add column if not exists color_scheme     text;     -- light / dark preference
alter table public.visits add column if not exists platform         text;     -- navigator.platform
alter table public.visits add column if not exists device_model     text;     -- UA client hints model
alter table public.visits add column if not exists os_version       text;     -- UA client hints platformVersion
alter table public.visits add column if not exists cpu_arch         text;     -- UA client hints architecture
alter table public.visits add column if not exists connection_type  text;     -- effectiveType (4g/3g…)
alter table public.visits add column if not exists downlink         real;     -- Mbps
alter table public.visits add column if not exists rtt              integer;  -- round-trip ms
-- Network intelligence (server-side ipwho.is lookup + UA heuristics) -----------
alter table public.visits add column if not exists isp              text;
alter table public.visits add column if not exists org              text;     -- organization / company
alter table public.visits add column if not exists asn              text;     -- autonomous system number
alter table public.visits add column if not exists is_hosting       boolean;  -- datacenter / cloud / proxy signal
alter table public.visits add column if not exists is_bot           boolean;  -- UA looks like a crawler/headless
-- Traffic source + identity ----------------------------------------------------
alter table public.visits add column if not exists visitor_id       text;     -- persistent per-person id (localStorage)
alter table public.visits add column if not exists session_id       text;     -- per page-load id (links engagement update)
alter table public.visits add column if not exists visit_count      integer;  -- nth visit for this visitor
alter table public.visits add column if not exists utm_source       text;
alter table public.visits add column if not exists utm_medium       text;
alter table public.visits add column if not exists utm_campaign     text;
alter table public.visits add column if not exists query_string     text;     -- full landing ?query
-- Engagement (second beacon on exit) ------------------------------------------
alter table public.visits add column if not exists dwell_ms         integer;  -- ms on page
alter table public.visits add column if not exists sections_viewed  text;     -- portfolio sections opened (comma list)
alter table public.visits add column if not exists chat_used        boolean;  -- opened/sent the AI chat
alter table public.visits add column if not exists clicks           integer;  -- click count during the visit

create index if not exists visits_created_at_idx on public.visits (created_at desc);
create index if not exists visits_session_id_idx on public.visits (session_id);

-- ── Full AI chat transcript (api/chat.ts inserts; api/stats.ts reads) ──
create table if not exists public.chat_messages (
  id         bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  ip         text,
  session_id text,
  question   text,
  answer     text,
  model      text
);

create index if not exists chat_messages_created_at_idx on public.chat_messages (created_at desc);

-- ── Per-IP daily message counter for chatbot abuse protection (api/chat.ts) ──
create table if not exists public.chat_usage (
  ip    text not null,
  day   date not null,
  count integer not null default 0,
  primary key (ip, day)
);

-- Atomic per-IP increment helper for the chatbot rate limiter.
-- api/chat.ts calls this via rpc("increment_chat_usage", { p_ip }) to increment
-- and read the per-IP daily counter in one atomic statement (avoids a
-- read-then-write race). Returns the new count for today.
create or replace function public.increment_chat_usage(p_ip text)
returns integer
language plpgsql
as $$
declare
  new_count integer;
begin
  insert into public.chat_usage (ip, day, count)
  values (p_ip, current_date, 1)
  on conflict (ip, day)
  do update set count = public.chat_usage.count + 1
  returning count into new_count;
  return new_count;
end;
$$;

-- ── Lock every table down to service-role access only ──
alter table public.visits        enable row level security;
alter table public.chat_messages enable row level security;
alter table public.chat_usage    enable row level security;
-- (No policies created on purpose → anon/public key gets zero rows.)
