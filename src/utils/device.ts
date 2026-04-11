export function isMobileDevice(): boolean {
  if (typeof window === "undefined") return false;
  const coarsePointer = window.matchMedia?.("(pointer: coarse)").matches ?? false;
  const smallViewport = window.matchMedia?.("(max-width: 900px)").matches ?? false;
  return coarsePointer || smallViewport;
}
