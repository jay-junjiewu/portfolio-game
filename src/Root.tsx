import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import { findProject } from "./data/portfolioData";
import { HOME_META, SECTION_META, projectTitle } from "./data/siteMeta";
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

/** The homepage route: the simple view (the island is rendered by Root, outside the routes). */
const Home = ({ view, changeView }: { view: HomeView; changeView: (next: HomeView) => void }) => {
  const location = useLocation();

  // In the simple view, /?panel=<section> jumps to that section.
  useEffect(() => {
    if (view !== "simple") return;
    const panel = new URLSearchParams(location.search).get("panel");
    if (panel) document.getElementById(panel)?.scrollIntoView();
  }, [view, location.search]);

  return view === "simple" ? <SimpleHome onExploreIsland={() => changeView("island")} /> : null;
};

/** Paths the client app renders itself, so links between them needn't reload the page. */
const isAppPath = (path: string) =>
  ["/", "/about", "/experience", "/skills", "/contact", "/projects"].includes(path) || /^\/projects\/[^/.]+$/.test(path);

const ProjectRoute = () => {
  const project = findProject(useParams().slug);
  return project ? <ProjectPage project={project} /> : <NotFoundPage />;
};

const Root = ({ initialView }: { initialView: HomeView }) => {
  const [view, setView] = useState<HomeView>(initialView);
  const location = useLocation();
  const navigate = useNavigate();
  const onHome = location.pathname === "/";
  const islandVisible = onHome && view === "island";

  useEffect(() => {
    if (window.location.pathname !== "/stats") trackVisit();
  }, []);

  const changeView = useCallback((next: HomeView) => {
    try {
      window.localStorage.setItem(VIEW_STORAGE_KEY, next);
    } catch { /* The choice then lasts for this visit only. */ }
    window.scrollTo(0, 0);
    setView(next);
  }, []);

  // ?view=simple|island is a shareable, no-JS-friendly switch. On a full load
  // the inline script in index.html has already applied it; on an in-app link
  // apply it here. Either way, drop it from the URL.
  useEffect(() => {
    if (!onHome) return;
    const params = new URLSearchParams(location.search);
    const requested = params.get("view");
    if (!requested) return;
    if (requested === "simple" || requested === "island") changeView(requested);
    params.delete("view");
    const search = params.toString();
    navigate({ pathname: "/", search: search ? `?${search}` : "" }, { replace: true });
  }, [onHome, location.search, navigate, changeView]);

  // <html data-view> tells index.html's styles whether the island owns the
  // screen; document pages reached from the island must not be hidden by it.
  useEffect(() => {
    document.documentElement.dataset.view = onHome ? view : "page";
  }, [onHome, view]);

  // Links between app pages navigate in place, so an island that's already
  // loaded stays loaded (hidden and paused) while a document page is open.
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor || (anchor.target && anchor.target !== "_self") || anchor.hasAttribute("download")) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin || !isAppPath(url.pathname)) return;
      // Same page, just a #fragment: let the browser scroll.
      if (url.pathname === window.location.pathname && url.search === window.location.search && url.hash) return;
      event.preventDefault();
      navigate(url.pathname + url.search + url.hash);
      if (!url.hash) window.scrollTo(0, 0);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [navigate]);

  // Keep the tab title right when moving between pages in place.
  useEffect(() => {
    const path = location.pathname;
    const section = Object.values(SECTION_META).find((meta) => meta.path === path);
    const project = path.startsWith("/projects/") ? findProject(path.slice("/projects/".length)) : undefined;
    if (path === "/") document.title = HOME_META.title;
    else if (section) document.title = section.title;
    else if (project) document.title = projectTitle(project.title);
  }, [location.pathname]);

  // Once the island has been opened it stays mounted (hidden and paused) while
  // the simple view or a document page shows, so returning doesn't reload it.
  const [islandOpened, setIslandOpened] = useState(islandVisible);
  useEffect(() => {
    if (islandVisible) setIslandOpened(true);
  }, [islandVisible]);

  return (
    <>
      {(islandOpened || islandVisible) && (
        <div hidden={!islandVisible}>
          <Suspense fallback={null}>
            <IslandApp active={islandVisible} onSimpleView={() => changeView("simple")} />
          </Suspense>
        </div>
      )}
      <Routes>
        <Route path="/" element={<Home view={view} changeView={changeView} />} />
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
