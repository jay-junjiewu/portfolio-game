import { useEffect, useRef, useState, type MouseEvent } from "react";
import type { BuildingKey } from "../data/cityLayout";
import { NAV_ITEMS } from "../data/siteMeta";
import { isPlainClick } from "./content/PortfolioContent";

type TopBarProps = {
  isDay: boolean;
  activeSection: BuildingKey | null;
  onToggleDay: () => void;
  onToggleControls: () => void;
  onOpenSection: (key: BuildingKey) => void;
  onSimpleView: () => void;
};

const TopBar = ({ isDay, activeSection, onToggleDay, onToggleControls, onOpenSection, onSimpleView }: TopBarProps) => {
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

  // Real links for crawlers, new tabs and no-JS; on the island a plain click opens the panel.
  const openFromLink = (key: BuildingKey) => (event: MouseEvent<HTMLAnchorElement>) => {
    if (!isPlainClick(event)) return;
    event.preventDefault();
    onOpenSection(key);
    setMenuOpen(false);
  };

  return (
    <header className={`island-header ${isDay ? "day" : "night"}`}>
      <a className="island-brand" href="/about" onClick={openFromLink("about")}>
        <div className="brand-lockup"><h1 className="brand-name">Junjie Wu</h1><span>SOFTWARE ENGINEER</span></div>
      </a>
      <nav id="island-navigation" className={`island-nav${menuOpen ? " is-open" : ""}`} aria-label="Portfolio">
        {NAV_ITEMS.map(({ key, label, href }) => (
          <a key={key} href={href} aria-current={activeSection === key ? "page" : undefined} onClick={openFromLink(key)}>
            {label}
          </a>
        ))}
        <button className="island-help-mobile" type="button" onClick={() => { onToggleControls(); setMenuOpen(false); }}>How to explore</button>
      </nav>
      <div className="island-header-actions">
        <button type="button" className="daylight-switch" onClick={onToggleDay} aria-label={`${isDay ? "Daylight" : "Moonlight"}: switch to ${isDay ? "night" : "day"} mode`}>
          {isDay ? <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" /></svg> : <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14A8.5 8.5 0 0 1 10 4a8.5 8.5 0 1 0 10 10Z" /></svg>}
          <span>{isDay ? "Daylight" : "Moonlight"}</span>
        </button>
        <a className="daylight-switch simple-view-switch" href="/?view=simple" aria-label="Switch to the simple view" title="A plain, scrollable page without the 3D island" onClick={(event) => { if (!isPlainClick(event)) return; event.preventDefault(); onSimpleView(); }}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 6h14M5 12h14M5 18h9" /></svg>
          <span>Simple view</span>
        </a>
        <button ref={menuButton} className="island-menu-button" type="button" aria-label={menuOpen ? "Close navigation" : "Open navigation"} aria-expanded={menuOpen} aria-controls="island-navigation" onClick={() => setMenuOpen((open) => !open)}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d={menuOpen ? "m6 6 12 12M6 18 18 6" : "M4 8h16M4 16h16"} /></svg>
        </button>
      </div>
    </header>
  );
};

export default TopBar;
