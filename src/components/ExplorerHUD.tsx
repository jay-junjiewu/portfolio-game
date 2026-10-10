import { useState } from "react";
import type { BuildingKey } from "../data/cityLayout";
import type { SceneControls } from "../scene/createScene";
import { prefersReducedMotion } from "../utils/device";

type ExplorerHUDProps = {
  controls: SceneControls | null;
  visited: BuildingKey[];
  isTourActive: boolean;
  photoMode: boolean;
  onOpenSection: (key: BuildingKey) => void;
  onStartTour: () => void;
  onStopTour: () => void;
  onPhotoMode: (active: boolean) => void;
  onHelp: () => void;
};

const districts: { key: BuildingKey; label: string; subtitle: string }[] = [
  { key: "about", label: "The welcome tower", subtitle: "A little about me" },
  { key: "projects", label: "The makers' quarter", subtitle: "Things I've built" },
  { key: "experience", label: "The journey", subtitle: "Where I've been" },
  { key: "skills", label: "The workshop", subtitle: "Tools of the trade" },
  { key: "contact", label: "The meeting place", subtitle: "Let's connect" },
];

const ExplorerHUD = ({ controls, visited, isTourActive, photoMode, onOpenSection, onStartTour, onStopTour, onPhotoMode, onHelp }: ExplorerHUDProps) => {
  const [passportOpen, setPassportOpen] = useState(false);

  if (photoMode) return (
    <button className="photo-exit" type="button" autoFocus onClick={() => onPhotoMode(false)}><span>↗</span> Back to exploring <kbd>Esc</kbd></button>
  );

  const resetView = () => { onStopTour(); controls?.resetCamera(); };

  return (
    <>
      <div className="island-view-controls" aria-label="Camera controls">
        <button type="button" aria-label="Reset island view" title="Return to the island overview" onClick={resetView}><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" /><path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" /></svg></button>
        <span />
        <button type="button" aria-label="Zoom in" title="Zoom in" onClick={() => { onStopTour(); controls?.zoomCamera(-10); }}>+</button>
        <button type="button" aria-label="Zoom out" title="Zoom out" onClick={() => { onStopTour(); controls?.zoomCamera(10); }}>−</button>
      </div>

      <aside className={`island-passport${passportOpen ? " is-open" : ""}`} aria-label="Island passport">
        <button className="passport-heading" type="button" aria-expanded={passportOpen} aria-controls="passport-districts" onClick={() => setPassportOpen((open) => !open)}>
          <span className="passport-symbol" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="5" y="3" width="14" height="18" rx="2" /><circle cx="12" cy="10" r="3.5" /><path d="M8 17h8m-7-7h6m-3-3.5c-2 2-2 5 0 7 2-2 2-5 0-7Z" /></svg></span>
          <span><strong>Island passport</strong><small>{visited.length === 5 ? "Every corner discovered" : `${visited.length} of 5 places discovered`}</small></span>
          <span className="passport-chevron" aria-hidden="true">{passportOpen ? "−" : "+"}</span>
        </button>
        <div className="passport-progress" aria-label={`${visited.length} of 5 places discovered`}>{districts.map(({ key }) => <span key={key} className={visited.includes(key) ? "is-visited" : ""} />)}</div>
        {passportOpen && <div id="passport-districts" className="passport-districts">{districts.map(({ key, label, subtitle }, index) => (
          <button key={key} type="button" onClick={() => onOpenSection(key)} aria-label={`${label}: ${key}${visited.includes(key) ? ", visited" : ""}`}>
            <span className={`passport-stamp${visited.includes(key) ? " is-visited" : ""}`} aria-hidden="true">{visited.includes(key) ? "✓" : `0${index + 1}`}</span>
            <span><strong>{label}</strong><small>{subtitle}</small></span><span className="passport-arrow" aria-hidden="true">↗</span>
          </button>
        ))}</div>}
        {passportOpen && <p className="passport-footnote">{visited.length === 5 ? "Thanks for exploring. Let's make something." : "A small island. Five sides of my story."}</p>}
      </aside>

      <div className="island-dock" aria-label="Exploration controls">
        <button className={`dock-explore${!isTourActive ? " is-active" : ""}`} type="button" onClick={onStopTour} aria-pressed={!isTourActive}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 3 14 9-7 1-3 7-4-17Z" /></svg><span>Free roam</span></button>
        <button className={isTourActive ? "is-active" : ""} type="button" disabled={!controls || prefersReducedMotion()} title={prefersReducedMotion() ? "Camera tours are disabled with reduced motion" : "A guided look around the island"} aria-pressed={isTourActive} onClick={isTourActive ? onStopTour : onStartTour}><svg viewBox="0 0 24 24" aria-hidden="true">{isTourActive ? <path d="M8 5v14M16 5v14" /> : <path d="m8 5 11 7-11 7V5Z" />}</svg><span>{isTourActive ? "Stop tour" : "Take a tour"}</span></button>
        <span className="dock-divider" />
        <button type="button" onClick={() => { onStopTour(); onPhotoMode(true); }} title="Photo mode" aria-label="Enter photo mode"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 1.5-2h5L16 5h4a1 1 0 0 1 1 1v13H3V6a1 1 0 0 1 1-1h4Z" /><circle cx="12" cy="12" r="4" /></svg><span className="dock-photo-label">Photo mode</span></button>
        <button className="dock-help" type="button" onClick={onHelp} aria-label="How to explore" title="How to explore"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 1 1 4.2 1.8c-1.2.8-1.7 1-1.7 2.7m0 3h.01" /></svg></button>
      </div>

      <div className="island-tour-status" role="status" aria-live="polite">{isTourActive ? "The island tour is playing. Choose Free roam to take the controls." : ""}</div>
    </>
  );
};

export default ExplorerHUD;
