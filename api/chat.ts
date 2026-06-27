// AI chat serverless proxy — answers questions about Junjie Wu, grounded in PORTFOLIO_DATA.
//
// Required env:
//   GEMINI_API_KEY            (required) — Google AI Studio key for Gemini Flash.
// Optional env (rate limiting; skipped entirely if either is absent):
//   SUPABASE_URL              — Supabase project URL.
//   SUPABASE_SERVICE_ROLE_KEY — Supabase service-role key (server-only; never expose to client).
//   CHAT_DAILY_LIMIT          — per-IP daily message cap (defaults to 30).
//
// Vercel bundles every file under /api/*.ts as a serverless function automatically;
// no extra config is needed. PORTFOLIO_DATA's only cityLayout import is `import type`,
// which is erased at compile time, so no Babylon code is pulled into this bundle.

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { sbRpc, supabaseConfigured } from "../lib/supabaseRest.js";
import { PORTFOLIO_DATA } from "../src/data/portfolioData.js";

type ChatRole = "user" | "assistant";
type ChatMessage = { role: ChatRole; content: string };

const MAX_CONTENT_CHARS = 1000;
const MAX_HISTORY = 10;
const DEFAULT_DAILY_LIMIT = 30;
// flash-lite doesn't use "thinking" tokens, so a tight cap is plenty for the
// short 1-3 sentence replies (and keeps cost down). Reply length is also
// constrained by the system prompt.
const MAX_OUTPUT_TOKENS = 400;
// Cheapest working model on the free tier. (gemini-2.0-flash has a 0 free-tier
// quota on some keys; swap to "gemini-2.5-flash" / "gemini-3.5-flash" for
// higher-quality answers at more cost.)
const GEMINI_MODEL = "gemini-3.1-flash-lite";

// --- System prompt, built once from the grounding data ----------------------

function buildSystemPrompt(): string {
  const d = PORTFOLIO_DATA;

  const about = `${d.about.headline}\n${d.about.body.join("\n")}`;

  const projects = d.projects
    .map(
      (p) =>
        `- ${p.title} (${p.date}): ${p.description} Stack: ${p.stack.join(", ")}.`,
    )
    .join("\n");

  const skills = d.skills
    .map((s) => `- ${s.category}: ${s.items.join(", ")}`)
    .join("\n");

  const experience = d.experience
    .map(
      (e) =>
        `- ${e.role} at ${e.company} (${e.period}): ${e.highlights.join(" ")}`,
    )
    .join("\n");

  const contactLinks = d.contact.links
    .map((l) => `${l.label}: ${l.url}`)
    .join(", ");
  const contact = `Email: ${d.contact.email}. Location: ${d.contact.location}. Links: ${contactLinks}.`;

  return [
    "You are a friendly concierge for the personal portfolio of Junjie Wu, an engineer.",
    "Your job is to answer visitors' questions about Junjie, his projects, skills, experience, and how to reach him.",
    "",
    "Rules:",
    "- Answer ONLY using the facts provided below. Never invent details, dates, employers, or technologies that are not in the data.",
    "- Be concise: 1 to 3 sentences. Be warm and approachable.",
    "- Stay consistent in voice within a single reply (either first person as Junjie, or third person about Junjie — do not mix).",
    "- If you are asked something unrelated to Junjie, or the message is abusive, politely steer the conversation back to Junjie's work.",
    "- If a fact is not in the data, say you do not have that detail rather than guessing and direct visitors on how to contact Junjie.",
    "",
    "=== ABOUT ===",
    about,
    "",
    "=== PROJECTS ===",
    projects,
    "",
    "=== SKILLS ===",
    skills,
    "",
    "=== EXPERIENCE ===",
    experience,
    "",
    "=== CONTACT ===",
    contact,
  ].join("\n");
}

const SYSTEM_PROMPT = buildSystemPrompt();

// --- LLM call (provider-localized) ------------------------------------------
//
// ACTIVE provider: Google Gemini Flash via @google/generative-ai.
//
// Groq alternative (OpenAI-compatible) — NOT active, do not import its libs:
//   const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//       Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
//     },
//     body: JSON.stringify({
//       model: "llama-3.3-70b-versatile",
//       max_tokens: MAX_OUTPUT_TOKENS,
//       messages: [{ role: "system", content: systemPrompt }, ...history],
//     }),
//   });
//   const data = await resp.json();
//   return data.choices[0].message.content;

async function callLLM(
  systemPrompt: string,
  history: ChatMessage[],
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction: systemPrompt,
    generationConfig: { maxOutputTokens: MAX_OUTPUT_TOKENS },
  });

  // Map to Gemini roles. The contents must BEGIN with a "user" turn, so drop
  // any leading "model" turns (the client seeds an assistant greeting) — else
  // Gemini rejects it with "First content should be with role 'user'".
  const contents = history.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
  while (contents.length > 0 && contents[0].role === "model") contents.shift();

  // Retry transient upstream errors — Gemini's free tier returns 503 ("high
  // demand") or 429 under load and usually recovers within seconds.
  const TRANSIENT = new Set([429, 500, 503]);
  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const result = await model.generateContent({ contents });
      return result.response.text().trim();
    } catch (err) {
      lastErr = err;
      const status = (err as { status?: number })?.status;
      if (attempt === 2 || status === undefined || !TRANSIENT.has(status)) throw err;
      await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
    }
  }
  throw lastErr;
}

// --- Rate limiting (best-effort, fail-open) ---------------------------------

function getClientIp(req: VercelRequest): string {
  const pick = (v: string | string[] | undefined): string | undefined => {
    if (!v) return undefined;
    const raw = Array.isArray(v) ? v[0] : v;
    const first = raw.split(",")[0]?.trim();
    return first || undefined;
  };

  return (
    pick(req.headers["x-vercel-forwarded-for"]) ||
    pick(req.headers["x-forwarded-for"]) ||
    pick(req.headers["x-real-ip"]) ||
    "unknown"
  );
}

/**
 * Returns true if the request is within the daily cap (allowed), false if it
 * should be blocked. Fails open (returns true) on any DB error or missing env.
 */
async function checkRateLimit(req: VercelRequest): Promise<boolean> {
  if (!supabaseConfigured()) return true; // No DB configured — skip limiting.

  const cap = Number(process.env.CHAT_DAILY_LIMIT) || DEFAULT_DAILY_LIMIT;
  const ip = getClientIp(req);

  try {
    // Atomic increment-and-read. Avoids the read-then-write race where N
    // concurrent requests from one IP all read the same count and advance it
    // by 1 instead of N, blowing past the cap. The RPC keys on the DB's
    // current_date (UTC on Supabase) and ships in supabase/schema.sql.
    const newCount = await sbRpc<number>("increment_chat_usage", { p_ip: ip });
    return (newCount ?? 0) <= cap;
  } catch (err) {
    console.error("Rate limit check failed:", err);
    return true; // fail open
  }
}

// --- Request validation ------------------------------------------------------

function normalizeMessages(raw: unknown): ChatMessage[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;

  const cleaned: ChatMessage[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const role = (item as { role?: unknown }).role;
    const content = (item as { content?: unknown }).content;
    if (role !== "user" && role !== "assistant") continue;
    if (typeof content !== "string") continue;
    const trimmed = content.trim().slice(0, MAX_CONTENT_CHARS);
    if (!trimmed) continue;
    cleaned.push({ role, content: trimmed });
  }

  if (cleaned.length === 0) return null;
  return cleaned.slice(-MAX_HISTORY);
}

// --- Handler -----------------------------------------------------------------

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed." });
    return;
  }

  let body: unknown = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      res.status(400).json({ error: "Invalid JSON body." });
      return;
    }
  }

  const messages = normalizeMessages(
    (body as { messages?: unknown } | null | undefined)?.messages,
  );
  if (!messages) {
    res.status(400).json({ error: "Provide a non-empty messages array." });
    return;
  }

  const allowed = await checkRateLimit(req);
  if (!allowed) {
    res
      .status(429)
      .json({ error: "Daily message limit reached — please come back tomorrow." });
    return;
  }

  try {
    const reply = await callLLM(SYSTEM_PROMPT, messages);
    res.status(200).json({ reply });
  } catch (err) {
    console.error("Chat LLM error:", err);
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
}
