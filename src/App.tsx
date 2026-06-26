import { useCallback, useEffect, useRef, useState, lazy, Suspense } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ControlsPanel from "./components/ControlsPanel";
import PortfolioPanel from "./components/PortfolioPanel";
import ProjectPanel from "./components/ProjectPanel";
import TopBar from "./components/TopBar";
import type { BuildingKey } from "./data/cityLayout";
import type { SceneControls } from "./scene/createScene";

// Babylon.js is heavy (~6 MB). Lazy-load the 3D components so the app shell and
// loading screen paint immediately, then the engine streams in as a separate chunk.
const BabylonCanvas = lazy(() => import("./components/BabylonCanvas"));
const OrientationWidget = lazy(() => import("./components/OrientationWidget"));

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
  const [isLoadingMounted, setIsLoadingMounted] = useState(true);
  const [sceneControls, setSceneControls] = useState<SceneControls | null>(null);
  const [isTourActive, setIsTourActive] = useState(false);
  const controlsRef = useRef<SceneControls | null>(null);
  const cancelTourRef = useRef<(() => void) | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const isProjectRoute = location.pathname.startsWith("/projects/");

  useEffect(() => {
    if (isLoading) {
      setIsLoadingMounted(true);
      return;
    }
    const t = window.setTimeout(() => setIsLoadingMounted(false), 380);
    return () => window.clearTimeout(t);
  }, [isLoading]);

  const handleTourEnd = useCallback(() => {
    setIsTourActive(false);
  }, []);

  const handleSceneReady = useCallback((controls: SceneControls) => {
    controlsRef.current = controls;
    setSceneControls(controls);
  }, []);

  const handleAllAssetsLoaded = useCallback(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    const cancel = controls.startCameraTour(handleTourEnd);
    cancelTourRef.current = cancel;
    setIsTourActive(true);
  }, [handleTourEnd]);

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

  return (
    <div className={`app-shell ${isDay ? "day" : "night"}`}>
      <Suspense fallback={null}>
        <BabylonCanvas
          isDay={isDay}
          onBuildingSelect={handleBuildingSelect}
          onSceneReady={handleSceneReady}
          onLoadingChange={setIsLoading}
          onAllAssetsLoaded={handleAllAssetsLoaded}
        />
      </Suspense>
      <TopBar
        isDay={isDay}
        onToggleDay={toggleDay}
        onToggleControls={() => setShowControls((v) => !v)}
        onOpenSection={(key) => {
          setActiveBuilding(key);
          navigate("/");
        }}
      />
      <Suspense fallback={null}>
        <OrientationWidget controls={sceneControls} />
      </Suspense>
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
      {isTourActive && (
        <button
          type="button"
          className="tour-skip-btn"
          onClick={() => {
            cancelTourRef.current?.();
            handleTourEnd();
          }}
        >
          Skip intro
        </button>
      )}
      {isLoadingMounted && (
        <div className={`loading-overlay${isLoading ? "" : " exiting"}`}>
          <div className="spinner" />
          <div className="loading-hints" aria-live="polite">
            <span>Building your city…</span>
            <span>Adding finishing touches…</span>
            <span>Almost there…</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
