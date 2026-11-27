// Packs every OBJ model the island uses into two compressed GLB files:
//   src/assets/models/island-core.glb   the five labelled landmark buildings
//   src/assets/models/island-props.glb  everything else (houses, cars, props)
//
// Each model becomes one root node named after its original OBJ path (the
// `modelPath` key in the layout), so the scene code can still look models up
// by that key. Geometry is meshopt-compressed and identical textures are
// shared. The OBJ sources stay in public/ as the editable originals.
//
// Run after changing models or the layout: `npm run build:models`.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import obj2gltf from "obj2gltf";
import { Document, NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dedup, meshopt, prune, unpartition, mergeDocuments } from "@gltf-transform/functions";
import { MeshoptEncoder } from "meshoptimizer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "src/assets/models");

// Load the real layout (islandLayout.ts and its pure-TS dependencies).
const bundled = await build({
  entryPoints: [path.join(ROOT, "src/data/islandLayout.ts")],
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
});
const layoutUrl = `data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString("base64")}`;
const { ISLAND_LAYOUT } = await import(layoutUrl);

const used = ISLAND_LAYOUT.filter((entry) => entry.isPortfolio !== false);
const coreModels = new Set(used.filter((entry) => entry.type === "main").map((entry) => entry.modelPath));
const propModels = new Set(used.filter((entry) => entry.type !== "main").map((entry) => entry.modelPath));
coreModels.forEach((model) => propModels.delete(model));

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.encoder": MeshoptEncoder });

async function packModels(models, outName) {
  const target = new Document();
  target.createBuffer();
  const scene = target.createScene("island");
  for (const modelPath of [...models].sort()) {
    const objFile = path.join(ROOT, "public", modelPath);
    const glb = await obj2gltf(objFile, { binary: true, secure: true });
    const source = await io.readBinary(new Uint8Array(glb));
    const before = new Set(target.getRoot().listScenes());
    mergeDocuments(target, source);
    const added = target.getRoot().listScenes().filter((s) => !before.has(s));
    // Wrap the model's nodes in one root named by its layout key.
    const root = target.createNode(modelPath);
    for (const addedScene of added) {
      for (const child of addedScene.listChildren()) {
        addedScene.removeChild(child);
        root.addChild(child);
      }
      addedScene.dispose();
    }
    scene.addChild(root);
  }
  // Name each colour atlas after its model pack (e.g. "car-models") so the
  // runtime can pair models with textures without loading glTF materials.
  for (const node of scene.listChildren()) {
    const pack = node.getName().split("/")[0];
    node.traverse((child) => {
      for (const prim of child.getMesh()?.listPrimitives() ?? []) {
        prim.getMaterial()?.getBaseColorTexture()?.setName(pack);
      }
    });
  }
  target.getRoot().setDefaultScene(scene);
  await target.transform(unpartition(), dedup(), prune({ keepLeaves: true }), meshopt({ encoder: MeshoptEncoder, level: "medium" }));
  const bytes = await io.writeBinary(target);
  await writeFile(path.join(OUT_DIR, outName), bytes);
  return bytes.byteLength;
}

await mkdir(OUT_DIR, { recursive: true });
const coreSize = await packModels(coreModels, "island-core.glb");
const propsSize = await packModels(propModels, "island-props.glb");
const kb = (n) => `${(n / 1024).toFixed(0)} KB`;
console.log(`island-core.glb: ${coreModels.size} models, ${kb(coreSize)}`);
console.log(`island-props.glb: ${propModels.size} models, ${kb(propsSize)}`);

// Keep a manifest of the original OBJ sizes for comparison.
let objTotal = 0;
for (const model of [...coreModels, ...propModels]) {
  objTotal += (await readFile(path.join(ROOT, "public", model))).byteLength;
  objTotal += (await readFile(path.join(ROOT, "public", model.replace(/\.obj$/, ".mtl")))).byteLength;
}
console.log(`Source OBJ + MTL for the same models: ${kb(objTotal)} (plus textures)`);

