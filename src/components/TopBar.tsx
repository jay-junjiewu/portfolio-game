import { useEffect, useRef, useState, type MouseEvent } from "react";
import type { BuildingKey } from "../data/cityLayout";
import { NAV_ITEMS } from "../data/siteMeta";
import { isPlainClick } from "./content/PortfolioContent";

type TopBarProps = {
  isDay: boolean;
  activeSection: BuildingKey | null;
  onToggleDay: () => void;
  onOpenSection: (key: BuildingKey) => void;
  onSimpleView: () => void;
  /** True once the island has loaded and nothing covers it: the moment to point out Simple view. */
  canHintSimpleView?: boolean;
};

const HINT_MS = 9500;

const TopBar = ({ isDay, activeSection, onToggleDay, onOpenSection, onSimpleView, canHintSimpleView = false }: TopBarProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);

  // Each time the island loads, point at Simple view for a few seconds so
  // visitors short on time (recruiters) can find it. Only the first time the
  // island is clear on a page load: closing a panel later doesn't replay it.
  const hinted = useRef(false);
  useEffect(() => {
    if (!canHintSimpleView || hinted.current) return;
    const show = window.setTimeout(() => {
      hinted.current = true;
      setShowHint(true);
    }, 800);
    const hide = window.setTimeout(() => setShowHint(false), 800 + HINT_MS);
    return () => {
      window.clearTimeout(show);
      window.clearTimeout(hide);
    };
  }, [canHintSimpleView]);

  // Anything that covers the island (a panel, the menu) ends the hint.
  useEffect(() => {
    if (!canHintSimpleView || menuOpen) setShowHint(false);
  }, [canHintSimpleView, menuOpen]);

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
      </nav>
      <div className="island-header-actions">
        <button type="button" className="daylight-switch" onClick={onToggleDay} aria-label={`${isDay ? "Daylight" : "Moonlight"}: switch to ${isDay ? "night" : "day"} mode`}>
          {isDay ? <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" /></svg> : <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14A8.5 8.5 0 0 1 10 4a8.5 8.5 0 1 0 10 10Z" /></svg>}
          <span>{isDay ? "Daylight" : "Moonlight"}</span>
        </button>
        <a className={`daylight-switch simple-view-switch${showHint ? " is-hinting" : ""}`} href="/?view=simple" aria-label="Switch to the simple view" title="A plain, scrollable page without the 3D island" onClick={(event) => { if (!isPlainClick(event)) return; event.preventDefault(); onSimpleView(); }}>
          {/* A page with text lines, so it reads as "document view" and not as the menu icon. */}
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" /><path d="M14 3v4h4M9 12h6M9 16h4" /></svg>
          <span>Simple view</span>
        </a>
        {showHint && (
          <button type="button" className="simple-view-hint" onClick={() => { setShowHint(false); onSimpleView(); }}>
            <strong>Short on time?</strong> <span>Read everything on one simple page</span>
          </button>
        )}
        <button ref={menuButton} className="island-menu-button" type="button" aria-label={menuOpen ? "Close navigation" : "Open navigation"} aria-expanded={menuOpen} aria-controls="island-navigation" onClick={() => setMenuOpen((open) => !open)}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d={menuOpen ? "m6 6 12 12M6 18 18 6" : "M4 8h16M4 16h16"} /></svg>
        </button>
      </div>
    </header>
  );
};

export default TopBar;
