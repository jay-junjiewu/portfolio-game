import { useCallback, useEffect, useRef, useState, lazy, Suspense } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ControlsPanel from "./components/ControlsPanel";
import ExplorerHUD from "./components/ExplorerHUD";
import PortfolioPanel from "./components/PortfolioPanel";
import ProjectPanel from "./components/ProjectPanel";
import TopBar from "./components/TopBar";
import type { BuildingKey } from "./data/cityLayout";
import type { SceneControls } from "./scene/createScene";
import { prefersReducedMotion } from "./utils/device";
import { Analytics } from "@vercel/analytics/react";
import { trackVisit } from "./utils/track";
import { recordSection } from "./utils/engagement";
import "./explorer.css";

// Keep the interface available while the 3D engine streams in.
const BabylonCanvas = lazy(() => import("./components/BabylonCanvas"));
const ChatWidget = lazy(() => import("./components/ChatWidget"));
const StatsPage = lazy(() => import("./components/StatsPage"));

const PASSPORT_KEY = "ui:islandPassport:v1";
const sectionKeys: BuildingKey[] = ["about", "projects", "skills", "experience", "contact"];

const readDayMode = () => {
  try {
    return window.localStorage.getItem("ui:dayMode") !== "night";
  } catch {
    return true;
  }
};

const readPassport = (): BuildingKey[] => {
  try {
    const saved: unknown = JSON.parse(window.localStorage.getItem(PASSPORT_KEY) ?? "[]");
    if (!Array.isArray(saved)) return [];
    return sectionKeys.filter((key) => saved.includes(key));
  } catch {
    return [];
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
  const [photoMode, setPhotoMode] = useState(false);
  const [visited, setVisited] = useState(readPassport);
  const controlsRef = useRef<SceneControls | null>(null);
  const cancelTourRef = useRef<(() => void) | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const isProjectRoute = location.pathname.startsWith("/projects/");
  const isProjectsIndex = location.pathname === "/projects";
  const activeSection: BuildingKey | null = isProjectsIndex ? "projects" : activeBuilding;
  const isPanelOpen = activeSection !== null || isProjectRoute || showControls;

  useEffect(() => {
    sceneControls?.setPhotoMode(photoMode);
  }, [photoMode, sceneControls]);

  useEffect(() => {
    if (isLoading) {
      setIsLoadingMounted(true);
      return;
    }
    const timer = window.setTimeout(() => setIsLoadingMounted(false), 380);
    return () => window.clearTimeout(timer);
  }, [isLoading]);

  const handleTourEnd = useCallback(() => {
    cancelTourRef.current = null;
    setIsTourActive(false);
  }, []);

  const stopTour = useCallback(() => {
    cancelTourRef.current?.();
    cancelTourRef.current = null;
    setIsTourActive(false);
  }, []);

  const startTour = useCallback(() => {
    if (!controlsRef.current || prefersReducedMotion()) return;
    cancelTourRef.current?.();
    setIsTourActive(true);
    cancelTourRef.current = controlsRef.current.startCameraTour(handleTourEnd);
  }, [handleTourEnd]);

  const handleSceneReady = useCallback((controls: SceneControls) => {
    controlsRef.current = controls;
    setSceneControls(controls);
  }, []);

  useEffect(() => () => cancelTourRef.current?.(), []);

  const handleBuildingSelect = useCallback((key: BuildingKey | null) => {
    stopTour();
    setActiveBuilding(key);
    if (key) {
      setPhotoMode(false);
      setShowControls(false);
      navigate("/");
    }
  }, [navigate, stopTour]);

  const openSection = useCallback((key: BuildingKey) => {
    handleBuildingSelect(key);
    controlsRef.current?.focusOnBuilding(key);
  }, [handleBuildingSelect]);

  const handleProjectOpen = useCallback((slug: string) => {
    stopTour();
    setActiveBuilding(null);
    navigate(`/projects/${slug}`);
  }, [navigate, stopTour]);

  const handleProjectClose = useCallback(() => {
    setActiveBuilding("projects");
    navigate("/");
  }, [navigate]);

  const closeSection = useCallback(() => {
    setActiveBuilding(null);
    if (isProjectsIndex) navigate("/");
  }, [isProjectsIndex, navigate]);

  const openHelp = () => {
    stopTour();
    setShowControls((open) => !open);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (photoMode) setPhotoMode(false);
      else if (showControls) setShowControls(false);
      else if (isProjectRoute) handleProjectClose();
      else if (isTourActive) stopTour();
      else closeSection();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeSection, handleProjectClose, isProjectRoute, showControls, photoMode, isTourActive, stopTour]);

  useEffect(() => {
    try {
      window.localStorage.setItem("ui:dayMode", isDay ? "day" : "night");
    } catch { /* The island also works without local storage. */ }
  }, [isDay]);

  useEffect(() => {
    if (window.location.pathname !== "/stats") trackVisit();
  }, []);

  // A stamp represents opening the real content, including direct project URLs.
  useEffect(() => {
    const section = isProjectRoute ? "projects" : activeSection;
    if (!section) return;
    recordSection(section);
    setVisited((previous) => previous.includes(section) ? previous : [...previous, section]);
  }, [activeSection, isProjectRoute]);

  useEffect(() => {
    try {
      window.localStorage.setItem(PASSPORT_KEY, JSON.stringify(visited));
    } catch { /* In private browsing the passport lasts for this visit. */ }
  }, [visited]);

  useEffect(() => {
    if (isProjectRoute) recordSection(`project:${location.pathname.slice("/projects/".length)}`);
  }, [isProjectRoute, location.pathname]);

  useEffect(() => {
    document.body.classList.toggle("no-scroll", isPanelOpen);
    return () => document.body.classList.remove("no-scroll");
  }, [isPanelOpen]);

  if (location.pathname === "/stats") {
    return <Suspense fallback={null}><StatsPage /></Suspense>;
  }

  return (
    <div className={`app-shell ${isDay ? "day" : "night"}${isLoadingMounted ? " is-loading" : ""}${photoMode ? " is-photo-mode" : ""}`}>
      {!photoMode && <button type="button" className="skip-link" onClick={() => openSection("about")}>Skip to portfolio content</button>}
      <Suspense fallback={null}>
        <BabylonCanvas isDay={isDay} onBuildingSelect={handleBuildingSelect} onSceneReady={handleSceneReady} onLoadingChange={setIsLoading} />
      </Suspense>
      {!photoMode && <TopBar isDay={isDay} activeSection={isProjectRoute ? "projects" : activeSection} onToggleDay={() => setIsDay((day) => !day)} onToggleControls={openHelp} onOpenSection={openSection} />}
      {!isLoading && !isPanelOpen && <ExplorerHUD controls={sceneControls} visited={visited} isTourActive={isTourActive} photoMode={photoMode} onOpenSection={openSection} onStartTour={startTour} onStopTour={stopTour} onPhotoMode={setPhotoMode} onHelp={openHelp} />}
      {isProjectRoute ? <ProjectPanel onClose={handleProjectClose} /> : <PortfolioPanel activeKey={activeSection} onClose={closeSection} onProjectOpen={handleProjectOpen} />}
      <ControlsPanel open={showControls} onClose={() => setShowControls(false)} />
      {isLoadingMounted && <div className={`loading-overlay island-loading${isLoading ? "" : " exiting"}`} role="status" aria-live="polite">
        <h2>Building the island</h2>
        <span className="island-loading-track" aria-hidden="true" />
      </div>}
      {!isLoading && <div hidden={photoMode || showControls}><Suspense fallback={null}><ChatWidget /></Suspense></div>}
      <Analytics />
    </div>
  );
};

export default App;
