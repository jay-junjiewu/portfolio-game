export const SITE_URL = "https://www.junjiewu.com";

export type RouteMeta = {
  title: string;
  description: string;
  canonical: string;
  image: string;
};

/**
 * Updates the existing document head tags in place for the current route and
 * returns a cleanup that restores the previous values. We mutate the tags that
 * index.html already ships (rather than appending new ones) so there is never a
 * duplicate <title> / og:* tag fighting the static homepage metadata. This is
 * the runtime layer for JS-rendering crawlers; the build-time prerender (SSG)
 * is what bakes unique metadata into the raw HTML for social unfurlers.
 */
export function applyRouteMeta(meta: RouteMeta): () => void {
  if (typeof document === "undefined") return () => {};

  const restores: Array<() => void> = [];

  const prevTitle = document.title;
  document.title = meta.title;
  restores.push(() => {
    document.title = prevTitle;
  });

  const setAttr = (selector: string, attr: "content" | "href", value: string) => {
    const el = document.head.querySelector(selector);
    if (!el) return;
    const prev = el.getAttribute(attr);
    el.setAttribute(attr, value);
    restores.push(() => {
      if (prev === null) el.removeAttribute(attr);
      else el.setAttribute(attr, prev);
    });
  };

  setAttr('meta[name="description"]', "content", meta.description);
  setAttr('link[rel="canonical"]', "href", meta.canonical);
  setAttr('meta[property="og:title"]', "content", meta.title);
  setAttr('meta[property="og:description"]', "content", meta.description);
  setAttr('meta[property="og:url"]', "content", meta.canonical);
  setAttr('meta[property="og:image"]', "content", meta.image);
  setAttr('meta[name="twitter:title"]', "content", meta.title);
  setAttr('meta[name="twitter:description"]', "content", meta.description);
  setAttr('meta[name="twitter:image"]', "content", meta.image);

  return () => restores.forEach((restore) => restore());
}

/** Absolute URL for an og:image, given a root-relative asset path. */
export function absoluteImage(path?: string): string {
  if (!path) return `${SITE_URL}/og-image.png`;
  if (/^https?:\/\//.test(path)) return path;
  return `${SITE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

/**
 * Injects a route-scoped JSON-LD <script> into <head> and returns a cleanup that
 * removes it. Used for per-project structured data (CreativeWork /
 * SoftwareSourceCode + BreadcrumbList). The static homepage @graph in index.html
 * is untouched.
 */
export function injectJsonLd(id: string, data: unknown): () => void {
  if (typeof document === "undefined") return () => {};
  document.getElementById(id)?.remove();
  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.id = id;
  script.textContent = JSON.stringify(data);
  document.head.appendChild(script);
  return () => script.remove();
}
