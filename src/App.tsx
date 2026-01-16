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

const readDayMode = () => {
  if (typeof window === "undefined") return true;
  try {
    const stored = window.localStorage.getItem("ui:dayMode");
    if (stored === "night") return false;
    if (stored === "day") return true;
  } catch {
    return true;
  }
  return true;
};

const App = () => {
  const [isDay, setIsDay] = useState(readDayMode);
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

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem("ui:dayMode", isDay ? "day" : "night");
    } catch {
      return;
    }
  }, [isDay]);

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
