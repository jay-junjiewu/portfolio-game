type TopBarProps = {
  isDay: boolean;
  onToggleDay: () => void;
  onResetCamera: () => void;
  onToggleControls: () => void;
};

const TopBar = ({
  isDay,
  onToggleDay,
  onResetCamera,
  onToggleControls,
}: TopBarProps) => {
  return (
    <header className="top-bar">
      <div className="brand">
        <span className="brand-title">Pocket Portfolio City</span>
        <span className="brand-tagline">Explore the town · click a district</span>
      </div>
      <div className="top-bar-actions">
        <button type="button" onClick={onToggleControls} className="ghost-button">
          Controls
        </button>
        <button type="button" onClick={onToggleDay} className="ghost-button">
          {isDay ? "Switch to Night" : "Switch to Day"}
        </button>
        <button type="button" onClick={onResetCamera} className="ghost-button">
          Reset View
        </button>
      </div>
    </header>
  );
};

export default TopBar;
