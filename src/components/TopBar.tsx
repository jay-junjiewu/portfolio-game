import { useEffect, useRef, useState } from "react";
import type { BuildingKey } from "../data/cityLayout";

type TopBarProps = {
  isDay: boolean;
  activeSection: BuildingKey | null;
  onToggleDay: () => void;
  onToggleControls: () => void;
  onOpenSection: (key: BuildingKey) => void;
};

const sections: { key: BuildingKey; label: string }[] = [
  { key: "about", label: "About" },
  { key: "projects", label: "Projects" },
  { key: "experience", label: "Experience" },
  { key: "skills", label: "Skills" },
  { key: "contact", label: "Contact" },
];

const TopBar = ({ isDay, activeSection, onToggleDay, onToggleControls, onOpenSection }: TopBarProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        menuButton.current?.focus();
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen]);

  return (
    <header className={`island-header ${isDay ? "day" : "night"}`}>
      <button className="island-brand" type="button" onClick={() => { onOpenSection("about"); setMenuOpen(false); }} aria-label="About Junjie Wu">
        <span className="brand-lockup"><strong>Junjie Wu</strong><span>SOFTWARE ENGINEER</span></span>
      </button>
      <nav id="island-navigation" className={`island-nav${menuOpen ? " is-open" : ""}`} aria-label="Portfolio">
        {sections.map(({ key, label }) => (
          <button key={key} type="button" aria-current={activeSection === key ? "page" : undefined} onClick={() => { onOpenSection(key); setMenuOpen(false); }}>
            {label}
          </button>
        ))}
        <button className="island-help-mobile" type="button" onClick={() => { onToggleControls(); setMenuOpen(false); }}>How to explore</button>
      </nav>
      <div className="island-header-actions">
        <button type="button" className="daylight-switch" onClick={onToggleDay} aria-label={`Switch to ${isDay ? "night" : "day"} mode`}>
          {isDay ? <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" /></svg> : <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14A8.5 8.5 0 0 1 10 4a8.5 8.5 0 1 0 10 10Z" /></svg>}
          <span>{isDay ? "Daylight" : "Moonlight"}</span>
        </button>
        <button ref={menuButton} className="island-menu-button" type="button" aria-label={menuOpen ? "Close navigation" : "Open navigation"} aria-expanded={menuOpen} aria-controls="island-navigation" onClick={() => setMenuOpen((open) => !open)}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d={menuOpen ? "m6 6 12 12M6 18 18 6" : "M4 8h16M4 16h16"} /></svg>
        </button>
      </div>
    </header>
  );
};

export default TopBar;
