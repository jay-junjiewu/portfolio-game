// The homepage has two presentations: the 3D island and a one-page "Simple
// view". index.html decides which one to show before first paint (it reads the
// same storage key) and records the result on <html data-view>.
export type HomeView = "simple" | "island";

export const VIEW_STORAGE_KEY = "ui:view";

export const readInitialView = (): HomeView =>
  typeof document !== "undefined" && document.documentElement.dataset.view === "simple" ? "simple" : "island";

/** Low-end hint: few cores means a lighter scene (lower resolution, no traffic). */
export const isLowEndDevice = (): boolean =>
  typeof navigator !== "undefined" && (navigator.hardwareConcurrency ?? 8) <= 4;
