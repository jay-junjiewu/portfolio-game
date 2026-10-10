import { useEffect, useRef } from "react";

type ControlsPanelProps = { open: boolean; onClose: () => void };

const ControlsPanel = ({ open, onClose }: ControlsPanelProps) => {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    return () => previousFocus?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div className="island-help-backdrop" onClick={onClose}>
      <div ref={panel} className="island-help" role="dialog" aria-modal="true" aria-labelledby="explore-help-title" tabIndex={-1} onClick={(event) => event.stopPropagation()} onKeyDown={(event) => {
        if (event.key === "Tab") {
          event.preventDefault();
          panel.current?.querySelector<HTMLButtonElement>("button")?.focus();
        }
      }}>
        <div className="island-help-heading"><span className="island-eyebrow">CITY CONTROLS</span><button className="island-icon-button" onClick={onClose} type="button" aria-label="Close help">×</button></div>
        <h2 id="explore-help-title">Go at your own pace.</h2>
        <p>Explore the city and open its five portfolio landmarks. Every place you visit adds a stamp to your island passport.</p>
        <dl className="island-control-list">
          <div><dt>Look around</dt><dd>Drag · Q / E · arrow keys</dd></div>
          <div><dt>Move across the island</dt><dd>W / A / S / D · Space + drag</dd></div>
          <div><dt>Get a closer look</dt><dd>Scroll · pinch · + / − buttons</dd></div>
          <div><dt>Explore a landmark</dt><dd>Click a marker or use the navigation</dd></div>
          <div><dt>On your phone</dt><dd>One finger to pan; two to rotate and zoom</dd></div>
          <div><dt>Close a panel or photo mode</dt><dd>Esc</dd></div>
        </dl>
        <p className="island-help-note">Take the guided tour, discover a quiet corner, or enter photo mode for an uninterrupted view. Your passport is saved on this device.</p>
      </div>
    </div>
  );
};

export default ControlsPanel;
