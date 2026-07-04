// Post-build prerender: bakes a real, per-route HTML file into dist/ for every
// crawlable URL (home, /projects, and each /projects/<slug>). Vite emits a
// single dist/index.html whose <link rel="canonical">, <title>, and meta all
// point at the homepage; without this step every project URL serves that same
// HTML, so Googlebot reads "canonical = homepage" on each one and drops them as
// duplicates/alternates. This clones dist/index.html per route and rewrites the
// head tags + the #root SEO-fallback so each URL returns distinct, correct HTML.
//
// Runs automatically on `npm run build` (postbuild) and standalone via
// `npm run prerender`. Reads the same PORTFOLIO_DATA the app and the sitemap use
// (transpiled in-memory with esbuild) so routes can never drift.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { transform } from "esbuild";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DIST = path.join(ROOT, "dist");
const SITE = "https://www.junjiewu.com";

// --- Load the real project data (portfolioData.ts only has a type-import, which
// esbuild erases, so we can transpile + import it directly without a bundler). ---
const dataSource = await readFile(path.join(ROOT, "src/data/portfolioData.ts"), "utf8");
const { code } = await transform(dataSource, { loader: "ts", format: "esm" });
const dataUrl = `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`;
const { PORTFOLIO_DATA, projectSlug } = await import(dataUrl);

const esc = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const abs = (p) => (!p ? `${SITE}/og-image.png` : /^https?:\/\//.test(p) ? p : `${SITE}${p.startsWith("/") ? "" : "/"}${p}`);

// Replace a <meta> tag's content by an identifying attribute (attr="val").
// [^>]* spans newlines (index.html wraps some meta tags across lines) because it
// only excludes '>', and self-closing meta tags contain no '>' internally.
const setMeta = (html, attr, val, content) =>
  html.replace(
    new RegExp(`<meta\\b[^>]*\\b${attr}="${val}"[^>]*>`, "i"),
    `<meta ${attr}="${val}" content="${esc(content)}" />`
  );

const setTitle = (html, title) => html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${esc(title)}</title>`);

const setCanonical = (html, href) =>
  html.replace(/<link\b[^>]*rel="canonical"[^>]*>/i, `<link rel="canonical" href="${esc(href)}" />`);

const setFallback = (html, inner) =>
  html.replace(/<main class="seo-fallback">[\s\S]*?<\/main>/i, `<main class="seo-fallback">${inner}</main>`);

const injectJsonLd = (html, data) =>
  html.replace(/<\/head>/i, `  <script type="application/ld+json">${JSON.stringify(data)}</script>\n  </head>`);

// Apply the shared per-route head rewrites (title/description/canonical/OG/Twitter).
function applyMeta(html, { title, description, canonical, image }) {
  html = setTitle(html, title);
  html = setMeta(html, "name", "description", description);
  html = setCanonical(html, canonical);
  html = setMeta(html, "property", "og:url", canonical);
  html = setMeta(html, "property", "og:title", title);
  html = setMeta(html, "property", "og:description", description);
  html = setMeta(html, "property", "og:image", image);
  html = setMeta(html, "name", "twitter:title", title);
  html = setMeta(html, "name", "twitter:description", description);
  html = setMeta(html, "name", "twitter:image", image);
  return html;
}

async function writePage(routePath, html) {
  // routePath "" -> dist/index.html (home, left as vite emitted it);
  // "projects" -> dist/projects/index.html; served by Vercel at /projects.
  const outDir = routePath ? path.join(DIST, routePath) : DIST;
  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, "index.html"), html);
}

const baseHtml = await readFile(path.join(DIST, "index.html"), "utf8");
const projects = PORTFOLIO_DATA.projects;
let count = 0;

// --- /projects : listing page with a crawlable link to every project. ---
{
  const title = "Projects — Junjie Wu";
  const description =
    "Projects by Junjie Wu across machine learning, low-latency C++, systems programming, embedded systems, and FPGA design.";
  const canonical = `${SITE}/projects`;
  let html = applyMeta(baseHtml, { title, description, canonical, image: abs() });
  const links = projects
    .map((p) => `<li><a href="${SITE}/projects/${projectSlug(p.title)}">${esc(p.title)}</a></li>`)
    .join("");
  html = setFallback(
    html,
    `<h1>Projects — Junjie Wu</h1><p>${esc(description)}</p><nav><ul>${links}</ul></nav>`
  );
  html = injectJsonLd(html, {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${canonical}#projects`,
    url: canonical,
    name: "Projects — Junjie Wu",
    isPartOf: { "@id": `${SITE}/#website` },
    about: { "@id": `${SITE}/#person` },
  });
  await writePage("projects", html);
  count++;
}

// --- /projects/<slug> : one static page per project. ---
for (const project of projects) {
  const slug = projectSlug(project.title);
  const description = project.description.replace(/\s+/g, " ").trim().slice(0, 200);
  const title = `${project.title} — Junjie Wu`;
  const canonical = `${SITE}/projects/${slug}`;
  const image = abs(project.image);

  let html = applyMeta(baseHtml, { title, description, canonical, image });

  const stack = project.stack?.length
    ? `<p>Tech: ${project.stack.map(esc).join(", ")}</p>`
    : "";
  const repo = project.githubUrl
    ? `<p><a href="${esc(project.githubUrl)}">Source code on GitHub</a></p>`
    : "";
  html = setFallback(
    html,
    `<nav><a href="${SITE}/">Home</a> · <a href="${SITE}/projects">Projects</a></nav>` +
      `<h1>${esc(project.title)}</h1>` +
      `<p><strong>${esc(project.date)}</strong></p>` +
      `<p>${esc(project.description)}</p>${stack}${repo}`
  );

  // Mirrors the runtime JSON-LD from ProjectPanel.tsx (SoftwareSourceCode/
  // CreativeWork + BreadcrumbList) so it's present in the raw HTML too.
  const work = {
    "@type": project.githubUrl ? "SoftwareSourceCode" : "CreativeWork",
    name: project.title,
    description,
    url: canonical,
    author: { "@id": `${SITE}/#person` },
    keywords: project.stack.join(", "),
    ...(project.image ? { image } : {}),
    ...(project.githubUrl
      ? { codeRepository: project.githubUrl, programmingLanguage: project.stack }
      : {}),
  };
  const breadcrumb = {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
      { "@type": "ListItem", position: 2, name: "Projects", item: `${SITE}/projects` },
      { "@type": "ListItem", position: 3, name: project.title, item: canonical },
    ],
  };
  html = injectJsonLd(html, { "@context": "https://schema.org", "@graph": [work, breadcrumb] });

  await writePage(`projects/${slug}`, html);
  count++;
}

console.log(`Prerendered ${count} route(s): /projects + ${projects.length} project page(s).`);
