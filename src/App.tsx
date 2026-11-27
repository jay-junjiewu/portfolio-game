import { useCallback, useEffect, useRef, useState, lazy, Suspense } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ControlsPanel from "./components/ControlsPanel";
import ExplorerHUD from "./components/ExplorerHUD";
import PortfolioPanel from "./components/PortfolioPanel";
import ProjectPanel from "./components/ProjectPanel";
import TopBar from "./components/TopBar";
import type { BuildingKey } from "./data/cityLayout";
import { findProject } from "./data/portfolioData";
import type { SceneControls } from "./scene/createScene";
import { prefersReducedMotion } from "./utils/device";
import { recordSection } from "./utils/engagement";
import "./explorer.css";

// Keep the interface available while the 3D engine streams in.
const BabylonCanvas = lazy(() => import("./components/BabylonCanvas"));
const ChatWidget = lazy(() => import("./components/ChatWidget"));

const PASSPORT_KEY = "ui:islandPassport:v1";
const sectionKeys: BuildingKey[] = ["about", "projects", "skills", "experience", "contact"];
const isSectionKey = (value: string | null): value is BuildingKey =>
  value !== null && (sectionKeys as string[]).includes(value);

/** History state we attach to entries we push, so "close" can go back instead of pushing. */
type PanelHistoryState = { panelPushed?: boolean; projectPushed?: boolean } | null;

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

const NARROW_QUERY = "(max-width: 760px)";

type AppProps = { onSimpleView: () => void };

const App = ({ onSimpleView }: AppProps) => {
  const [isDay, setIsDay] = useState(readDayMode);
  const [showControls, setShowControls] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMounted, setIsLoadingMounted] = useState(true);
  const [sceneControls, setSceneControls] = useState<SceneControls | null>(null);
  const [isTourActive, setIsTourActive] = useState(false);
  const [photoMode, setPhotoMode] = useState(false);
  const [visited, setVisited] = useState(readPassport);
  const [panelCoverage, setPanelCoverage] = useState(1);
  const [isNarrow, setIsNarrow] = useState(() => window.matchMedia?.(NARROW_QUERY).matches ?? false);
  const controlsRef = useRef<SceneControls | null>(null);
  const cancelTourRef = useRef<(() => void) | null>(null);
  const focusedFromUrlRef = useRef(false);
  const navigate = useNavigate();
  const location = useLocation();

  // The open panel lives in the URL (/?panel=<section>&project=<slug>) so it
  // can be shared and the back button closes it. Canonical stays at "/".
  const params = new URLSearchParams(location.search);
  const panelParam = params.get("panel");
  const projectParam = params.get("project");
  const activeProject = panelParam === "projects" ? findProject(projectParam ?? undefined) : undefined;
  const activeSection: BuildingKey | null = isSectionKey(panelParam) && !activeProject ? panelParam : null;
  const historyState = location.state as PanelHistoryState;
  const isPanelOpen = activeSection !== null || activeProject !== undefined || showControls;

  useEffect(() => {
    const query = window.matchMedia?.(NARROW_QUERY);
    if (!query) return;
    const update = () => setIsNarrow(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

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

  // A deep link (/?panel=skills) also flies the camera to that landmark once.
  useEffect(() => {
    if (!sceneControls || focusedFromUrlRef.current) return;
    focusedFromUrlRef.current = true;
    const key = activeProject ? "projects" : activeSection;
    if (key) sceneControls.focusOnBuilding(key);
  }, [sceneControls, activeSection, activeProject]);

  const closePanel = useCallback(() => {
    if (historyState?.panelPushed) navigate(-1);
    else navigate("/", { replace: true });
  }, [historyState, navigate]);

  const showSection = useCallback((key: BuildingKey) => {
    stopTour();
    setPhotoMode(false);
    setShowControls(false);
    if (activeSection === key) return;
    // Opening from the bare island pushes one history entry; switching between
    // panels replaces it, so a single Back always returns to the island.
    const alreadyOpen = activeSection !== null || activeProject !== undefined;
    navigate(`/?panel=${key}`, {
      replace: alreadyOpen,
      state: { panelPushed: alreadyOpen ? Boolean(historyState?.panelPushed) : true },
    });
  }, [activeProject, activeSection, historyState, navigate, stopTour]);

  const handleBuildingSelect = useCallback((key: BuildingKey | null) => {
    if (key) showSection(key);
  }, [showSection]);

  const openSection = useCallback((key: BuildingKey) => {
    showSection(key);
    controlsRef.current?.focusOnBuilding(key);
  }, [showSection]);

  const handleProjectOpen = useCallback((slug: string) => {
    stopTour();
    navigate(`/?panel=projects&project=${encodeURIComponent(slug)}`, {
      state: { panelPushed: Boolean(historyState?.panelPushed) || activeSection === null, projectPushed: true },
    });
  }, [activeSection, historyState, navigate, stopTour]);

  const handleProjectClose = useCallback(() => {
    if (historyState?.projectPushed) navigate(-1);
    else navigate("/?panel=projects", { replace: true, state: { panelPushed: Boolean(historyState?.panelPushed) } });
  }, [historyState, navigate]);

  const openHelp = () => {
    stopTour();
    setShowControls((open) => !open);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (photoMode) setPhotoMode(false);
      else if (showControls) setShowControls(false);
      else if (activeProject) handleProjectClose();
      else if (activeSection) closePanel();
      else if (isTourActive) stopTour();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeProject, activeSection, closePanel, handleProjectClose, isTourActive, photoMode, showControls, stopTour]);

  useEffect(() => {
    try {
      window.localStorage.setItem("ui:dayMode", isDay ? "day" : "night");
    } catch { /* The island also works without local storage. */ }
    // Keep the simple view and document pages on the same day/night choice.
    document.documentElement.dataset.theme = isDay ? "day" : "night";
  }, [isDay]);

  // A stamp represents opening the real content, including direct project links.
  useEffect(() => {
    const section = activeProject ? "projects" : activeSection;
    if (!section) return;
    recordSection(section);
    setVisited((previous) => previous.includes(section) ? previous : [...previous, section]);
  }, [activeSection, activeProject]);

  useEffect(() => {
    if (activeProject) recordSection(`project:${activeProject.slug}`);
  }, [activeProject]);

  useEffect(() => {
    try {
      window.localStorage.setItem(PASSPORT_KEY, JSON.stringify(visited));
    } catch { /* In private browsing the passport lasts for this visit. */ }
  }, [visited]);

  useEffect(() => {
    document.body.classList.toggle("no-scroll", isPanelOpen);
    return () => document.body.classList.remove("no-scroll");
  }, [isPanelOpen]);

  // On phones a full-height sheet hides the scene, so it can stop rendering.
  const renderPaused = isNarrow && panelCoverage >= 0.9 && (activeSection !== null || activeProject !== undefined);

  return (
    <div className={`app-shell ${isDay ? "day" : "night"}${isLoadingMounted ? " is-loading" : ""}${photoMode ? " is-photo-mode" : ""}`}>
      {!photoMode && <a className="skip-link" href="/about" onClick={(event) => { event.preventDefault(); openSection("about"); }}>Skip to portfolio content</a>}
      <Suspense fallback={null}>
        <BabylonCanvas isDay={isDay} paused={renderPaused} onBuildingSelect={handleBuildingSelect} onSceneReady={handleSceneReady} onLoadingChange={setIsLoading} />
      </Suspense>
      {!photoMode && <TopBar isDay={isDay} activeSection={activeProject ? "projects" : activeSection} onToggleDay={() => setIsDay((day) => !day)} onToggleControls={openHelp} onOpenSection={openSection} onSimpleView={onSimpleView} />}
      {!isLoading && !isPanelOpen && <ExplorerHUD controls={sceneControls} visited={visited} isTourActive={isTourActive} photoMode={photoMode} onOpenSection={openSection} onStartTour={startTour} onStopTour={stopTour} onPhotoMode={setPhotoMode} onHelp={openHelp} />}
      {activeProject ? <ProjectPanel project={activeProject} onClose={handleProjectClose} onCoverageChange={setPanelCoverage} /> : <PortfolioPanel activeKey={activeSection} onClose={closePanel} onProjectOpen={handleProjectOpen} onCoverageChange={setPanelCoverage} />}
      <ControlsPanel open={showControls} onClose={() => setShowControls(false)} />
      {isLoadingMounted && <div className={`loading-overlay island-loading${isLoading ? "" : " exiting"}`} role="status" aria-live="polite">
        <p className="island-loading-title">Building the island</p>
        <span className="island-loading-track" aria-hidden="true" />
        <p className="island-loading-note">Use the menu above to read any section now, or <a href="/?view=simple" onClick={(event) => { event.preventDefault(); onSimpleView(); }}>switch to the simple view</a>.</p>
      </div>}
      {!isLoading && <div hidden={photoMode || showControls}><Suspense fallback={null}><ChatWidget /></Suspense></div>}
    </div>
  );
};

export default App;
