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
import { prefersReducedMotion } from "../utils/device";

export type LoadedBuilding = {
  entry: CityEntity;
  root: TransformNode;
  meshes: AbstractMesh[];
  glowMesh?: AbstractMesh;
  labelMesh?: AbstractMesh;
};

/**
 * A single building waiting to "grow in" during the intro reveal. The node is
 * pre-set to a hidden start state (scale 0, raised Y) inside loadBuilding; the
 * reveal observer in createScene advances these each frame and removes them
 * once finished. Position-Y settling is skipped for animated decor (cars),
 * whose looping observer owns root.position every frame.
 */
export type RevealEntry = {
  root: TransformNode;
  finalScaling: Vector3;
  finalY: number;
  raisedY: number;
  /** Stagger delay (ms) measured from when the node was queued. */
  delay: number;
  /** When true, only scale is tweened; the raised Y is not applied/settled. */
  scaleOnly: boolean;
  /** performance.now() at queue time; reveal starts after queuedAt + delay. */
  queuedAt: number;
};

/**
 * Module-level queue of buildings awaiting their intro reveal. createScene
 * drains this via a single onBeforeRenderObservable. Empty when reduced motion
 * is requested (loadBuilding never enqueues in that case).
 */
export const revealQueue: RevealEntry[] = [];

export type ModelCache = Map<string, Promise<Mesh[]>>;

export const createModelCache = (): ModelCache => new Map();

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

const BUBBLE_TEXTURE_SCALE = 4;
const BUBBLE_TEXTURE_SIZE = 256 * BUBBLE_TEXTURE_SCALE;

const createIconBubble = (
  scene: Scene,
  entryId: string,
  color: string,
  label: string
) => {
  const texture = new DynamicTexture(
    `${entryId}-bubble-tex`,
    { width: BUBBLE_TEXTURE_SIZE, height: BUBBLE_TEXTURE_SIZE },
    scene,
    false
  );
  const ctx = texture.getContext() as CanvasRenderingContext2D | null;
  let measured = 0;
  if (ctx) {
    ctx.clearRect(0, 0, BUBBLE_TEXTURE_SIZE, BUBBLE_TEXTURE_SIZE);
    ctx.save();
    ctx.translate(BUBBLE_TEXTURE_SIZE, 0);
    ctx.scale(-1, 1);
    ctx.font = `bold ${40 * BUBBLE_TEXTURE_SCALE}px 'Space Grotesk', sans-serif`;
    measured = ctx.measureText(label).width;
    const bubbleWidth = Math.min(240 * BUBBLE_TEXTURE_SCALE, measured + 60 * BUBBLE_TEXTURE_SCALE);
    const bubbleHeight = 138 * BUBBLE_TEXTURE_SCALE;
    const radius = 40 * BUBBLE_TEXTURE_SCALE;
    const x = 128 * BUBBLE_TEXTURE_SCALE;
    const y = 110 * BUBBLE_TEXTURE_SCALE;
    const left = x - bubbleWidth / 2;
    const top = y - bubbleHeight / 2;

    ctx.fillStyle = "#fdfdfd";
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 9 * BUBBLE_TEXTURE_SCALE;
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

/** Vertical lift (world units) a building drops from as it grows in. */
const REVEAL_RAISE = 6;

/**
 * Capture the node's finalized scaling/position, snap it to a hidden start
 * state (scale 0, raised Y) and enqueue it for the intro reveal. No-op under
 * reduced motion — the node is left fully placed so it appears instantly.
 * Called only once the root transform (and any child meshes) are finalized.
 */
const queueReveal = (root: TransformNode, entry: CityEntity, delay: number) => {
  if (prefersReducedMotion()) return;
  const finalScaling = root.scaling.clone();
  const finalY = root.position.y;
  // Cars (animated decor) have their root.position rewritten every frame by the
  // looping decor observer, so only their scale can be tweened here.
  const scaleOnly = !!entry.animation && entry.animation.type === "sequence";
  const raisedY = scaleOnly ? finalY : finalY + REVEAL_RAISE;
  root.scaling = Vector3.Zero();
  if (!scaleOnly) {
    root.position.y = raisedY;
  }
  revealQueue.push({
    root,
    finalScaling,
    finalY,
    raisedY,
    delay,
    scaleOnly,
    queuedAt: performance.now(),
  });
};

const loadModelTemplate = (
  scene: Scene,
  cache: ModelCache,
  modelPath: string
): Promise<Mesh[]> => {
  let cached = cache.get(modelPath);
  if (cached) return cached;
  const { root: assetRoot, file } = splitPath(modelPath);
  cached = SceneLoader.LoadAssetContainerAsync(assetRoot, file, scene).then(
    (container) => {
      const templateMeshes = container.meshes.filter(
        (m): m is Mesh => m instanceof Mesh && m.getTotalVertices() > 0
      );
      templateMeshes.forEach((m) => {
        ensureMaterial(m, scene);
        m.setEnabled(false);
      });
      return templateMeshes;
    }
  );
  cache.set(modelPath, cached);
  return cached;
};

export const loadBuilding = async (
  scene: Scene,
  entry: CityEntity,
  shadowGenerator: ShadowGenerator,
  modelCache: ModelCache,
  revealDelay = 0
): Promise<LoadedBuilding> => {
  const root = new TransformNode(`${entry.id}-root`, scene);
  root.rotationQuaternion = null;
  const isPortfolio = entry.isPortfolio !== false;
  if (!isPortfolio) {
    root.setEnabled(false);
    return { entry, root, meshes: [] };
  }
  let meshes: AbstractMesh[] = [];

  try {
    const template = await loadModelTemplate(scene, modelCache, entry.modelPath);
    meshes = template
      .map((source, index) => {
        const clone = source.clone(`${entry.id}-mesh-${index}`, null, true);
        if (!clone) return null;
        clone.setEnabled(true);
        return clone as AbstractMesh;
      })
      .filter((m): m is AbstractMesh => m !== null);

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
    mesh.isPickable = entry.type === "main" && isPortfolio;
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
  if (entry.type === "main" && meshNodes.length && isPortfolio) {
    meshNodes.forEach((mesh) => mesh.computeWorldMatrix(true));
    const bounds = Mesh.MinMax(meshNodes);
    const { min, max } = getBounds(bounds);
    if (!min || !max) {
      queueReveal(root, entry, revealDelay);
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
    const worldWidth = Math.min(
      2.4,
      Math.max(minWorldWidth, (measured / BUBBLE_TEXTURE_SIZE) * 1.8)
    );
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
    bubble.isPickable = isPortfolio;
    assignMetadata(bubble, entry.id);
    bubble.renderingGroupId = 2;
    bubble.material = bubbleMat;
    labelMesh = bubble;
  }

  queueReveal(root, entry, revealDelay);
  return { entry, root, meshes, glowMesh, labelMesh };
};
