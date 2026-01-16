import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import BabylonCanvas from "./components/BabylonCanvas";
import ControlsPanel from "./components/ControlsPanel";
import OrientationWidget from "./components/OrientationWidget";
import PortfolioPanel from "./components/PortfolioPanel";
import ProjectPanel from "./components/ProjectPanel";
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
  const navigate = useNavigate();
  const location = useLocation();
  const isProjectRoute = location.pathname.startsWith("/projects/");

  const handleSceneReady = useCallback((controls: SceneControls) => {
    controlsRef.current = controls;
    setSceneControls(controls);
  }, []);

  const handleBuildingSelect = useCallback(
    (key: BuildingKey | null) => {
      setActiveBuilding(key);
      if (key) {
        navigate("/");
      }
    },
    [navigate]
  );

  const handleProjectOpen = useCallback(
    (slug: string) => {
      setActiveBuilding(null);
      navigate(`/projects/${slug}`);
    },
    [navigate]
  );

  const handleProjectClose = useCallback(() => {
    setActiveBuilding("projects");
    navigate("/");
  }, [navigate]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (showControls) {
          setShowControls(false);
        } else if (isProjectRoute) {
          handleProjectClose();
        } else {
          setActiveBuilding(null);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleProjectClose, isProjectRoute, showControls]);

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
        onOpenSection={(key) => {
          setActiveBuilding(key);
          navigate("/");
        }}
      />
      <OrientationWidget controls={sceneControls} />
      {isProjectRoute ? (
        <ProjectPanel onClose={handleProjectClose} />
      ) : (
        <PortfolioPanel
          activeKey={activeBuilding}
          onClose={() => setActiveBuilding(null)}
          onProjectOpen={handleProjectOpen}
        />
      )}
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
