import { useCallback, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type RefObject } from "react";

const NARROW_QUERY = "(max-width: 760px)";
const SIZE_KEY = "ui:chatSize";
const MIN_WIDTH = 300;
const MIN_HEIGHT = 320;
const MIN_SHEET = 240;
const EDGE_GAP = 32;
const STEP = 40;

type Size = { width: number | null; height: number | null };

const readSize = (): Size => {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(SIZE_KEY) ?? "null");
    if (parsed && typeof parsed === "object") {
      const num = (value: unknown) => (typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null);
      return { width: num(parsed.width), height: num(parsed.height) };
    }
  } catch { /* Fall back to the default size. */ }
  return { width: null, height: null };
};

const storeSize = (size: Size) => {
  try {
    if (size.width === null && size.height === null) window.localStorage.removeItem(SIZE_KEY);
    else window.localStorage.setItem(SIZE_KEY, JSON.stringify(size));
  } catch { /* The size then lasts for this visit only. */ }
};

const isNarrow = () => window.matchMedia?.(NARROW_QUERY).matches ?? false;
const clamp = (value: number, min: number, max: number) => Math.round(Math.min(Math.max(value, min), Math.max(min, max)));
const clampWidth = (width: number) => clamp(width, MIN_WIDTH, window.innerWidth - EDGE_GAP);
const clampHeight = (height: number) =>
  isNarrow() ? clamp(height, MIN_SHEET, window.innerHeight) : clamp(height, MIN_HEIGHT, window.innerHeight - EDGE_GAP);

/**
 * Drag-to-resize for the chat panel, which is anchored to the bottom-right.
 * On desktop the top-left corner handle changes width and height; on phones
 * (a bottom sheet) the top handle changes the height. The size is remembered,
 * arrow keys work on the focused handle, and double-click or Home resets it.
 */
export function useChatResize(panelRef: RefObject<HTMLElement | null>) {
  const [size, setSize] = useState<Size>(readSize);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ x: number; y: number; width: number; height: number; pointerId: number; narrow: boolean } | null>(null);

  const onPointerDown = useCallback((event: PointerEvent<HTMLElement>) => {
    const panel = panelRef.current;
    if (!panel || event.button !== 0) return;
    event.preventDefault();
    const rect = panel.getBoundingClientRect();
    drag.current = { x: event.clientX, y: event.clientY, width: rect.width, height: rect.height, pointerId: event.pointerId, narrow: isNarrow() };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  }, [panelRef]);

  const onPointerMove = useCallback((event: PointerEvent<HTMLElement>) => {
    const state = drag.current;
    if (!state || state.pointerId !== event.pointerId) return;
    // Anchored bottom-right, so dragging up and left grows the panel.
    const height = clampHeight(state.height + (state.y - event.clientY));
    setSize((current) => (state.narrow ? { ...current, height } : { width: clampWidth(state.width + (state.x - event.clientX)), height }));
  }, []);

  const finish = useCallback((event: PointerEvent<HTMLElement>) => {
    const state = drag.current;
    if (!state || state.pointerId !== event.pointerId) return;
    drag.current = null;
    setDragging(false);
    setSize((current) => {
      storeSize(current);
      return current;
    });
  }, []);

  const reset = useCallback(() => {
    const empty = { width: null, height: null };
    setSize(empty);
    storeSize(empty);
  }, []);

  const onKeyDown = useCallback((event: KeyboardEvent<HTMLElement>) => {
    const panel = panelRef.current;
    if (!panel) return;
    if (event.key === "Home") {
      event.preventDefault();
      reset();
      return;
    }
    const rect = panel.getBoundingClientRect();
    const narrow = isNarrow();
    let next: Size | null = null;
    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      next = { ...size, height: clampHeight(rect.height + (event.key === "ArrowUp" ? STEP : -STEP)) };
    } else if (!narrow && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
      next = { ...size, width: clampWidth(rect.width + (event.key === "ArrowLeft" ? STEP : -STEP)) };
    }
    if (!next) return;
    event.preventDefault();
    setSize(next);
    storeSize(next);
  }, [panelRef, reset, size]);

  const style = {
    ...(size.width !== null ? { "--chat-width": `${size.width}px` } : {}),
    ...(size.height !== null ? { "--chat-height": `${size.height}px` } : {}),
  } as CSSProperties;

  const handleProps = {
    role: "separator",
    tabIndex: 0,
    "aria-label": "Resize chat",
    title: "Drag to resize. Double-click to reset.",
    className: `chat-resize-handle${dragging ? " is-dragging" : ""}`,
    onPointerDown,
    onPointerMove,
    onPointerUp: finish,
    onPointerCancel: finish,
    onDoubleClick: reset,
    onKeyDown,
  };

  return { style, handleProps, dragging };
}
