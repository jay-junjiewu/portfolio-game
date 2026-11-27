import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import Root from "./Root";
import { readInitialView } from "./utils/homeView";
import "./index.css";
import "./document.css";

const container = document.getElementById("root") as HTMLElement;
const initialView = readInitialView();
const app = (
  <StrictMode>
    <BrowserRouter>
      <Root initialView={initialView} />
    </BrowserRouter>
  </StrictMode>
);

// Document pages (and the homepage's simple view) are prerendered by
// scripts/prerender.mjs with the same components, so they hydrate in place.
// The island replaces the prerendered homepage markup instead.
const path = window.location.pathname;
const prerendered = container.dataset.prerendered === "true";
const hydrate = prerendered && path !== "/stats" && (path !== "/" || initialView === "simple");

if (hydrate) hydrateRoot(container, app);
else createRoot(container).render(app);
