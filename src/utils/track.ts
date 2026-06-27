let sent = false;

/**
 * Fire-and-forget visitor tracking. Sends one beacon to /api/track per page
 * load with client-only context (screen, language, referrer, path, returning
 * flag). All errors are swallowed — analytics must never disrupt the page. The
 * orchestrator calls this once on mount in App.tsx.
 */
export function trackVisit(): void {
  if (sent) return;
  sent = true;

  if (typeof window === "undefined") return;

  try {
    const screen =
      window.innerWidth && window.innerHeight
        ? `${window.innerWidth}x${window.innerHeight}`
        : `${window.screen?.width ?? 0}x${window.screen?.height ?? 0}`;

    const isReturning = localStorage.getItem("visit:seen") !== null;
    if (!isReturning) {
      try {
        localStorage.setItem("visit:seen", "1");
      } catch {
        // Private mode / storage disabled — treat as a new visitor.
      }
    }

    const payload = {
      screen,
      language: navigator.language,
      referrer: document.referrer || undefined,
      path: window.location.pathname,
      isReturning,
    };

    void fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Swallow everything — never break the page for analytics.
  }
}
