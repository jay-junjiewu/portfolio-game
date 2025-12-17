type ControlsPanelProps = {
  open: boolean;
  onClose: () => void;
};

const ControlsPanel = ({ open, onClose }: ControlsPanelProps) => {
  return (
    <div className={`controls-panel ${open ? "open" : ""}`}>
      <div className="controls-header">
        <h3>Controls</h3>
        <button className="ghost-button" onClick={onClose} type="button">
          Close
        </button>
      </div>
      <ul>
        <li><strong>W / A / S / D</strong> or arrow keys: Pan relative to camera facing</li>
        <li><strong>Q / E</strong>: Rotate camera</li>
        <li><strong>Scroll / Pinch</strong>: Zoom</li>
        <li><strong>Drag</strong>: Pan scene</li>
        <li><strong>Click</strong> a bubble/building: Open portfolio panel</li>
        <li><strong>ESC</strong>: Close panels</li>
      </ul>
    </div>
  );
};

export default ControlsPanel;
