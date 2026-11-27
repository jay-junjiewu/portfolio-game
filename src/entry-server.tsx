// Server entry used only by scripts/prerender.mjs (built with `vite build --ssr`).
// It renders each document route to HTML with the same components the client
// hydrates, and re-exports the data the build scripts need.
import { StrictMode } from "react";
import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router-dom";
import Root from "./Root";
import { PROJECT_DETAILS } from "./components/projects";

export const render = (url: string) =>
  renderToString(
    <StrictMode>
      <StaticRouter location={url}>
        <Root initialView="simple" />
      </StaticRouter>
    </StrictMode>
  );

/** Just the long-form write-up of a project (for llms-full.txt and the .md pages). */
export const renderDetailsHtml = (slug: string) => {
  const Details = PROJECT_DETAILS[slug];
  return Details ? renderToString(<Details />) : "";
};

export { PROJECT_DETAIL_FILES } from "./components/projects";
export { PORTFOLIO_DATA, relatedProjects } from "./data/portfolioData";
export { HOME_META, NAV_ITEMS, NOT_FOUND_META, SECTION_META, SITE_URL, projectTitle } from "./data/siteMeta";
export * from "./data/structuredData";
