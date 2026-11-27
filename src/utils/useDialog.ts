import { useEffect, type RefObject } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Modal dialog focus handling: moves focus into the dialog when it opens, keeps
 * Tab / Shift+Tab inside it, and returns focus to the previously focused
 * element when it closes. Escape is handled by the owner, which knows how to
 * close (some dialogs close by navigating back).
 */
export function useDialogFocus(ref: RefObject<HTMLElement | null>, open: boolean, focusKey?: unknown) {
  useEffect(() => {
    if (!open) return;
    const dialog = ref.current;
    if (!dialog) return;
    const previous = document.activeElement as HTMLElement | null;
    dialog.focus({ preventScroll: true });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const items = [...dialog.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (element) => element.offsetParent !== null || element === document.activeElement
      );
      if (items.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || active === dialog || !dialog.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !dialog.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (previous && document.contains(previous)) previous.focus({ preventScroll: true });
    };
  }, [ref, open, focusKey]);
}
