import { useCallback, useEffect, useRef, useState, lazy, Suspense } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ControlsPanel from "./components/ControlsPanel";
import PortfolioPanel from "./components/PortfolioPanel";
import ProjectPanel from "./components/ProjectPanel";
import TopBar from "./components/TopBar";
import type { BuildingKey } from "./data/cityLayout";
import type { SceneControls } from "./scene/createScene";
import { prefersReducedMotion } from "./utils/device";
import { Analytics } from "@vercel/analytics/react";
import { trackVisit } from "./utils/track";
import { recordSection } from "./utils/engagement";

// Babylon.js is heavy (~6 MB). Lazy-load the 3D components so the app shell and
// loading screen paint immediately, then the engine streams in as a separate chunk.
const BabylonCanvas = lazy(() => import("./components/BabylonCanvas"));
const OrientationWidget = lazy(() => import("./components/OrientationWidget"));
const ChatWidget = lazy(() => import("./components/ChatWidget"));
const StatsPage = lazy(() => import("./components/StatsPage"));

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

const COACHMARK_KEY = "ui:seenCoachmark";

const hasSeenCoachmark = () => {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(COACHMARK_KEY) === "1";
  } catch {
    return true;
  }
};

const markCoachmarkSeen = () => {
  try {
    window.localStorage.setItem(COACHMARK_KEY, "1");
  } catch {
    /* ignore */
  }
};


const App = () => {
  const [isDay, setIsDay] = useState(readDayMode);
  const [activeBuilding, setActiveBuilding] = useState<BuildingKey | null>(null);
  const [showControls, setShowControls] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMounted, setIsLoadingMounted] = useState(true);
  const [sceneControls, setSceneControls] = useState<SceneControls | null>(null);
  const [isTourActive, setIsTourActive] = useState(false);
  const [showCoachmark, setShowCoachmark] = useState(false);
  const [coachmarkExiting, setCoachmarkExiting] = useState(false);
  const controlsRef = useRef<SceneControls | null>(null);
  const cancelTourRef = useRef<(() => void) | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const isProjectRoute = location.pathname.startsWith("/projects/");
  // The /projects index URL lands directly on the Projects section.
  const isProjectsIndex = location.pathname === "/projects";
  const activeSection: BuildingKey | null = isProjectsIndex ? "projects" : activeBuilding;

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
    // Once the intro tour finishes (or is skipped), nudge first-time visitors
    // that the city is interactive.
    if (!hasSeenCoachmark()) {
      setShowCoachmark(true);
    }
  }, []);

  const handleSceneReady = useCallback((controls: SceneControls) => {
    controlsRef.current = controls;
    setSceneControls(controls);
  }, []);

  const handleAllAssetsLoaded = useCallback(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    // Reduced-motion users skip the auto camera fly-through entirely.
    if (prefersReducedMotion()) {
      controls.resetCamera();
      handleTourEnd();
      return;
    }
    const cancel = controls.startCameraTour(handleTourEnd);
    cancelTourRef.current = cancel;
    setIsTourActive(true);
  }, [handleTourEnd]);

  const dismissCoachmark = useCallback(() => {
    setCoachmarkExiting(true);
    markCoachmarkSeen();
    window.setTimeout(() => {
      setShowCoachmark(false);
      setCoachmarkExiting(false);
    }, 280);
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

  // Fire-and-forget visit analytics once per load (skip the private dashboard).
  useEffect(() => {
    if (window.location.pathname !== "/stats") trackVisit();
  }, []);

  // Record which portfolio sections / projects the visitor opens (feeds the
  // engagement beacon sent on exit).
  useEffect(() => {
    if (activeSection) recordSection(activeSection);
  }, [activeSection]);

  useEffect(() => {
    if (isProjectRoute) {
      recordSection(`project:${location.pathname.slice("/projects/".length)}`);
    }
  }, [isProjectRoute, location.pathname]);

  // Auto-dismiss the coachmark after a few seconds or on the first interaction.
  useEffect(() => {
    if (!showCoachmark) return;
    const timer = window.setTimeout(dismissCoachmark, 6000);
    const onInteract = () => dismissCoachmark();
    window.addEventListener("pointerdown", onInteract, { once: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointerdown", onInteract);
    };
  }, [showCoachmark, dismissCoachmark]);

  // Lock background scroll while a panel/sheet is open (prevents iOS rubber-band
  // behind the bottom sheet).
  useEffect(() => {
    const panelOpen = activeSection !== null || isProjectRoute;
    document.body.classList.toggle("no-scroll", panelOpen);
    return () => document.body.classList.remove("no-scroll");
  }, [activeSection, isProjectRoute]);

  const toggleDay = () => {
    setIsDay((prev) => !prev);
  };

  // Private analytics dashboard lives at /stats — render it standalone (no city).
  if (location.pathname === "/stats") {
    return (
      <Suspense fallback={null}>
        <StatsPage />
      </Suspense>
    );
  }

  return (
    <div className={`app-shell ${isDay ? "day" : "night"}`}>
      <a className="skip-link" href="#panel-body">
        Skip to content
      </a>
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
          activeKey={activeSection}
          onClose={() => {
            setActiveBuilding(null);
            if (isProjectsIndex) navigate("/");
          }}
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
      {showCoachmark && !isTourActive && activeSection === null && !isProjectRoute && (
        <div
          className={`canvas-coachmark${coachmarkExiting ? " exiting" : ""}`}
          role="status"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3" />
          </svg>
          <span>Drag around & tap a building to explore</span>
        </div>
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
      {!isLoading && (
        <Suspense fallback={null}>
          <ChatWidget />
        </Suspense>
      )}
      <Analytics />
    </div>
  );
};

export default App;
