// Generates public/sitemap.xml from the project list in src/data/portfolioData.ts
// so the sitemap can never drift from the actual routes. Runs automatically on
// `npm run build` (prebuild) and standalone via `npm run generate:sitemap`.
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SITE = "https://www.junjiewu.com";

// Mirrors projectSlug() in src/data/portfolioData.ts.
const slugify = (title) =>
  title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const src = await readFile(path.join(ROOT, "src/data/portfolioData.ts"), "utf8");
// Isolate the `projects: [ ... ]` block inside the PORTFOLIO_DATA literal (not
// the type definition), ending where the `skills:` key begins, so we only pick
// up project titles — not the Project/ExperienceLink type fields or link titles.
const dataStart = src.indexOf("PORTFOLIO_DATA");
const start = src.indexOf("projects:", dataStart);
const end = src.indexOf("skills:", start);
const block = src.slice(start, end === -1 ? undefined : end);
const slugs = [...block.matchAll(/title:\s*"([^"]+)"/g)].map((m) => slugify(m[1]));

if (slugs.length === 0) {
  throw new Error("generate-sitemap: no project titles found — check portfolioData.ts shape");
}

const today = new Date().toISOString().slice(0, 10);

const urls = [
  { loc: `${SITE}/`, changefreq: "monthly", priority: "1.0" },
  { loc: `${SITE}/projects`, changefreq: "monthly", priority: "0.8" },
  ...slugs.map((s) => ({ loc: `${SITE}/projects/${s}`, priority: "0.7" })),
];

const body = urls
  .map((u) => {
    const lines = [`    <loc>${u.loc}</loc>`, `    <lastmod>${today}</lastmod>`];
    if (u.changefreq) lines.push(`    <changefreq>${u.changefreq}</changefreq>`);
    if (u.priority) lines.push(`    <priority>${u.priority}</priority>`);
    return `  <url>\n${lines.join("\n")}\n  </url>`;
  })
  .join("\n");

const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;

await writeFile(path.join(ROOT, "public/sitemap.xml"), xml);
console.log(`Wrote public/sitemap.xml — ${urls.length} URLs (${slugs.length} projects).`);
