import { initEngagement } from "./engagement";

let sent = false;
let sessionId = "";

/** Random id — crypto.randomUUID where available, else a timestamp+random fallback. */
function makeId(): string {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  } catch {
    // fall through
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** The id for the current page load. Empty until trackVisit() has run. */
export function getSessionId(): string {
  return sessionId;
}

/** A stable per-person id kept in localStorage (survives across visits). */
function persistentVisitorId(): string {
  try {
    const existing = localStorage.getItem("visit:id");
    if (existing) return existing;
    const id = makeId();
    localStorage.setItem("visit:id", id);
    return id;
  } catch {
    return makeId(); // private mode — ephemeral
  }
}

/** Increment and read this visitor's lifetime visit count. */
function bumpVisitCount(): { visitCount: number; isReturning: boolean } {
  try {
    const prior = Number(localStorage.getItem("visit:count") ?? "0") || 0;
    const visitCount = prior + 1;
    localStorage.setItem("visit:count", String(visitCount));
    return { visitCount, isReturning: prior > 0 };
  } catch {
    return { visitCount: 1, isReturning: false };
  }
}

/** Real GPU via the WebGL debug-renderer extension (e.g. "Apple M2", "RTX 3080"). */
function getGpu(): { gpu?: string; gpuVendor?: string } {
  try {
    const canvas = document.createElement("canvas");
    const gl = (canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;
    if (!gl) return {};
    const dbg = gl.getExtension("WEBGL_debug_renderer_info");
    if (!dbg) return {};
    return {
      gpu: gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) as string,
      gpuVendor: gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) as string,
    };
  } catch {
    return {};
  }
}

interface NetInfo {
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
}

/** Network Information API — connection class + bandwidth + latency (Chromium). */
function getConnection(): { connectionType?: string; downlink?: number; rtt?: number } {
  const c = (navigator as Navigator & { connection?: NetInfo }).connection;
  if (!c) return {};
  return { connectionType: c.effectiveType, downlink: c.downlink, rtt: c.rtt };
}

interface UaData {
  getHighEntropyValues?: (hints: string[]) => Promise<{
    model?: string;
    platformVersion?: string;
    architecture?: string;
  }>;
}

/** UA Client Hints high-entropy values — exact device model, OS version, CPU arch. */
async function getUaHints(): Promise<{ deviceModel?: string; osVersion?: string; cpuArch?: string }> {
  try {
    const uaData = (navigator as Navigator & { userAgentData?: UaData }).userAgentData;
    if (!uaData?.getHighEntropyValues) return {};
    const hv = await uaData.getHighEntropyValues(["model", "platformVersion", "architecture"]);
    return { deviceModel: hv.model, osVersion: hv.platformVersion, cpuArch: hv.architecture };
  } catch {
    return {};
  }
}

/**
 * Fire-and-forget visitor tracking. Sends one rich beacon to /api/track per
 * page load, then arms the engagement tracker (which sends a second beacon on
 * exit). All errors are swallowed — analytics must never disrupt the page.
 */
export function trackVisit(): void {
  if (sent) return;
  sent = true;
  if (typeof window === "undefined") return;
  void collectAndSend();
}

async function collectAndSend(): Promise<void> {
  try {
    sessionId = makeId();
    const visitorId = persistentVisitorId();
    const { visitCount, isReturning } = bumpVisitCount();

    let timezone: string | undefined;
    try {
      timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      // older engine — leave undefined
    }

    const nav = navigator as Navigator & { deviceMemory?: number };
    const params = new URLSearchParams(window.location.search);
    const uaHints = await getUaHints();

    const payload = {
      // existing core fields
      screen: `${window.screen?.width ?? 0}x${window.screen?.height ?? 0}`,
      language: navigator.language,
      referrer: document.referrer || undefined,
      path: window.location.pathname,
      isReturning,
      // identity + traffic source
      visitorId,
      sessionId,
      visitCount,
      utmSource: params.get("utm_source") ?? undefined,
      utmMedium: params.get("utm_medium") ?? undefined,
      utmCampaign: params.get("utm_campaign") ?? undefined,
      queryString: window.location.search || undefined,
      // device / browser fingerprint
      timezone,
      languages: navigator.languages?.join(", "),
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      pixelRatio: window.devicePixelRatio,
      colorDepth: window.screen?.colorDepth,
      cpuCores: navigator.hardwareConcurrency,
      deviceMemory: nav.deviceMemory,
      touchPoints: navigator.maxTouchPoints,
      colorScheme: window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light",
      platform: navigator.platform,
      ...getGpu(),
      ...getConnection(),
      ...uaHints,
    };

    void fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});

    initEngagement(sessionId);
  } catch {
    // Swallow everything — never break the page for analytics.
  }
}
