import { useState } from "react";

type TopBarProps = {
  isDay: boolean;
  onToggleDay: () => void;
  onToggleControls: () => void;
  onOpenSection: (key: "about" | "projects" | "skills" | "experience" | "contact") => void;
};

const TopBar = ({
  isDay,
  onToggleDay,
  onToggleControls,
  onOpenSection,
}: TopBarProps) => {
  const [menuOpen, setMenuOpen] = useState(false);

  const handleNav = (key: "about" | "projects" | "skills" | "experience" | "contact") => {
    onOpenSection(key);
    setMenuOpen(false);
  };

  return (
    <header className={`top-bar ${isDay ? "day" : "night"}`}>
      <div className="top-bar-content">
        <div className="top-bar-row">
          <div className="brand">
            <h1 className="brand-title">Junjie Wu</h1>
          </div>
          <div className="top-bar-actions">
            <button type="button" className="toggle toggle--bar" onClick={onToggleDay}>
              <span className={`toggle-dot ${isDay ? "day" : "night"}`} />
              <span className="toggle-label">{isDay ? "Day" : "Night"}</span>
            </button>
            <button
              type="button"
              className="hamburger"
              aria-label="Toggle navigation"
              onClick={() => setMenuOpen((v) => !v)}
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        </div>
        <nav className={`nav-links ${menuOpen ? "open" : ""}`}>
          <button type="button" className="toggle toggle--menu" onClick={onToggleDay}>
            <span className={`toggle-dot ${isDay ? "day" : "night"}`} />
            <span className="toggle-label">{isDay ? "Day" : "Night"}</span>
          </button>
          <button type="button" className="nav-link" onClick={() => handleNav("about")}>
            <span className="nav-link__label">About</span>
          </button>
          <button type="button" className="nav-link" onClick={() => handleNav("projects")}>
            <span className="nav-link__label">Projects</span>
          </button>
          <button type="button" className="nav-link" onClick={() => handleNav("experience")}>
            <span className="nav-link__label">Experience</span>
          </button>
          <button type="button" className="nav-link" onClick={() => handleNav("skills")}>
            <span className="nav-link__label">Skills</span>
          </button>
          <button type="button" className="nav-link" onClick={() => handleNav("contact")}>
            <span className="nav-link__label">Contact</span>
          </button>
          <button type="button" className="nav-link" onClick={onToggleControls}>
            <span className="nav-link__label">Help</span>
          </button>
        </nav>
      </div>
    </header>
  );
};

export default TopBar;
