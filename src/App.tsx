import { useCallback, useEffect, useRef, useState } from "react";
import BabylonCanvas from "./components/BabylonCanvas";
import PortfolioPanel from "./components/PortfolioPanel";
import TopBar from "./components/TopBar";
import type { BuildingKey } from "./data/cityLayout";
import type { SceneControls } from "./scene/createScene";

const App = () => {
  const [isDay, setIsDay] = useState(true);
  const [activeBuilding, setActiveBuilding] = useState<BuildingKey | null>(null);
  const controlsRef = useRef<SceneControls | null>(null);

  const handleSceneReady = useCallback((controls: SceneControls) => {
    controlsRef.current = controls;
  }, []);

  const handleBuildingSelect = useCallback((key: BuildingKey | null) => {
    setActiveBuilding(key);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveBuilding(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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
      />
      <TopBar
        isDay={isDay}
        onToggleDay={toggleDay}
        onResetCamera={resetCamera}
      />
      <PortfolioPanel activeKey={activeBuilding} onClose={() => setActiveBuilding(null)} />
    </div>
  );
};

export default App;
