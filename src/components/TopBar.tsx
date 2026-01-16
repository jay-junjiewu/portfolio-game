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
            <span className="brand-title">Junjie Wu</span>
          </div>
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
        <nav className={`nav-links ${menuOpen ? "open" : ""}`}>
          <button type="button" className="nav-link" onClick={onToggleControls}>
            Help
          </button>
          <button type="button" className="nav-link" onClick={() => handleNav("about")}>
            About
          </button>
          <button type="button" className="nav-link" onClick={() => handleNav("projects")}>
            Projects
          </button>
          <button type="button" className="nav-link" onClick={() => handleNav("skills")}>
            Skills
          </button>
          <button type="button" className="nav-link" onClick={() => handleNav("experience")}>
            Experience
          </button>
          <button type="button" className="nav-link" onClick={() => handleNav("contact")}>
            Contact
          </button>
          <button type="button" className="toggle" onClick={onToggleDay}>
            <span className={`toggle-dot ${isDay ? "day" : "night"}`} />
            <span className="toggle-label">{isDay ? "Day" : "Night"}</span>
          </button>
        </nav>
      </div>
    </header>
  );
};

export default TopBar;
