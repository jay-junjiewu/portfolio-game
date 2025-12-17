type ControlsPanelProps = {
  open: boolean;
  onClose: () => void;
};

const ControlsPanel = ({ open, onClose }: ControlsPanelProps) => {
  return (
    <div className={`controls-panel ${open ? "open" : ""}`}>
      <div className="controls-header">
        <h3>Help</h3>
        <button className="ghost-button" onClick={onClose} type="button">
          Close
        </button>
      </div>
      <div className="controls-inline">
        <span><strong>W / A / S / D</strong> or arrows: Pan</span>
        <span><strong>Q / E</strong>: Rotate</span>
        <span><strong>Scroll / Pinch</strong>: Zoom</span>
        <span><strong>Drag</strong>: Pan scene</span>
        <span><strong>Click</strong>: Open portfolio</span>
        <span><strong>ESC</strong>: Close panels</span>
      </div>
    </div>
  );
};

export default ControlsPanel;
