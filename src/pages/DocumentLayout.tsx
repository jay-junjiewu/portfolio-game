// Lightweight page shell for the document routes (/about, /projects, ...). It
// must never import Babylon or the island UI, so these pages stay fast and
// readable without WebGL or JavaScript.
import { useEffect, useState, type ReactNode } from "react";
import type { BuildingKey } from "../data/cityLayout";
import { NAV_ITEMS } from "../data/siteMeta";

type Crumb = { label: string; href?: string };

type DocumentLayoutProps = {
  children: ReactNode;
  current?: BuildingKey;
  /** Where the "Explore on the island" link goes. */
  islandHref?: string;
  /** Replaces the island link (used by the simple view of the homepage). */
  headerAction?: ReactNode;
  /** In-page anchors instead of page links (the one-page simple view). */
  navMode?: "pages" | "anchors";
  breadcrumbs?: Crumb[];
};

export const IslandIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M3 17c2.5 1.6 5.5 1.6 9 0s6.5-1.6 9 0" />
    <path d="M6 14.5 9 8l3 4 2-3 4 5.5" />
  </svg>
);

/**
 * On phones the header slides away while scrolling down and comes back as soon
 * as the reader scrolls up, so navigation is always one flick away.
 */
const useHideOnScroll = () => {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    let lastY = window.scrollY;
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const y = window.scrollY;
        if (y < 80) setHidden(false);
        else if (y > lastY + 8) setHidden(true);
        else if (y < lastY - 8) setHidden(false);
        if (Math.abs(y - lastY) > 8 || y < 80) lastY = y;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);
  return hidden;
};

const DocumentLayout = ({
  children,
  current,
  islandHref = "/",
  headerAction,
  navMode = "pages",
  breadcrumbs,
}: DocumentLayoutProps) => {
  const headerHidden = useHideOnScroll();
  return (
  <div className="doc-shell">
    <a className="doc-skip" href="#main">Skip to content</a>
    <header className={`doc-header${headerHidden ? " is-hidden" : ""}`}>
      <div className="doc-header-inner">
        <a className="doc-brand" href="/">
          <span className="doc-brand-name">Junjie Wu</span>
          <span className="doc-brand-role">Software Engineer</span>
        </a>
        <nav className="doc-nav" aria-label="Main">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.key}
              href={navMode === "anchors" ? `#${item.key}` : item.href}
              aria-current={current === item.key ? "page" : undefined}
            >
              {item.label}
            </a>
          ))}
        </nav>
        {headerAction ?? (
          <a className="doc-island-link" href={islandHref}>
            <IslandIcon />
            <span>Explore on the island</span>
          </a>
        )}
      </div>
    </header>
    <main id="main" className="doc-main">
      {breadcrumbs && (
        <nav className="doc-breadcrumbs" aria-label="Breadcrumb">
          <ol>
            {breadcrumbs.map((crumb) => (
              <li key={crumb.label}>
                {crumb.href ? <a href={crumb.href}>{crumb.label}</a> : <span aria-current="page">{crumb.label}</span>}
              </li>
            ))}
          </ol>
        </nav>
      )}
      {children}
    </main>
    <footer className="doc-footer">
      <div className="doc-footer-inner">
        <nav aria-label="Footer">
          <a href="/">Home</a>
          {NAV_ITEMS.map((item) => (
            <a key={item.key} href={item.href}>{item.label}</a>
          ))}
        </nav>
        <p className="doc-footer-note">© 2026 Junjie Wu, Sydney, Australia</p>
      </div>
    </footer>
  </div>
  );
};

export default DocumentLayout;
