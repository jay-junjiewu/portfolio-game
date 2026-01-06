import { useCallback, useEffect, useRef, useState } from "react";
import BabylonCanvas from "./components/BabylonCanvas";
import ControlsPanel from "./components/ControlsPanel";
import OrientationWidget from "./components/OrientationWidget";
import PortfolioPanel from "./components/PortfolioPanel";
import TopBar from "./components/TopBar";
import type { BuildingKey } from "./data/cityLayout";
import type { SceneControls } from "./scene/createScene";

const App = () => {
  const [isDay, setIsDay] = useState(true);
  const [activeBuilding, setActiveBuilding] = useState<BuildingKey | null>(null);
  const [showControls, setShowControls] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [sceneControls, setSceneControls] = useState<SceneControls | null>(null);
  const controlsRef = useRef<SceneControls | null>(null);

  const handleSceneReady = useCallback((controls: SceneControls) => {
    controlsRef.current = controls;
    setSceneControls(controls);
  }, []);

  const handleBuildingSelect = useCallback((key: BuildingKey | null) => {
    setActiveBuilding(key);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (showControls) {
          setShowControls(false);
        } else {
          setActiveBuilding(null);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showControls]);

  const toggleDay = () => {
    setIsDay((prev) => !prev);
  };

  const resetCamera = () => {
    controlsRef.current?.resetCamera();
  };

  return (
    <div className="app-shell">
      <BabylonCanvas
        isDay={isDay}
        onBuildingSelect={handleBuildingSelect}
        onSceneReady={handleSceneReady}
        onLoadingChange={setIsLoading}
      />
      <TopBar
        isDay={isDay}
        onToggleDay={toggleDay}
        onToggleControls={() => setShowControls((v) => !v)}
        onOpenSection={(key) => setActiveBuilding(key)}
      />
      <OrientationWidget controls={sceneControls} />
      <PortfolioPanel activeKey={activeBuilding} onClose={() => setActiveBuilding(null)} />
      <ControlsPanel open={showControls} onClose={() => setShowControls(false)} />
      {isLoading && (
        <div className="loading-overlay">
          <div className="spinner" />
          <p>Loading city...</p>
        </div>
      )}
    </div>
  );
};

export default App;
