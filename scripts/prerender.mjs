// Post-build static generation. Runs after `vite build` (client) and
// `vite build --ssr src/entry-server.tsx` (server bundle in dist-ssr/).
//
// For every route it renders the real React page to HTML, writes it into
// dist/ with per-page <title>, meta description, canonical, Open Graph and
// JSON-LD, and then generates sitemap.xml, llms.txt, llms-full.txt and a
// markdown copy of each page. Everything comes from src/data/portfolioData.ts
// through the server bundle, so pages, sitemap and llms.txt cannot drift.
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DIST = path.join(ROOT, "dist");
const SSR_DIR = path.join(ROOT, "dist-ssr");

const ssr = await import(pathToFileURL(path.join(SSR_DIR, "entry-server.js")).href);
const {
  render,
  renderDetailsHtml,
  PROJECT_DETAIL_FILES,
  PORTFOLIO_DATA,
  HOME_META,
  SECTION_META,
  NOT_FOUND_META,
  NAV_ITEMS,
  SITE_URL,
  projectTitle,
  projectImageUrl,
  homeJsonLd,
  sectionJsonLd,
  projectJsonLd,
} = ssr;

const problems = [];
const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// ---------------------------------------------------------------- HTML pages

const template = await readFile(path.join(DIST, "index.html"), "utf8");
if (!template.includes("<!--app-html-->")) throw new Error("prerender: dist/index.html has no <!--app-html--> marker");

const setMeta = (html, attr, key, content) => {
  const pattern = new RegExp(`<meta\\b[^>]*\\b${attr}="${key}"[^>]*>`, "i");
  if (!pattern.test(html)) throw new Error(`prerender: template is missing <meta ${attr}="${key}">`);
  return html.replace(pattern, `<meta ${attr}="${key}" content="${esc(content)}" />`);
};

function buildPage({ url, title, description, canonical, image, jsonLd, markdownPath, robots }) {
  const body = render(url);
  const h1Count = (body.match(/<h1[\s>]/g) ?? []).length;
  if (h1Count !== 1) problems.push(`${url}: expected exactly one <h1>, found ${h1Count}`);

  let html = template;
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${esc(title)}</title>`);
  html = setMeta(html, "name", "description", description);
  html = html.replace(/<link\b[^>]*rel="canonical"[^>]*>/i, canonical ? `<link rel="canonical" href="${esc(canonical)}" />` : "");
  html = setMeta(html, "property", "og:url", canonical ?? `${SITE_URL}${url}`);
  html = setMeta(html, "property", "og:title", title);
  html = setMeta(html, "property", "og:description", description);
  html = setMeta(html, "property", "og:image", image);
  html = setMeta(html, "property", "og:image:alt", title);
  html = setMeta(html, "name", "twitter:title", title);
  html = setMeta(html, "name", "twitter:description", description);
  html = setMeta(html, "name", "twitter:image", image);
  if (robots) html = setMeta(html, "name", "robots", robots);
  if (url.startsWith("/projects/")) html = html.replace('<meta property="og:type" content="website" />', '<meta property="og:type" content="article" />');
  html = html.replace(
    /<link rel="alternate" type="text\/markdown"[^>]*>/i,
    markdownPath ? `<link rel="alternate" type="text/markdown" href="${markdownPath}" />` : ""
  );
  if (jsonLd) {
    // Escape "<" so a string in the data can never close the script element.
    const json = JSON.stringify(jsonLd).replace(/</g, "\\u003c");
    html = html.replace(/<\/head>/i, `  <script type="application/ld+json">${json}</script>\n  </head>`);
  }
  html = html.replace('<div id="root"><!--app-html--></div>', `<div id="root" data-prerendered="true">${body}</div>`);
  return { html, body };
}

async function writeRoute(route, html) {
  // "/" -> dist/index.html, "/about" -> dist/about/index.html (served at /about).
  const dir = route === "/" ? DIST : path.join(DIST, route);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "index.html"), html);
}

const checkDescription = (where, description) => {
  if (description.length < 140 || description.length > 160) {
    problems.push(`${where}: meta description is ${description.length} characters (want 140 to 160)`);
  }
};

const rendered = new Map();
const defaultImage = `${SITE_URL}/og-image.png`;

// Homepage: the simple view is the prerendered HTML (the island replaces it on the client).
{
  checkDescription("/", HOME_META.description);
  const page = buildPage({
    url: "/",
    title: HOME_META.title,
    description: HOME_META.description,
    canonical: `${SITE_URL}/`,
    image: defaultImage,
    jsonLd: homeJsonLd(),
    markdownPath: "/llms.txt",
  });
  await writeRoute("/", page.html);
  rendered.set("/", page.body);
}

for (const item of NAV_ITEMS) {
  const meta = SECTION_META[item.key];
  checkDescription(meta.path, meta.description);
  const page = buildPage({
    url: meta.path,
    title: meta.title,
    description: meta.description,
    canonical: `${SITE_URL}${meta.path}`,
    image: defaultImage,
    jsonLd: sectionJsonLd(item.key),
    markdownPath: `${meta.path}.md`,
  });
  await writeRoute(meta.path, page.html);
  rendered.set(meta.path, page.body);
}

const slugs = new Set();
for (const project of PORTFOLIO_DATA.projects) {
  if (slugs.has(project.slug)) problems.push(`duplicate project slug ${project.slug}`);
  slugs.add(project.slug);
  const route = `/projects/${project.slug}`;
  checkDescription(route, project.metaDescription);
  const page = buildPage({
    url: route,
    title: projectTitle(project.title),
    description: project.metaDescription,
    canonical: `${SITE_URL}${route}`,
    image: projectImageUrl(project),
    jsonLd: projectJsonLd(project),
    markdownPath: `${route}.md`,
  });
  await writeRoute(route, page.html);
  rendered.set(route, page.body);
}

// 404 page: Vercel serves dist/404.html with a 404 status for unknown paths.
{
  const page = buildPage({
    url: "/404",
    title: NOT_FOUND_META.title,
    description: NOT_FOUND_META.description,
    canonical: null,
    image: defaultImage,
    jsonLd: null,
    markdownPath: null,
    robots: "noindex",
  });
  await writeFile(path.join(DIST, "404.html"), page.html);
}

// /stats is a private dashboard rendered on the client only.
{
  let html = template.replace(/<link\b[^>]*rel="canonical"[^>]*>/i, "");
  html = setMeta(html, "name", "robots", "noindex, nofollow");
  html = html.replace(/<title>[\s\S]*?<\/title>/i, "<title>Stats | Junjie Wu</title>");
  await writeRoute("/stats", html);
}

// --------------------------------------------------------------- sitemap.xml

const gitDate = (file) => {
  try {
    return execFileSync("git", ["log", "-1", "--format=%cs", "--", file], { cwd: ROOT, encoding: "utf8" }).trim() || null;
  } catch {
    return null; // No git history (e.g. a shallow CI checkout): fall back to the data's date.
  }
};
const latest = (...dates) => dates.filter(Boolean).sort().at(-1);


const sitemapEntries = [
  { loc: `${SITE_URL}/`, lastmod: HOME_META.updated },
  ...NAV_ITEMS.map((item) => ({ loc: `${SITE_URL}${SECTION_META[item.key].path}`, lastmod: SECTION_META[item.key].updated })),
  ...PORTFOLIO_DATA.projects.map((project) => {
    const detailsFile = PROJECT_DETAIL_FILES[project.slug];
    const detailsDate = detailsFile ? gitDate(detailsFile) : null;
    return { loc: `${SITE_URL}/projects/${project.slug}`, lastmod: latest(project.updated, detailsDate) };
  }),
];
const sitemap =
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  sitemapEntries.map((entry) => `  <url>\n    <loc>${entry.loc}</loc>\n    <lastmod>${entry.lastmod}</lastmod>\n  </url>`).join("\n") +
  `\n</urlset>\n`;
await writeFile(path.join(DIST, "sitemap.xml"), sitemap);

// ---------------------------------------------------- markdown and llms.txt

const decode = (s) =>
  s
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");

const absolute = (href) => (href.startsWith("/") ? `${SITE_URL}${href}` : href);

/** Converts the (well-formed, React-rendered) markup of a write-up to markdown. */
function htmlToMarkdown(html) {
  let s = html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<svg[\s\S]*?<\/svg>/g, "")
    .replace(/<button[\s\S]*?<\/button>/g, "")
    .replace(/<picture[\s\S]*?<\/picture>/g, "")
    .replace(/<img[^>]*>/g, "");
  s = s.replace(/<div class="chip-row">([\s\S]*?)<\/div>/g, (_, inner) => {
    const tags = [...inner.matchAll(/<span[^>]*>([\s\S]*?)<\/span>/g)].map((m) => m[1].trim());
    return `\n\nTags: ${tags.join(", ")}\n\n`;
  });
  s = s.replace(/<h([1-4])[^>]*>([\s\S]*?)<\/h\1>/g, (_, level, text) => `\n\n${"#".repeat(Number(level))} ${text.trim()}\n\n`);
  s = s.replace(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g, (_, href, text) => {
    const label = text.replace(/<[^>]+>/g, "").trim();
    return label ? `[${label}](${absolute(decode(href))})` : "";
  });
  s = s.replace(/<(strong|b)>([\s\S]*?)<\/\1>/g, "**$2**").replace(/<(em|i)>([\s\S]*?)<\/\1>/g, "_$2_");
  s = s.replace(/<li[^>]*>([\s\S]*?)<\/li>/g, (_, text) => `\n- ${text.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()}`);
  s = s.replace(/<\/?(p|div|section|article|header|ul|ol|nav|aside|main|footer)[^>]*>/g, "\n\n");
  s = s.replace(/<[^>]+>/g, "");
  s = decode(s);
  return s
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const data = PORTFOLIO_DATA;
const tags = (items) => items.join(", ");

const aboutMd = () =>
  [`# About Junjie Wu`, data.about.headline, data.about.facts, `Contact: ${data.contact.email}`].join("\n\n");

const experienceMd = () =>
  [
    "# Experience",
    ...data.experience.map((job) =>
      [`## ${job.role}, ${job.company}`, `${job.period}${job.location ? `, ${job.location}` : ""}`, ...job.highlights.map((h) => `- ${h}`)].join("\n\n")
    ),
    "Engineering work for other organisations is listed under Projects.",
  ].join("\n\n");

const skillsMd = () => ["# Skills", ...data.skills.map((group) => `- **${group.category}:** ${tags(group.items)}`)].join("\n");

const contactMd = () =>
  [
    "# Contact",
    `- Email: ${data.contact.email}`,
    `- Location: ${data.contact.location}`,
    ...data.contact.links.map((link) => `- ${link.label}: ${link.url}`),
  ].join("\n");

const projectMd = (project, level = 1) => {
  const h = "#".repeat(level);
  const details = renderDetailsHtml(project.slug);
  return [
    `${h} ${project.title}`,
    [
      project.organisationLine && `Organisation: ${project.organisationLine.replace(/^(For|At) /, "")}`,
      project.role && `Role: ${project.role}`,
      `Date: ${project.date}`,
      `URL: ${SITE_URL}/projects/${project.slug}`,
      project.organisationUrl && `Website: ${project.organisationUrl}`,
      project.githubUrl && `Source: ${project.githubUrl}`,
      `Tags: ${tags(project.stack)}`,
    ]
      .filter(Boolean)
      .join("\n"),
    project.description,
    ...(project.details ?? []),
    details ? htmlToMarkdown(details).replace(/^(#{1,3}) /gm, `${"#".repeat(level + 1)} `) : "",
  ]
    .filter(Boolean)
    .join("\n\n");
};

const projectsMd = () =>
  [
    "# Projects",
    SECTION_META.projects.description,
    ...["software", "electrical"].map((category) =>
      [
        `## ${category === "software" ? "Software" : "Electrical"}`,
        ...data.projects
          .filter((p) => p.category === category)
          .map((p) => `- [${p.title}](${SITE_URL}/projects/${p.slug}): ${p.llmsLine}`),
      ].join("\n")
    ),
  ].join("\n\n");

const pageMarkdown = {
  "/about": aboutMd(),
  "/experience": experienceMd(),
  "/skills": skillsMd(),
  "/contact": contactMd(),
  "/projects": projectsMd(),
};
for (const [route, md] of Object.entries(pageMarkdown)) {
  await writeFile(path.join(DIST, `${route.slice(1)}.md`), `${md}\n`);
}
for (const project of data.projects) {
  await writeFile(path.join(DIST, "projects", `${project.slug}.md`), `${projectMd(project)}\n`);
}

const linkFor = (label) => data.contact.links.find((link) => link.label === label)?.url;
const llms = `# Junjie Wu

> C++ software engineer and electrical engineer. UNSW Sydney graduate (Electrical Engineering + Computer Science), December 2026. Former Software Engineering Intern at Tencent (ended December 2026).

${data.about.openTo}
Contact: ${data.contact.email}

## Pages
- [About](${SITE_URL}/about): background and education
- [Experience](${SITE_URL}/experience): ${data.experience.map((job) => (job.role === "Lab Demonstrator" ? "UNSW Lab Demonstrator" : job.company)).join("; ")}
- [Skills](${SITE_URL}/skills)
- [Projects](${SITE_URL}/projects)
- [Contact](${SITE_URL}/contact)

## Projects
${data.projects.map((p) => `- [${p.title}](${SITE_URL}/projects/${p.slug}): ${p.llmsLine}`).join("\n")}

## Profiles
- GitHub: ${linkFor("GitHub")}
- LinkedIn: ${linkFor("LinkedIn")}

## Optional
- [Full text of every page](${SITE_URL}/llms-full.txt)
`;
await writeFile(path.join(DIST, "llms.txt"), llms);

const llmsFull = [
  "# Junjie Wu: full site text",
  `Source: ${SITE_URL}/\nSummary: ${SITE_URL}/llms.txt`,
  aboutMd().replace(/^# /m, "## "),
  experienceMd().replace(/^## /gm, "### ").replace(/^# /m, "## "),
  skillsMd().replace(/^# /m, "## "),
  contactMd().replace(/^# /m, "## "),
  "## Projects",
  ...data.projects.map((project) => projectMd(project, 3)),
].join("\n\n");
await writeFile(path.join(DIST, "llms-full.txt"), `${llmsFull}\n`);

// ------------------------------------------------------------------- checks

// Every page must carry its key facts in the raw HTML (crawlers rarely run JS).
const mustContain = [
  ["/", data.about.facts],
  ["/about", data.about.facts],
  ...data.projects.map((p) => [`/projects/${p.slug}`, p.title]),
  ...data.projects.map((p) => ["/projects", p.title]),
];
for (const [route, text] of mustContain) {
  if (!decode(rendered.get(route) ?? "").includes(text)) problems.push(`${route}: prerendered HTML is missing "${text.slice(0, 60)}..."`);
}
for (const project of data.projects) {
  try {
    await access(path.join(DIST, "og", `${project.slug}.png`));
  } catch {
    problems.push(`missing Open Graph image public/og/${project.slug}.png (run npm run generate:og)`);
  }
}
for (const banned of ["Sunswift", "Ausgrid", "AtomCraft"]) {
  if (rendered.get("/experience")?.includes(banned)) problems.push(`/experience must not mention ${banned}`);
}

await rm(SSR_DIR, { recursive: true, force: true });

if (problems.length) {
  console.error(`prerender: ${problems.length} problem(s):\n- ${problems.join("\n- ")}`);
  process.exit(1);
}
console.log(
  `Prerendered ${rendered.size} pages + 404, sitemap (${sitemapEntries.length} URLs), llms.txt, llms-full.txt and ${data.projects.length + 5} markdown pages.`
);
