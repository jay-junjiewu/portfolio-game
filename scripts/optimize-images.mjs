// Generates WebP + AVIF siblings next to every raster screenshot so the app can
// serve them via <picture> (AVIF -> WebP -> original). Run: npm run optimize:images
//
// Originals (.png/.jpg) are kept as the universal fallback. Siblings reuse the
// same basename (foo.png -> foo.webp / foo.avif) so the <Picture> component can
// derive them by swapping the extension.
import { readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const TARGET_DIRS = [path.join(ROOT, "public", "assets")];
const TARGET_FILES = [
  path.join(ROOT, "public", "og-image.png"),
  path.join(ROOT, "public", "headshot.jpg"),
];

const MAX_WIDTH = 1600; // screenshots never need to be wider than this
const RASTER = /\.(png|jpe?g)$/i;

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (entry.isFile() && RASTER.test(entry.name)) yield full;
  }
}

async function collect() {
  const files = [];
  for (const dir of TARGET_DIRS) {
    if (!existsSync(dir)) continue;
    for await (const f of walk(dir)) files.push(f);
  }
  for (const f of TARGET_FILES) if (existsSync(f)) files.push(f);
  return files;
}

async function isStale(src, out) {
  if (!existsSync(out)) return true;
  const [s, o] = await Promise.all([stat(src), stat(out)]);
  return s.mtimeMs > o.mtimeMs;
}

async function convert(src) {
  const base = src.replace(RASTER, "");
  const webp = `${base}.webp`;
  const avif = `${base}.avif`;
  const pipeline = sharp(src).rotate();
  const meta = await pipeline.metadata();
  const resize =
    meta.width && meta.width > MAX_WIDTH ? { width: MAX_WIDTH, withoutEnlargement: true } : null;

  let made = [];
  if (await isStale(src, webp)) {
    let p = sharp(src).rotate();
    if (resize) p = p.resize(resize);
    await p.webp({ quality: 80, effort: 5 }).toFile(webp);
    made.push("webp");
  }
  if (await isStale(src, avif)) {
    let p = sharp(src).rotate();
    if (resize) p = p.resize(resize);
    await p.avif({ quality: 55, effort: 4 }).toFile(avif);
    made.push("avif");
  }
  return made;
}

const files = await collect();
console.log(`Optimizing ${files.length} images...`);
let converted = 0;
for (const f of files) {
  try {
    const made = await convert(f);
    if (made.length) {
      converted++;
      console.log(`  ${path.relative(ROOT, f)} -> ${made.join(", ")}`);
    }
  } catch (err) {
    console.warn(`  ! failed ${path.relative(ROOT, f)}: ${err.message}`);
  }
}
console.log(`Done. Updated ${converted}/${files.length} images.`);
