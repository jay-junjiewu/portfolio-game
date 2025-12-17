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
  return (
    <header className={`top-bar ${isDay ? "day" : "night"}`}>
      <div className="top-bar-content">
        <div className="brand">
          <span className="brand-title">Pocket Portfolio City</span>
        </div>
        <nav className="nav-links">
          <button type="button" className="nav-link" onClick={onToggleControls}>
            Controls
          </button>
          <button type="button" className="nav-link" onClick={() => onOpenSection("about")}>
            About
          </button>
          <button type="button" className="nav-link" onClick={() => onOpenSection("projects")}>
            Projects
          </button>
          <button type="button" className="nav-link" onClick={() => onOpenSection("skills")}>
            Skills
          </button>
          <button type="button" className="nav-link" onClick={() => onOpenSection("experience")}>
            Experience
          </button>
          <button type="button" className="nav-link" onClick={() => onOpenSection("contact")}>
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
