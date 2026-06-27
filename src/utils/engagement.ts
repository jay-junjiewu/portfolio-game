// Engagement tracker: measures how long a visitor stays, which portfolio
// sections they open, whether they use the AI chat, and how much they click —
// then sends a second beacon to /api/track on exit to UPDATE their visit row
// (matched by sessionId). Best-effort; never throws into the app.

let sessionId = "";
let startTime = 0;
let armed = false;
let lastSentDwell = -1;

const sections = new Set<string>();
let chatUsed = false;
let clicks = 0;

/** Record that the visitor opened a portfolio section/building (by key/title). */
export function recordSection(key: string | null | undefined): void {
  if (key) sections.add(key);
}

/** Record that the visitor engaged with the AI chat. */
export function recordChatUsed(): void {
  chatUsed = true;
}

/** Arm the exit beacon and start the dwell timer. Idempotent per page load. */
export function initEngagement(id: string): void {
  if (armed || typeof window === "undefined") return;
  armed = true;
  sessionId = id;
  startTime = Date.now();

  document.addEventListener("click", () => { clicks += 1; }, { capture: true, passive: true });

  // visibilitychange→hidden is the most reliable "leaving" signal (fires on
  // mobile backgrounding and tab close); pagehide is a desktop backstop. Both
  // may fire; the server UPDATE is last-write-wins, and we skip no-op repeats.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") sendEngagement();
  });
  window.addEventListener("pagehide", sendEngagement);
}

function sendEngagement(): void {
  if (!sessionId) return;
  const dwellMs = Date.now() - startTime;
  // Skip a duplicate fire that adds less than a second of new dwell.
  if (lastSentDwell >= 0 && dwellMs - lastSentDwell < 1000) return;
  lastSentDwell = dwellMs;

  try {
    const body = JSON.stringify({
      type: "engagement",
      sessionId,
      dwellMs,
      sectionsViewed: [...sections].join(", ") || undefined,
      chatUsed,
      clicks,
    });
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }));
    } else {
      void fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    // ignore — analytics must never break the page
  }
}
