// Generates a 1200x630 Open Graph image per project into public/og/<slug>.png
// (title, organisation and tags on the site's island palette). The PNGs are
// committed; re-run `npm run generate:og` after adding or renaming a project.
// The prerender step fails if a project is missing its image.
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { transform } from "esbuild";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "public/og");

const source = await readFile(path.join(ROOT, "src/data/portfolioData.ts"), "utf8");
const { code } = await transform(source, { loader: "ts", format: "esm" });
const { PORTFOLIO_DATA } = await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Greedy word wrap by an approximate character budget per line. */
const wrap = (text, maxChars, maxLines) => {
  const lines = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    if ((line ? `${line} ${word}` : word).length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    lines.length = maxLines;
    lines[maxLines - 1] = `${lines[maxLines - 1].replace(/[\s,:;]+\S*$/, "")}…`;
  }
  return lines;
};

const FONT = "DejaVu Sans, Inter, Helvetica, Arial, sans-serif";

function svgFor(project) {
  const titleSize = project.title.length > 40 ? 54 : 64;
  const titleLines = wrap(project.title, project.title.length > 40 ? 26 : 24, 3);
  const titleTop = 215;
  const lineHeight = titleSize * 1.16;
  const afterTitle = titleTop + lineHeight * (titleLines.length - 1);
  const subtitle = [project.organisationLine, project.date].filter(Boolean);

  let chipX = 80;
  const chips = project.stack.slice(0, 4).map((tag) => {
    const width = Math.round(tag.length * 13.5 + 40);
    const chip = `<g transform="translate(${chipX} 500)"><rect width="${width}" height="48" rx="24" fill="#e8dcc4"/><text x="${width / 2}" y="31" text-anchor="middle" font-size="22" fill="#3c352c">${esc(tag)}</text></g>`;
    chipX += width + 12;
    return chipX < 1120 ? chip : "";
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" font-family="${FONT}">
  <rect width="1200" height="630" fill="#f5f1e1"/>
  <circle cx="1190" cy="10" r="160" fill="#9fd3d6" opacity="0.55"/>
  <circle cx="1205" cy="0" r="95" fill="#c9e2b5" opacity="0.9"/>
  <rect x="0" y="606" width="1200" height="24" fill="#6c5942"/>
  <text x="80" y="110" font-size="24" letter-spacing="4" fill="#6b5f50" font-weight="bold">${project.category === "electrical" ? "ELECTRICAL" : "SOFTWARE"} PROJECT BY JUNJIE WU</text>
  ${titleLines.map((line, i) => `<text x="80" y="${titleTop + i * lineHeight}" font-size="${titleSize}" font-weight="bold" fill="#3c352c">${esc(line)}</text>`).join("\n  ")}
  ${subtitle.map((line, i) => `<text x="80" y="${afterTitle + 60 + i * 38}" font-size="28" fill="#6c5942">${esc(line)}</text>`).join("\n  ")}
  ${chips.join("\n  ")}
  <text x="1120" y="580" text-anchor="end" font-size="24" fill="#6b5f50">junjiewu.com</text>
</svg>`;
}

await mkdir(OUT, { recursive: true });
for (const project of PORTFOLIO_DATA.projects) {
  await sharp(Buffer.from(svgFor(project))).png({ compressionLevel: 9, palette: true }).toFile(path.join(OUT, `${project.slug}.png`));
}
console.log(`Wrote ${PORTFOLIO_DATA.projects.length} Open Graph images to public/og/.`);
