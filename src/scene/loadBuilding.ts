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
  labelMesh?: AbstractMesh;
};

const DEFAULT_SCALES: Record<CityEntity["type"], number> = {
  main: 1,
  decor: 1,
  road: 1,
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

const ICON_COLORS: Record<string, string> = {
  about: "#1fc8c6",
  projects: "#c04bff",
  skills: "#f5c400",
  experience: "#ff8a3c",
  contact: "#4a90ff",
};

const getBounds = (data: {
  min?: Vector3;
  max?: Vector3;
  minimum?: Vector3;
  maximum?: Vector3;
}) => {
  const min = data.min ?? data.minimum ?? null;
  const max = data.max ?? data.maximum ?? null;
  return { min, max };
};

const createIconBubble = (scene: Scene, entryId: string, color: string) => {
  const texture = new DynamicTexture(`${entryId}-bubble-tex`, { width: 256, height: 256 }, scene, false);
  const ctx = texture.getContext();
  if (ctx) {
    ctx.clearRect(0, 0, 256, 256);
    ctx.fillStyle = "#fdfdfd";
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 10;
    const radius = 48;
    const x = 128;
    const y = 110;
    const w = 180;
    const h = 140;
    const left = x - w / 2;
    const top = y - h / 2;
    ctx.beginPath();
    ctx.moveTo(left + radius, top);
    ctx.lineTo(left + w - radius, top);
    ctx.quadraticCurveTo(left + w, top, left + w, top + radius);
    ctx.lineTo(left + w, top + h - radius);
    ctx.quadraticCurveTo(left + w, top + h, left + w - radius, top + h);
    ctx.lineTo(x + 12, top + h);
    ctx.lineTo(x, top + h + 28);
    ctx.lineTo(x - 12, top + h);
    ctx.lineTo(left + radius, top + h);
    ctx.quadraticCurveTo(left, top + h, left, top + h - radius);
    ctx.lineTo(left, top + radius);
    ctx.quadraticCurveTo(left, top, left + radius, top);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(128, 110, 38, 0, Math.PI * 2);
    ctx.fill();
  }
  texture.hasAlpha = true;
  texture.update(false);

  const mat = new StandardMaterial(`${entryId}-bubble-mat`, scene);
  mat.diffuseTexture = texture;
  mat.useAlphaFromDiffuseTexture = true;
  mat.emissiveColor = Color3.White();
  mat.backFaceCulling = false;
  mat.disableLighting = true;
  mat.disableDepthWrite = true;
  return mat;
};

const normalizeMeshScale = (root: TransformNode, meshes: Mesh[], targetFootprint: number) => {
  const validMeshes = meshes.filter((mesh) => mesh.getTotalVertices() > 0);
  if (!validMeshes.length) {
    return;
  }

  validMeshes.forEach((mesh) => mesh.computeWorldMatrix(true));

  const bounds = Mesh.MinMax(validMeshes);
  const { min, max } = getBounds(bounds);
  if (!min || !max) {
    return;
  }

  const footprint = Math.max(
    max.x - min.x,
    max.z - min.z
  );
  const scale = footprint > 0.0001 ? targetFootprint / footprint : 1;
  root.scaling = new Vector3(scale, scale, scale);

  const scaled = Mesh.MinMax(validMeshes);
  const { min: scaledMin } = getBounds(scaled);
  if (!scaledMin) return;
  const bottom = scaledMin.y;
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
  if (entry.isPortfolio !== true) {
    root.setEnabled(false);
    return { entry, root, meshes: [] };
  }
  let meshes: AbstractMesh[] = [];

  try {
    const { root: assetRoot, file } = splitPath(entry.modelPath);
    const result = await SceneLoader.ImportMeshAsync("", assetRoot, file, scene);

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
    mesh.isPickable = entry.type === "main" && entry.isPortfolio === true;
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
  let labelMesh: AbstractMesh | undefined;
  if (entry.type === "main" && meshNodes.length && entry.isPortfolio === true) {
    meshNodes.forEach((mesh) => mesh.computeWorldMatrix(true));
    const bounds = Mesh.MinMax(meshNodes);
    const { min, max } = getBounds(bounds);
    if (!min || !max) {
      return { entry, root, meshes, glowMesh, labelMesh };
    }
    const height = max.y - min.y;
    glowMesh = MeshBuilder.CreatePlane(
      `${entry.id}-glow`,
      { width: requestedScale * 0.7, height: Math.max(1.2, height * 0.2) },
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

    const bubbleSize = requestedScale * 0.3;
    const bubble = MeshBuilder.CreatePlane(`${entry.id}-bubble`, { width: bubbleSize, height: bubbleSize }, scene);
    bubble.billboardMode = Mesh.BILLBOARDMODE_Y;
    bubble.parent = root;
    bubble.position.y = height * 0.4 + requestedScale * 0.2;
    bubble.rotation.z = Math.PI;
    bubble.isPickable = entry.isPortfolio === true;
    assignMetadata(bubble, entry.id);
    bubble.renderingGroupId = 2;
    const bubbleColor = ICON_COLORS[entry.key] ?? "#4a90ff";
    bubble.material = createIconBubble(scene, entry.id, bubbleColor);
    labelMesh = bubble;
  }

  return { entry, root, meshes, glowMesh, labelMesh };
};
