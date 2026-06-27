export function isMobileDevice(): boolean {
  if (typeof window === "undefined") return false;
  const coarsePointer = window.matchMedia?.("(pointer: coarse)").matches ?? false;
  const smallViewport = window.matchMedia?.("(max-width: 900px)").matches ?? false;
  return coarsePointer || smallViewport;
}

/**
 * True when the user has asked the OS for reduced motion. Used to skip the
 * auto camera tour and freeze the looping car/decor animations — the CSS
 * `prefers-reduced-motion` query only covers CSS transitions/animations, not
 * the Babylon requestAnimationFrame loops.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}
