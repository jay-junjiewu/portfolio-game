import { useEffect, useRef, useState } from "react";
import { useDialogFocus } from "../utils/useDialog";

// Controls differ by input: keyboard and mouse on desktop, gestures on touch screens.
const DESKTOP_CONTROLS: [string, string][] = [
  ["Look around", "Drag, Q / E or the arrow keys"],
  ["Move across the island", "W / A / S / D, or Space + drag"],
  ["Get a closer look", "Scroll or the + / − buttons"],
  ["Explore a landmark", "Click a marker or use the navigation"],
  ["Resize a panel", "Drag its left edge; double-click to reset"],
  ["Close a panel or photo mode", "Esc"],
];

const TOUCH_CONTROLS: [string, string][] = [
  ["Look around", "Drag with one finger"],
  ["Tilt or turn the view", "Slide two fingers together"],
  ["Get a closer look", "Pinch or the + / − buttons"],
  ["Explore a landmark", "Tap a marker or open the menu"],
  ["Resize a panel", "Drag the handle at its top"],
  ["Close a panel", "Tap Close, or drag the handle down"],
  ["Leave photo mode", "Tap Back to exploring"],
];

// Touch instructions on phones and touch screens (the same breakpoint as the
// phone layout), mouse and keyboard everywhere else. Re-evaluated live, so
// resizing the window or switching devtools device mode updates the panel.
const TOUCH_QUERY = "(pointer: coarse), (max-width: 760px)";

const useTouchLayout = () => {
  const [touch, setTouch] = useState(() => window.matchMedia?.(TOUCH_QUERY).matches ?? false);
  useEffect(() => {
    const query = window.matchMedia?.(TOUCH_QUERY);
    if (!query) return;
    const update = () => setTouch(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return touch;
};

type ControlsPanelProps = { open: boolean; onClose: () => void };

const ControlsPanel = ({ open, onClose }: ControlsPanelProps) => {
  const panel = useRef<HTMLDivElement>(null);
  const touch = useTouchLayout();
  useDialogFocus(panel, open);

  if (!open) return null;

  return (
    <div className="island-help-backdrop" onClick={onClose}>
      <div ref={panel} className="island-help" role="dialog" aria-modal="true" aria-labelledby="explore-help-title" tabIndex={-1} onClick={(event) => event.stopPropagation()}>
        <div className="island-help-heading"><span className="island-eyebrow">{touch ? "TOUCH CONTROLS" : "MOUSE AND KEYBOARD"}</span><button className="island-icon-button" onClick={onClose} type="button" aria-label="Close help">×</button></div>
        <h2 id="explore-help-title">Go at your own pace.</h2>
        <p>Explore the city and {touch ? "tap" : "click"} its five portfolio landmarks. Every place you visit adds a stamp to your island passport.</p>
        <dl className="island-control-list">
          {(touch ? TOUCH_CONTROLS : DESKTOP_CONTROLS).map(([action, how]) => (
            <div key={action}><dt>{action}</dt><dd>{how}</dd></div>
          ))}
        </dl>
        <p className="island-help-note">Take the guided tour, discover a quiet corner, or enter photo mode for an uninterrupted view. Your passport is saved on this device.</p>
      </div>
    </div>
  );
};

export default ControlsPanel;
