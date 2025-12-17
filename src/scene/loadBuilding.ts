import {
  AbstractMesh,
  Color3,
  DynamicTexture,
  Mesh,
  MeshBuilder,
  Scene,
  SceneLoader,
  ShadowGenerator,
  StandardMaterial,
  TransformNode,
  Vector3,
} from "@babylonjs/core";
import "@babylonjs/loaders/OBJ/objFileLoader";
import type { CityEntity } from "../data/cityLayout";
import { ASSET_BASE_URL } from "../config";

export type LoadedBuilding = {
  entry: CityEntity;
  root: TransformNode;
  meshes: AbstractMesh[];
  glowMesh?: AbstractMesh;
};

const UNIFORM_BUILDING_SCALE = 4.4;
const DEFAULT_SCALES: Record<CityEntity["type"], number> = {
  main: UNIFORM_BUILDING_SCALE,
  decor: UNIFORM_BUILDING_SCALE,
  road: UNIFORM_BUILDING_SCALE * 0.4,
};

const splitPath = (modelPath: string) => {
  const sanitized = modelPath.replace(/^\/+/, "");
  const lastSlash = sanitized.lastIndexOf("/");
  if (lastSlash === -1) {
    return { root: ASSET_BASE_URL, file: sanitized };
  }
  const root = `${ASSET_BASE_URL}${sanitized.slice(0, lastSlash + 1)}`;
  const file = sanitized.slice(lastSlash + 1);
  return { root, file };
};

const ensureMaterial = (mesh: AbstractMesh, scene: Scene) => {
  if (mesh.material) return;
  const mat = new StandardMaterial(`${mesh.name}-mat`, scene);
  mat.diffuseColor = Color3.FromHexString("#8ea4d2");
  mat.specularColor = Color3.Black();
  mat.alpha = 0.98;
  mesh.material = mat;
};

const assignMetadata = (mesh: AbstractMesh, entryId: string) => {
  const existing = mesh.metadata ?? {};
  mesh.metadata = { ...existing, cityEntryId: entryId };
};

const normalizeMeshScale = (root: TransformNode, meshes: Mesh[], targetFootprint: number) => {
  const validMeshes = meshes.filter((mesh) => mesh.getTotalVertices() > 0);
  if (!validMeshes.length) {
    return;
  }

  validMeshes.forEach((mesh) => mesh.computeWorldMatrix(true));

  const bounds = Mesh.MinMax(validMeshes);
  if (!bounds.minimum || !bounds.maximum) {
    return;
  }

  const footprint = Math.max(
    bounds.maximum.x - bounds.minimum.x,
    bounds.maximum.z - bounds.minimum.z
  );
  const scale = footprint > 0.0001 ? targetFootprint / footprint : 1;
  root.scaling = new Vector3(scale, scale, scale);

  const scaled = Mesh.MinMax(validMeshes);
  if (!scaled.minimum) return;
  const bottom = scaled.minimum.y;
  root.position.y -= bottom;
};

const createFallbackMesh = (
  scene: Scene,
  entry: CityEntity,
  root: TransformNode
): AbstractMesh[] => {
  const body = MeshBuilder.CreateBox(`${entry.id}-fallback`, { size: 2 }, scene);
  body.parent = root;
  body.position.y = 1;
  const mat = new StandardMaterial(`${entry.id}-fallback-mat`, scene);
  mat.diffuseColor = Color3.FromHexString("#d26464");
  mat.specularColor = Color3.Black();
  body.material = mat;

  const labelPlane = MeshBuilder.CreatePlane(
    `${entry.id}-label`,
    { width: 2.4, height: 0.9 },
    scene
  );
  labelPlane.parent = root;
  labelPlane.position.y = 2.3;
  labelPlane.billboardMode = Mesh.BILLBOARDMODE_Y;

  const texture = new DynamicTexture(`${entry.id}-label-text`, { width: 256, height: 128 }, scene);
  texture.drawText(
    entry.name,
    null,
    84,
    "bold 32px 'Space Grotesk', sans-serif",
    "#ffffff",
    "#00000066",
    true,
    true
  );
  const labelMaterial = new StandardMaterial(`${entry.id}-label-mat`, scene);
  labelMaterial.diffuseTexture = texture;
  labelMaterial.emissiveColor = Color3.White();
  labelPlane.material = labelMaterial;

  return [body, labelPlane];
};

export const loadBuilding = async (
  scene: Scene,
  entry: CityEntity,
  shadowGenerator: ShadowGenerator
): Promise<LoadedBuilding> => {
  const root = new TransformNode(`${entry.id}-root`, scene);
  root.rotationQuaternion = null;
  let meshes: AbstractMesh[] = [];

  try {
    const { root, file } = splitPath(entry.modelPath);
    const result = await SceneLoader.ImportMeshAsync("", root, file, scene);

    meshes = result.meshes.filter(
      (mesh): mesh is AbstractMesh => mesh instanceof AbstractMesh
    );

    if (!meshes.length) {
      meshes = createFallbackMesh(scene, entry, root);
    }
  } catch (error) {
    console.warn(`Failed to load ${entry.name} (${entry.modelPath}). Using fallback.`, error);
    meshes = createFallbackMesh(scene, entry, root);
  }

  meshes.forEach((mesh, index) => {
    mesh.parent = root;
    mesh.alwaysSelectAsActiveMesh = entry.type === "main";
    mesh.isPickable = entry.type === "main";
    mesh.receiveShadows = true;
    mesh.name ||= `${entry.id}-mesh-${index}`;
    ensureMaterial(mesh, scene);
    assignMetadata(mesh, entry.id);
    shadowGenerator.addShadowCaster(mesh);
  });

  const meshNodes = meshes.filter((m): m is Mesh => m instanceof Mesh);
  const baseTarget = DEFAULT_SCALES[entry.type];
  const requestedScale = entry.targetScale ?? baseTarget;
  const extraScale = baseTarget > 0 ? requestedScale / baseTarget : 1;
  normalizeMeshScale(root, meshNodes, baseTarget);
  root.scaling = root.scaling.scale(extraScale);

  root.position.x = entry.position.x;
  root.position.z = entry.position.z;
  root.rotation.y = entry.rotation?.y ?? 0;

  let glowMesh: AbstractMesh | undefined;
  if (entry.type === "main" && meshNodes.length) {
    meshNodes.forEach((mesh) => mesh.computeWorldMatrix(true));
    const bounds = Mesh.MinMax(meshNodes);
    if (!bounds.minimum || !bounds.maximum) {
      return { entry, root, meshes, glowMesh };
    }
    const height = bounds.maximum.y - bounds.minimum.y;
    glowMesh = MeshBuilder.CreatePlane(
      `${entry.id}-glow`,
      { width: desiredScale * 0.7, height: Math.max(1.2, height * 0.2) },
      scene
    );
    glowMesh.billboardMode = Mesh.BILLBOARDMODE_Y;
    glowMesh.parent = root;
    glowMesh.position.y = height * 0.6 + 0.6;
    glowMesh.isPickable = false;
    const glowMaterial = new StandardMaterial(`${entry.id}-glow-mat`, scene);
    glowMaterial.emissiveColor = Color3.FromHexString("#ffde85");
    glowMaterial.alpha = 0.8;
    glowMesh.material = glowMaterial;
    glowMesh.isVisible = false;
  }

  return { entry, root, meshes, glowMesh };
};
