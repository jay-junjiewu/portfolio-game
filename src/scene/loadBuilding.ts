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
import { CITY_TILE_SIZE, type CityEntity } from "../data/cityLayout";
import { PANEL_TITLES } from "../data/portfolioData";
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
  about: "#006B6A",
  projects: "#5A00A8",
  skills: "#6E5600",
  experience: "#8F2F00",
  contact: "#0046B8"
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

const createIconBubble = (
  scene: Scene,
  entryId: string,
  color: string,
  label: string
) => {
  const texture = new DynamicTexture(
    `${entryId}-bubble-tex`,
    { width: 256, height: 256 },
    scene,
    false
  );
  const ctx = texture.getContext() as CanvasRenderingContext2D | null;
  let measured = 0;
  if (ctx) {
    ctx.clearRect(0, 0, 256, 256);
    ctx.save();
    ctx.translate(256, 0);
    ctx.scale(-1, 1);
    ctx.font = "bold 40px 'Space Grotesk', sans-serif";
    measured = ctx.measureText(label).width;
    const bubbleWidth = Math.min(240, measured + 60);
    const bubbleHeight = 138;
    const radius = 40;
    const x = 128;
    const y = 110;
    const left = x - bubbleWidth / 2;
    const top = y - bubbleHeight / 2;

    ctx.fillStyle = "#fdfdfd";
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(left + radius, top);
    ctx.lineTo(left + bubbleWidth - radius, top);
    ctx.quadraticCurveTo(left + bubbleWidth, top, left + bubbleWidth, top + radius);
    ctx.lineTo(left + bubbleWidth, top + bubbleHeight - radius);
    ctx.quadraticCurveTo(left + bubbleWidth, top + bubbleHeight, left + bubbleWidth - radius, top + bubbleHeight);
    ctx.lineTo(x + 10, top + bubbleHeight);
    ctx.lineTo(x, top + bubbleHeight + 22);
    ctx.lineTo(x - 10, top + bubbleHeight);
    ctx.lineTo(left + radius, top + bubbleHeight);
    ctx.quadraticCurveTo(left, top + bubbleHeight, left, top + bubbleHeight - radius);
    ctx.lineTo(left, top + radius);
    ctx.quadraticCurveTo(left, top, left + radius, top);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, x, y);
    ctx.restore();
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
  return { mat, measured };
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
    "bold 56px 'Space Grotesk', sans-serif",
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

  const halfTile = CITY_TILE_SIZE / 2;
  root.position.x = entry.position.x + halfTile;
  root.position.y = entry.position.y ?? 0;
  root.position.z = entry.position.z + halfTile;
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
    glowMaterial.alpha = 0.0;
    glowMesh.material = glowMaterial;
    glowMesh.isVisible = false;

    const bubbleColor = ICON_COLORS[entry.key] ?? "#4a90ff";
    const labelText = PANEL_TITLES[entry.key] ?? entry.name;
    const { mat: bubbleMat, measured } = createIconBubble(
      scene,
      entry.id,
      bubbleColor,
      labelText
    );
    const minWorldWidth = Math.max(0.9, requestedScale * 0.45);
    const worldWidth = Math.min(2.4, Math.max(minWorldWidth, (measured / 256) * 1.8));
    const worldHeight = worldWidth * 0.84;
    const bubble = MeshBuilder.CreatePlane(
      `${entry.id}-bubble`,
      { width: worldWidth, height: worldHeight },
      scene
    );
    bubble.billboardMode = Mesh.BILLBOARDMODE_Y;
    bubble.parent = root;
    bubble.position.y = height * 0.4 + requestedScale * 0.2;
    bubble.rotation.z = Math.PI;
    bubble.isPickable = entry.isPortfolio === true;
    assignMetadata(bubble, entry.id);
    bubble.renderingGroupId = 2;
    bubble.material = bubbleMat;
    labelMesh = bubble;
  }

  return { entry, root, meshes, glowMesh, labelMesh };
};
