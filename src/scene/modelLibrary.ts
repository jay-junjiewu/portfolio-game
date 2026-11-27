// Loads the island's models from the two packed GLB files built by
// scripts/build-models.mjs, instead of ~110 separate OBJ/MTL requests.
//
// Each model is a root node named after its original OBJ path. Its geometry is
// baked into one plain mesh and given its own StandardMaterial with its pack's
// colour-atlas texture, so the result matches what the OBJ
// loader produced (same handedness, UVs and material model) and the existing
// lighting code keeps working unchanged.
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Matrix, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData";
import { MeshoptCompression } from "@babylonjs/core/Meshes/Compression/meshoptCompression";
import { LoadAssetContainerAsync } from "@babylonjs/core/Loading/sceneLoader";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import type { BaseTexture } from "@babylonjs/core/Materials/Textures/baseTexture";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import type { Scene } from "@babylonjs/core/scene";
import type { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import "@babylonjs/loaders/glTF/glTFFileLoader";
import "@babylonjs/loaders/glTF/2.0/glTFLoader";
import "@babylonjs/loaders/glTF/2.0/Extensions/EXT_meshopt_compression";
import "@babylonjs/loaders/glTF/2.0/Extensions/KHR_mesh_quantization";
import { MeshoptDecoder } from "meshoptimizer/decoder";
import coreUrl from "../assets/models/island-core.glb?url";
import propsUrl from "../assets/models/island-props.glb?url";

// Babylon loads the meshopt decoder from its CDN by default. Use the bundled
// copy instead: expose it globally and point the loader at an empty script.
(globalThis as { MeshoptDecoder?: typeof MeshoptDecoder }).MeshoptDecoder = MeshoptDecoder;
MeshoptCompression.Configuration = { decoder: { url: "data:text/javascript," } };

export type ModelPack = "core" | "props";

/**
 * Reads the colour-atlas PNGs embedded in a GLB (named after their model pack
 * by scripts/build-models.mjs) into textures. UVs are glTF-style, so the
 * images are uploaded without a vertical flip, as the glTF loader would.
 */
const readAtlases = (glb: Uint8Array, scene: Scene) => {
  const view = new DataView(glb.buffer, glb.byteOffset, glb.byteLength);
  const jsonLength = view.getUint32(12, true);
  const json = JSON.parse(new TextDecoder().decode(glb.subarray(20, 20 + jsonLength))) as {
    images?: { name?: string; bufferView: number; mimeType: string }[];
    bufferViews: { byteOffset?: number; byteLength: number }[];
  };
  const binStart = 20 + jsonLength + 8;
  const atlases = new Map<string, Texture>();
  json.images?.forEach((image, index) => {
    const bufferView = json.bufferViews[image.bufferView];
    const offset = binStart + (bufferView.byteOffset ?? 0);
    const blob = new Blob([glb.slice(offset, offset + bufferView.byteLength)], { type: image.mimeType });
    const url = URL.createObjectURL(blob);
    const texture = new Texture(url, scene, { noMipmap: false, invertY: false, forcedExtension: ".png" });
    texture.name = image.name ?? `atlas-${index}`;
    texture.onLoadObservable.addOnce(() => URL.revokeObjectURL(url));
    atlases.set(texture.name, texture);
  });
  return atlases;
};

/**
 * Bakes a node's world transform into its vertices. Normals use the inverse
 * transpose (the matrix carries KHR_mesh_quantization's non-uniform
 * dequantisation scale) and are renormalised. The index order is kept: glTF
 * triangles are counter-clockwise, and mirroring them into Babylon's
 * left-handed space turns them clockwise, which is Babylon's front face.
 */
const bakeWorldTransform = (data: VertexData, world: Matrix) => {
  const position = new Vector3();
  const normal = new Vector3();
  if (data.positions) {
    for (let i = 0; i < data.positions.length; i += 3) {
      Vector3.TransformCoordinatesFromFloatsToRef(data.positions[i], data.positions[i + 1], data.positions[i + 2], world, position);
      data.positions[i] = position.x;
      data.positions[i + 1] = position.y;
      data.positions[i + 2] = position.z;
    }
  }
  if (data.normals) {
    const normalMatrix = world.clone().invert().transpose();
    for (let i = 0; i < data.normals.length; i += 3) {
      Vector3.TransformNormalFromFloatsToRef(data.normals[i], data.normals[i + 1], data.normals[i + 2], normalMatrix, normal);
      normal.normalize();
      data.normals[i] = normal.x;
      data.normals[i + 1] = normal.y;
      data.normals[i + 2] = normal.z;
    }
  }
};

type Template = { geometry: VertexData; texture: BaseTexture | null; color: Color3; materialName: string }[];

const PACK_URLS: Record<ModelPack, string> = { core: coreUrl, props: propsUrl };

export type ModelLibrary = {
  /** Fresh, disabled template meshes for a model (one per material), ready to clone. */
  load: (modelPath: string) => Promise<Mesh[]>;
};

export const createModelLibrary = (scene: Scene, packFor: (modelPath: string) => ModelPack): ModelLibrary => {
  const packs = new Map<ModelPack, Promise<Map<string, Template>>>();
  const meshes = new Map<string, Promise<Mesh[]>>();

  const loadPack = (pack: ModelPack) => {
    let pending = packs.get(pack);
    if (pending) return pending;
    pending = (async () => {
      const bytes = new Uint8Array(await (await fetch(PACK_URLS[pack])).arrayBuffer());
      const atlases = readAtlases(bytes, scene);
      // Geometry only: every model uses one white "colormap" material, so
      // glTF materials (and Babylon's PBR code) are skipped entirely.
      const container = await LoadAssetContainerAsync(bytes, scene, {
        pluginExtension: ".glb",
        pluginOptions: { gltf: { createInstances: false, skipMaterials: true } },
      });
      const templates = new Map<string, Template>();
      container.transformNodes
        .filter((node: TransformNode) => node.name.endsWith(".obj"))
        .forEach((node) => {
          const parts: VertexData[] = [];
          node.getChildMeshes(false).forEach((child: AbstractMesh) => {
            if (!(child instanceof Mesh) || !child.getTotalVertices()) return;
            child.computeWorldMatrix(true);
            // World matrix includes glTF's right-to-left-handed root conversion
            // (x mirrored), which is exactly what the OBJ loader applied.
            const data = VertexData.ExtractFromMesh(child, true, true);
            data.colors = null;
            bakeWorldTransform(data, child.getWorldMatrix());
            parts.push(data);
          });
          if (!parts.length) return;
          const [first, ...rest] = parts;
          const packName = node.name.split("/")[0];
          templates.set(node.name, [{
            geometry: rest.length ? first.merge(rest, true) : first,
            texture: atlases.get(packName) ?? atlases.values().next().value ?? null,
            color: Color3.White(),
            materialName: "colormap",
          }]);
        });
      container.dispose();
      return templates;
    })();
    packs.set(pack, pending);
    return pending;
  };

  const load = (modelPath: string) => {
    let pending = meshes.get(modelPath);
    if (pending) return pending;
    pending = loadPack(packFor(modelPath)).then((templates) => {
      const template = templates.get(modelPath);
      if (!template) throw new Error(`Model ${modelPath} is not in the ${packFor(modelPath)} pack. Run npm run build:models.`);
      return template.map(({ geometry, texture, color, materialName }, index) => {
        const mesh = new Mesh(`${modelPath}-template-${index}`, scene);
        geometry.applyToMesh(mesh);
        // One material per model, like the OBJ loader created, so per-model
        // tweaks (window lighting) never leak onto other models.
        const material = new StandardMaterial(`${modelPath}-${materialName}`, scene);
        material.diffuseColor = color.clone();
        material.diffuseTexture = texture;
        mesh.material = material;
        mesh.setEnabled(false);
        return mesh;
      });
    });
    meshes.set(modelPath, pending);
    return pending;
  };

  return { load };
};
