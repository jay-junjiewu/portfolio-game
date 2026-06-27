-- ─────────────────────────────────────────────────────────────
-- Supabase schema for the portfolio's serverless features.
-- Run this once in the Supabase SQL editor (Dashboard → SQL Editor).
--
-- Both tables are written/read ONLY by the Vercel serverless functions
-- using the service-role key, which bypasses row-level security. RLS is
-- enabled with no public policies so the anon/public key can't read them.
-- ─────────────────────────────────────────────────────────────

-- Per-visit analytics log (api/track.ts inserts; api/stats.ts reads).
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

create index if not exists visits_created_at_idx on public.visits (created_at desc);

-- Per-IP daily message counter for chatbot abuse protection (api/chat.ts).
create table if not exists public.chat_usage (
  ip    text not null,
  day   date not null,
  count integer not null default 0,
  primary key (ip, day)
);

-- Atomic per-IP increment helper for the chatbot rate limiter.
-- api/chat.ts calls this via supabase.rpc("increment_chat_usage", { p_ip }) to
-- increment and read the per-IP daily counter in one atomic statement (avoids a
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

-- Lock the tables down to service-role access only.
alter table public.visits     enable row level security;
alter table public.chat_usage enable row level security;
-- (No policies created on purpose → anon/public key gets zero rows.)
