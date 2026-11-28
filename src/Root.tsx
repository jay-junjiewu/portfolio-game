import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import { findProject } from "./data/portfolioData";
import {
  AboutPage,
  ContactPage,
  ExperiencePage,
  NotFoundPage,
  ProjectPage,
  ProjectsPage,
  SimpleHome,
  SkillsPage,
} from "./pages/DocumentPages";
import { trackVisit } from "./utils/track";
import { VIEW_STORAGE_KEY, type HomeView } from "./utils/homeView";

// The island (Babylon.js and every 3D asset) is only ever loaded from "/".
const IslandApp = lazy(() => import("./App"));
const StatsPage = lazy(() => import("./components/StatsPage"));

const Home = ({ initialView }: { initialView: HomeView }) => {
  const [view, setView] = useState<HomeView>(initialView);
  const location = useLocation();
  const navigate = useNavigate();

  // ?view=simple|island is a shareable, no-JS-friendly switch. The inline
  // script in index.html has already stored it; drop it from the URL.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (!params.has("view")) return;
    params.delete("view");
    const search = params.toString();
    navigate({ pathname: "/", search: search ? `?${search}` : "" }, { replace: true });
  }, [location.search, navigate]);

  // In the simple view, /?panel=<section> jumps to that section.
  useEffect(() => {
    if (view !== "simple") return;
    const panel = new URLSearchParams(location.search).get("panel");
    if (panel) document.getElementById(panel)?.scrollIntoView();
  }, [view, location.search]);

  const changeView = useCallback((next: HomeView) => {
    try {
      window.localStorage.setItem(VIEW_STORAGE_KEY, next);
    } catch { /* The choice then lasts for this visit only. */ }
    document.documentElement.dataset.view = next;
    window.scrollTo(0, 0);
    setView(next);
  }, []);

  // Once the island has been opened it stays mounted (hidden and paused) while
  // the simple view shows, so switching back doesn't reload the whole scene.
  const [islandOpened, setIslandOpened] = useState(view === "island");
  useEffect(() => {
    if (view === "island") setIslandOpened(true);
  }, [view]);

  return (
    <>
      {view === "simple" && <SimpleHome onExploreIsland={() => changeView("island")} />}
      {(islandOpened || view === "island") && (
        <div hidden={view !== "island"}>
          <Suspense fallback={null}>
            <IslandApp active={view === "island"} onSimpleView={() => changeView("simple")} />
          </Suspense>
        </div>
      )}
    </>
  );
};

const ProjectRoute = () => {
  const project = findProject(useParams().slug);
  return project ? <ProjectPage project={project} /> : <NotFoundPage />;
};

const Root = ({ initialView }: { initialView: HomeView }) => {
  useEffect(() => {
    if (window.location.pathname !== "/stats") trackVisit();
  }, []);

  return (
    <>
      <Routes>
        <Route path="/" element={<Home initialView={initialView} />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/experience" element={<ExperiencePage />} />
        <Route path="/skills" element={<SkillsPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/:slug" element={<ProjectRoute />} />
        <Route path="/stats" element={<Suspense fallback={null}><StatsPage /></Suspense>} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <Analytics />
    </>
  );
};

export default Root;
