import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type RefObject } from "react";

const NARROW_QUERY = "(max-width: 760px)";
const WIDTH_KEY = "ui:panelWidth";
const HEIGHT_KEY = "ui:sheetHeight";
const MIN_WIDTH = 360;
const SIDE_GAP = 60;
const MIN_SHEET = 0.3;
/** Releasing a phone sheet below this fraction of the screen closes it. */
const DISMISS_SHEET = 0.38;

const readNumber = (key: string) => {
  try {
    const value = Number(window.localStorage.getItem(key));
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
};

const store = (key: string, value: number | null) => {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, String(value));
  } catch { /* The size then lasts for this visit only. */ }
};

const clampWidth = (width: number) => Math.round(Math.min(Math.max(width, MIN_WIDTH), window.innerWidth - SIDE_GAP));
const clampSheet = (fraction: number) => Math.min(Math.max(fraction, MIN_SHEET * 0.6), 1);

type Options = {
  /** Fraction of the screen the panel covers (1 = fully hidden scene). */
  onCoverageChange?: (coverage: number) => void;
  /** Called when a phone sheet is dragged down past the dismiss point. */
  onDismiss?: () => void;
};

/**
 * Drag-to-resize for the island panels. On desktop the left edge changes the
 * panel's width; on phones the top handle changes the bottom sheet's height
 * (drag it most of the way down to close). Sizes are remembered, the handle
 * works with arrow keys, and a double-click restores the default size.
 */
export function usePanelResize(panelRef: RefObject<HTMLElement | null>, { onCoverageChange, onDismiss }: Options = {}) {
  const [isNarrow, setIsNarrow] = useState(() => window.matchMedia?.(NARROW_QUERY).matches ?? false);
  const [width, setWidth] = useState<number | null>(() => readNumber(WIDTH_KEY));
  const [sheet, setSheet] = useState<number | null>(() => readNumber(HEIGHT_KEY));
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ start: number; size: number; pointerId: number } | null>(null);

  useEffect(() => {
    const query = window.matchMedia?.(NARROW_QUERY);
    if (!query) return;
    const update = () => setIsNarrow(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  // Keep a remembered width valid when the window shrinks.
  useEffect(() => {
    if (isNarrow || width === null) return;
    const onResize = () => setWidth((current) => (current === null ? null : clampWidth(current)));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [isNarrow, width]);

  useEffect(() => {
    if (!onCoverageChange) return;
    if (isNarrow) onCoverageChange(sheet ?? 1);
    else onCoverageChange(width === null ? 0.6 : width / window.innerWidth);
  }, [isNarrow, onCoverageChange, sheet, width]);

  const onPointerDown = useCallback((event: PointerEvent<HTMLElement>) => {
    const panel = panelRef.current;
    if (!panel || event.button !== 0) return;
    event.preventDefault();
    const rect = panel.getBoundingClientRect();
    drag.current = {
      start: isNarrow ? event.clientY : event.clientX,
      size: isNarrow ? rect.height : rect.width,
      pointerId: event.pointerId,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  }, [isNarrow, panelRef]);

  const onPointerMove = useCallback((event: PointerEvent<HTMLElement>) => {
    const state = drag.current;
    if (!state || state.pointerId !== event.pointerId) return;
    if (isNarrow) {
      const height = state.size + (state.start - event.clientY);
      setSheet(clampSheet(height / window.innerHeight));
    } else {
      // The panel is anchored to the right edge, so dragging left widens it.
      setWidth(clampWidth(state.size + (state.start - event.clientX)));
    }
  }, [isNarrow]);

  const finish = useCallback((event: PointerEvent<HTMLElement>) => {
    const state = drag.current;
    if (!state || state.pointerId !== event.pointerId) return;
    drag.current = null;
    setDragging(false);
    if (isNarrow) {
      const fraction = clampSheet((state.size + (state.start - event.clientY)) / window.innerHeight);
      if (fraction < DISMISS_SHEET && onDismiss) {
        setSheet(null);
        store(HEIGHT_KEY, null);
        onDismiss();
        return;
      }
      const next = Math.max(fraction, MIN_SHEET);
      setSheet(next >= 0.97 ? null : next);
      store(HEIGHT_KEY, next >= 0.97 ? null : next);
    } else {
      setWidth((current) => {
        store(WIDTH_KEY, current);
        return current;
      });
    }
  }, [isNarrow, onDismiss]);

  const reset = useCallback(() => {
    if (isNarrow) {
      setSheet(null);
      store(HEIGHT_KEY, null);
    } else {
      setWidth(null);
      store(WIDTH_KEY, null);
    }
  }, [isNarrow]);

  const onKeyDown = useCallback((event: KeyboardEvent<HTMLElement>) => {
    const panel = panelRef.current;
    if (!panel) return;
    if (isNarrow && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
      event.preventDefault();
      const current = sheet ?? 1;
      const next = Math.max(MIN_SHEET, clampSheet(current + (event.key === "ArrowUp" ? 0.1 : -0.1)));
      setSheet(next >= 0.97 ? null : next);
      store(HEIGHT_KEY, next >= 0.97 ? null : next);
    } else if (!isNarrow && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
      event.preventDefault();
      const next = clampWidth((width ?? panel.getBoundingClientRect().width) + (event.key === "ArrowLeft" ? 40 : -40));
      setWidth(next);
      store(WIDTH_KEY, next);
    } else if (event.key === "Home") {
      event.preventDefault();
      reset();
    }
  }, [isNarrow, panelRef, reset, sheet, width]);

  const style = {
    ...(!isNarrow && width !== null ? { "--panel-width": `${width}px` } : {}),
    ...(isNarrow && sheet !== null ? { "--sheet-height": `${Math.round(sheet * 100)}dvh` } : {}),
  } as CSSProperties;

  const handleProps = {
    role: "separator",
    tabIndex: 0,
    "aria-orientation": isNarrow ? ("horizontal" as const) : ("vertical" as const),
    "aria-label": isNarrow ? "Resize panel height (drag down to close)" : "Resize panel width",
    title: "Drag to resize. Double-click to reset.",
    className: `panel-resize-handle${dragging ? " is-dragging" : ""}`,
    onPointerDown,
    onPointerMove,
    onPointerUp: finish,
    onPointerCancel: finish,
    onDoubleClick: reset,
    onKeyDown,
  };

  return { style, handleProps, dragging };
}
