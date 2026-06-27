# New features — setup & deployment

Four engagement features were added on top of the 3D city portfolio:

| # | Feature | Needs a backend? |
|---|---------|------------------|
| 1 | **"City builds itself" intro** — buildings rise/pop into place on load | No (pure frontend) |
| 2 | **AI concierge chatbot** — floating "Ask me anything", grounded in your portfolio data | Yes — `/api/chat` + a free LLM key |
| 3 | **Cursor companion** — a little drone that trails the cursor (desktop only) | No (pure frontend) |
| 4 | **Visitor analytics** — Vercel Web Analytics + a custom Supabase logger with a private `/stats` dashboard | Yes — `/api/track`, `/api/stats` + Supabase |

Features 1 and 3 work with `npm run dev` and no configuration. Features 2 and 4 use Vercel serverless functions, so they need `vercel dev` locally (or a deploy) plus the env vars below.

---

## 1. Environment variables

Copy `.env.example` → `.env.local` for local `vercel dev`, and set the same keys in the
Vercel dashboard (**Project → Settings → Environment Variables**) for production. These
are read only by the `/api` functions and never reach the browser.

| Var | Required for | Notes |
|-----|--------------|-------|
| `GEMINI_API_KEY` | Chatbot | Free key from <https://aistudio.google.com/apikey> |
| `SUPABASE_URL` | Analytics + chat rate-limit | Supabase → Settings → API → Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Analytics + chat rate-limit | Supabase → Settings → API → **service_role** key. Secret — server only. |
| `STATS_SECRET` | `/stats` dashboard | A long random password you choose |
| `CHAT_DAILY_LIMIT` | _(optional)_ | Per-IP daily chatbot message cap (default 30) |
| `GROQ_API_KEY` | _(optional)_ | Only if you swap the chatbot to Groq (see `api/chat.ts`) |

If the Supabase vars are absent, the chatbot still works (rate-limiting is skipped) and
`/api/track` just no-ops — so the chatbot is usable with only `GEMINI_API_KEY`.

## 2. Supabase

In your Supabase project open **SQL Editor** and run [`supabase/schema.sql`](../supabase/schema.sql).
It creates:
- `visits` — one row per page load (IP, geo, device, referrer, …) written by `/api/track`.
- `chat_usage` — per-IP daily counter for chatbot abuse protection.
- RLS enabled with no public policies (only the service-role key, used server-side, can read/write).

## 3. The chatbot (Gemini Flash, free tier)

- Model: `gemini-2.0-flash`, called from `api/chat.ts` with `GEMINI_API_KEY`.
- The system prompt is built from `src/data/portfolioData.ts`, so the bot answers only from your real content. Update that file and the bot updates with it.
- To switch to Groq instead, see the commented adapter in `api/chat.ts` and set `GROQ_API_KEY`.

## 4. Visitor analytics

**Two layers:**
- **Vercel Web Analytics** — enable it in the Vercel dashboard (**Analytics** tab). `<Analytics />` is already mounted in `App.tsx`. Gives visitor/country/device/referrer trends with no DB.
- **Custom logger** — `/api/track` writes full per-visit rows (including IP + approximate
  location from Vercel's `x-vercel-ip-*` headers) to Supabase. View them at **`/stats`**.

**Viewing `/stats`:** open `https://your-site/stats`, enter `STATS_SECRET` when prompted
(the key is held in `sessionStorage` for the session).

**Privacy:** full IP addresses are stored, so a short disclosure is shown in the site's
Contact section and on the `/stats` page. IPs are personal data under GDPR — keep
`STATS_SECRET` private and don't expose the dashboard.

> ⚠️ The `x-vercel-ip-*` geo/IP headers are only populated on a **deployed** Vercel
> environment. Under local `vercel dev` those fields will be empty/null — that's expected.

---

## Local development

```bash
npm run dev          # features 1 & 3 (visual) — no env needed
vercel dev           # all four, incl. /api functions — reads .env.local
```

After deploy, sanity-check:
- Chatbot: ask "What's your C++ experience?" → grounded answer.
- Analytics: load the site → a new row appears in the Supabase `visits` table; `/stats` shows it.
- Reduced motion (OS setting) → the intro reveal and cursor companion are disabled automatically.
