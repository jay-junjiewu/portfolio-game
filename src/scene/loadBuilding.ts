import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import { ImageProcessingConfiguration } from "@babylonjs/core/Materials/imageProcessingConfiguration";
import type { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData";
import type { Scene } from "@babylonjs/core/scene";
import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";
import type { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Matrix, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Viewport } from "@babylonjs/core/Maths/math.viewport";
import "@babylonjs/loaders/OBJ/objFileLoader";
import { CITY_TILE_SIZE, type CityEntity } from "../data/cityLayout";
import { PANEL_TITLES } from "../data/portfolioData";
import { ASSET_BASE_URL } from "../config";
import { prefersReducedMotion } from "../utils/device";
import {
  CITY_ASPHALT_WIDTH, CITY_ROAD_WIDTH, getCityRoadPlan, mapCityHeading, mapCityPoint,
  mapCityRoadHeading, mapCityRoadPoint, type CityRoadSample,
} from "./cityTerrain";

export type LoadedBuilding = {
  entry: CityEntity;
  root: TransformNode;
  meshes: AbstractMesh[];
  glowMesh?: AbstractMesh;
  labelMesh?: AbstractMesh;
  labelAnchor?: Vector3;
  labelAspect?: number;
  setLabelDayMode?: (isDay: boolean) => void;
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

// Kenney's building atlas uses the pale-blue swatch (UV u=.71875) for glazing. Lighting that
// swatch keeps windows warm at night while the walls and roofs retain shading.
const addWindowLighting = (mesh: Mesh, modelPath: string, scene: Scene) => {
  if (!/^(commerical|suburban|industrial)-models\/.*building/.test(modelPath)) return;
  const mat = mesh.material;
  if (!(mat instanceof StandardMaterial) || !mat.diffuseTexture) return;
  let mask = scene.getTextureByName("city-window-emission") as DynamicTexture | null;
  if (!mask) {
    mask = new DynamicTexture("city-window-emission", { width: 512, height: 512 }, scene, false);
    const ctx = mask.getContext();
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, 512, 512);
    ctx.fillStyle = "#ffb65e";
    ctx.fillRect(320, 128, 64, 128);
    mask.update();
  }
  mat.emissiveTexture = mask;
  mat.useEmissiveAsIllumination = true;
  mat.metadata = { ...mat.metadata, cityWindowLighting: true };
};

const assignMetadata = (mesh: AbstractMesh, entryId: string) => {
  const existing = mesh.metadata ?? {};
  mesh.metadata = { ...existing, cityEntryId: entryId };
};

const ICON_COLORS: Record<string, string> = {
  about: "#a9d9c3",
  projects: "#c7b4ed",
  skills: "#edd390",
  experience: "#ecc09f",
  contact: "#9acbe7"
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
  const textureHeight = 160;
  const font = '600 64px system-ui, sans-serif';
  const edgeInset = 7;
  const horizontalPadding = 32;
  const dotRadius = 11;
  const dotGap = 24;
  const dotX = edgeInset + horizontalPadding + dotRadius;
  const textX = dotX + dotRadius + dotGap;
  const texture = new DynamicTexture(`${entryId}-bubble-tex`, { width: 512, height: textureHeight }, scene, true);
  const ctx = texture.getContext() as CanvasRenderingContext2D;
  ctx.font = font;
  // The same inset surrounds the dot/text group; short labels have no width floor.
  const width = Math.ceil(textX + ctx.measureText(label).width + horizontalPadding + edgeInset);
  texture.scaleTo(width, textureHeight);
  texture.hasAlpha = true;
  const nightAccent = Color3.Lerp(Color3.FromHexString(color), Color3.FromHexString('#aecbfa'), .45).toHexString();
  let currentDayMode: boolean | undefined;
  const setDayMode = (isDay: boolean) => {
    if (currentDayMode === isDay) return;
    currentDayMode = isDay;
    ctx.clearRect(0, 0, width, textureHeight);
    ctx.fillStyle = isDay ? 'rgba(246, 240, 226, .98)' : 'rgba(25, 47, 73, .97)';
    ctx.beginPath();
    ctx.roundRect(edgeInset, 9, width - edgeInset * 2, 142, 71);
    ctx.fill();
    ctx.strokeStyle = isDay ? 'rgba(141, 120, 89, .7)' : 'rgba(153, 189, 235, .7)';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.fillStyle = isDay ? '#927b5b' : nightAccent;
    ctx.beginPath();
    ctx.arc(dotX, 80, dotRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = isDay ? '#3c352c' : '#eaf2ff';
    ctx.font = font;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, textX, 82);
    texture.update();
  };
  const mat = new StandardMaterial(`${entryId}-bubble-mat`, scene);
  mat.diffuseTexture = texture;
  mat.useAlphaFromDiffuseTexture = true;
  mat.emissiveColor = Color3.White();
  mat.backFaceCulling = false;
  mat.disableLighting = true;
  mat.disableDepthWrite = true;
  mat.fogEnabled = false;
  const labelProcessing = new ImageProcessingConfiguration();
  labelProcessing.isEnabled = false;
  mat.imageProcessingConfiguration = labelProcessing;
  mat.onDisposeObservable.add(() => texture.dispose());
  setDayMode(true);
  return { material: mat, aspect: width / textureHeight, setDayMode };
};

/** Keep the five roof labels readable when the city is viewed from far away. */
export const setupBuildingLabels = (
  scene: Scene, camera: ArcRotateCamera, canvas: HTMLCanvasElement, buildings: LoadedBuilding[],
) => {
  const labels = buildings.filter(building => building.labelMesh && building.labelAnchor).map(building => {
    const stem = MeshBuilder.CreateLines(`${building.entry.id}-label-stem`, {
      points: [building.labelAnchor!.clone(), building.labelAnchor!.clone()], updatable: true,
      useVertexAlpha: true,
    }, scene);
    stem.color = Color3.FromHexString('#cee2da');
    stem.alpha = .55;
    stem.isPickable = false;
    stem.renderingGroupId = 2;
    stem.alphaIndex = 0;
    stem.alwaysSelectAsActiveMesh = true;
    stem.applyFog = false;
    stem.material!.disableDepthWrite = true;
    return { building, stem };
  });
  const identity = Matrix.Identity();
  const observer = scene.onBeforeCameraRenderObservable.add(activeCamera => {
    if (activeCamera !== camera) return;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (!width || !height) return;
    const viewport = new Viewport(0, 0, width, height);
    const compact = width < 600;
    const pillHeight = compact ? 30 : 32;
    const margin = 12;
    const occupied: { x: number; y: number; width: number; height: number }[] = [];
    for (const { building, stem } of labels) {
      const bubble = building.labelMesh!;
      const anchor = building.labelAnchor!;
      const point = Vector3.Project(anchor, identity, scene.getTransformMatrix(), viewport);
      const depth = Vector3.TransformCoordinates(anchor, camera.getViewMatrix()).z;
      const inView = depth > camera.minZ && point.x > -30 && point.x < width + 30 && point.y > 50 && point.y < height - 45;
      bubble.visibility = inView ? 1 : 0;
      stem.isVisible = false;
      if (!bubble.isVisible || !inView) continue;
      const pillWidth = pillHeight * (building.labelAspect ?? 3);
      const desired = { x: point.x, y: point.y - pillHeight / 2 - 9 };
      let chosen = { ...desired };
      let bestScore = Infinity;
      // A small fixed candidate set avoids stacked labels without a HUD panel.
      for (const row of [0, -1, 1, -2, 2, -3, 3]) {
        for (const column of [0, -1, 1]) {
          const x = Math.max(margin + pillWidth / 2, Math.min(width - margin - pillWidth / 2, desired.x + column * (pillWidth * .7 + 8)));
          const y = Math.max(90 + pillHeight / 2, Math.min(height - 78 - pillHeight / 2, desired.y + row * (pillHeight + 7)));
          const overlaps = occupied.some(other => Math.abs(x - other.x) < (pillWidth + other.width) / 2 + 6 && Math.abs(y - other.y) < pillHeight + 6);
          if (overlaps) continue;
          const score = (x - desired.x) ** 2 + (y - desired.y) ** 2;
          if (score < bestScore) { bestScore = score; chosen = { x, y }; }
        }
      }
      occupied.push({ ...chosen, width: pillWidth, height: pillHeight });
      bubble.position.copyFrom(Vector3.Unproject(new Vector3(chosen.x, chosen.y, point.z), width, height, identity, camera.getViewMatrix(), camera.getProjectionMatrix()));
      const unitsPerPixel = 2 * depth * Math.tan(camera.fov / 2) / height;
      bubble.scaling.set(pillWidth * unitsPerPixel, pillHeight * unitsPerPixel, 1);
      bubble.computeWorldMatrix(true);
      if (Math.hypot(chosen.x - point.x, chosen.y - point.y) > pillHeight / 2 + 6) {
        const edgeY = chosen.y + Math.sign(point.y - chosen.y) * pillHeight / 2;
        const end = Vector3.Unproject(new Vector3(chosen.x, edgeY, point.z), width, height, identity, camera.getViewMatrix(), camera.getProjectionMatrix());
        MeshBuilder.CreateLines(stem.name, { points: [anchor, end], instance: stem });
        stem.isVisible = true;
      }
    }
  });
  return () => {
    scene.onBeforeCameraRenderObservable.remove(observer);
    labels.forEach(({ stem }) => stem.dispose());
  };
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
        addWindowLighting(m, modelPath, scene);
        m.setEnabled(false);
      });
      return templateMeshes;
    }
  );
  cache.set(modelPath, cached);
  return cached;
};

/** Constant-width pavement follows connected centerlines instead of scaling a tile. */
const createCityRoad = (scene: Scene, entry: CityEntity, root: TransformNode): Mesh[] | undefined => {
  const plan = getCityRoadPlan(entry.position.x + CITY_TILE_SIZE / 2, entry.position.z + CITY_TILE_SIZE / 2);
  if (!plan) return undefined;
  root.position.set(plan.center.x, 0, plan.center.z);
  const roadMaterial = (name: string, color: string) => {
    const existing = scene.getMaterialByName(name);
    if (existing instanceof StandardMaterial) return existing;
    const material = new StandardMaterial(name, scene);
    material.diffuseColor = Color3.FromHexString(color);
    material.specularColor = Color3.Black();
    return material;
  };
  const pavement = roadMaterial('city-road-pavement', '#b7b5a7');
  const asphalt = roadMaterial('city-road-asphalt', '#59646a');
  const paint = roadMaterial('city-road-markings', '#e9e6d3');
  // The phone overview is far enough away that these thin physical layers
  // share depth-buffer values. Bias their raster depth rather than raising
  // the whole road out of the meadow; the bias shrinks in world space on zoom.
  pavement.zOffsetUnits = -1;
  asphalt.zOffsetUnits = -3;
  paint.zOffsetUnits = -5;
  type Geometry = { positions: number[]; normals: number[]; uvs: number[]; indices: number[] };
  const geometry = (): Geometry => ({ positions: [], normals: [], uvs: [], indices: [] });
  const pavementData = geometry();
  const asphaltData = geometry();
  const markingData = geometry();
  const appendVertex = (data: Geometry, x: number, y: number, z: number) => {
    data.positions.push(x - plan.center.x, y, z - plan.center.z);
    data.normals.push(0, 1, 0);
    data.uvs.push(x / 4, z / 4);
  };
  const ribbon = (data: Geometry, path: CityRoadSample[], width: number, y: number) => {
    const start = data.positions.length / 3;
    for (const point of path) {
      const nx = point.tangentZ * width / 2;
      const nz = -point.tangentX * width / 2;
      appendVertex(data, point.x + nx, y, point.z + nz);
      appendVertex(data, point.x - nx, y, point.z - nz);
    }
    for (let index = 0; index < path.length - 1; index += 1) {
      const base = start + index * 2;
      data.indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
    }
  };
  const disc = (data: Geometry, radius: number, y: number) => {
    const start = data.positions.length / 3;
    appendVertex(data, plan.center.x, y, plan.center.z);
    for (let index = 0; index <= 40; index += 1) {
      const angle = index / 40 * Math.PI * 2;
      appendVertex(data, plan.center.x + Math.cos(angle) * radius, y, plan.center.z + Math.sin(angle) * radius);
    }
    for (let index = 0; index < 40; index += 1) data.indices.push(start, start + index + 2, start + index + 1);
  };
  const stripe = (point: CityRoadSample, lateral: number, width: number, length: number) => {
    const start = markingData.positions.length / 3;
    for (const [forward, side] of [[-1, 1], [-1, -1], [1, 1], [1, -1]]) {
      const across = lateral + side * width / 2;
      appendVertex(markingData,
        point.x + point.tangentX * forward * length / 2 + point.tangentZ * across,
        -.015,
        point.z + point.tangentZ * forward * length / 2 - point.tangentX * across,
      );
    }
    markingData.indices.push(start, start + 1, start + 2, start + 1, start + 3, start + 2);
  };
  for (const path of plan.paths) {
    // Pavement stays beneath every asphalt arm, so intersecting strips cannot
    // leave stray sidewalk bands across the center of a junction.
    ribbon(pavementData, path, CITY_ROAD_WIDTH, -.028);
    ribbon(asphaltData, path, CITY_ASPHALT_WIDTH, -.02);
    if (plan.intersection) {
      const crossing = path[Math.round((path.length - 1) * .76)];
      for (let stripeIndex = -3; stripeIndex <= 3; stripeIndex += 1) {
        stripe(crossing, stripeIndex * .37, .22, .56);
      }
    } else if (!plan.fillCenter) {
      const middle = Math.floor(path.length / 2);
      ribbon(markingData, path.slice(middle - 1, middle + 2), .075, -.015);
    }
  }
  if (plan.fillCenter) {
    disc(pavementData, CITY_ROAD_WIDTH / 2, -.028);
    disc(asphaltData, CITY_ASPHALT_WIDTH / 2, -.02);
  }
  const meshes: Mesh[] = [];
  for (const [name, data, material] of [
    ['pavement', pavementData, pavement], ['asphalt', asphaltData, asphalt], ['markings', markingData, paint],
  ] as const) {
    if (!data.indices.length) continue;
    const mesh = new Mesh(`${entry.id}-${name}`, scene);
    const vertices = new VertexData();
    vertices.positions = data.positions;
    vertices.normals = data.normals;
    vertices.uvs = data.uvs;
    // Babylon's default left-handed scene treats clockwise triangles as the
    // front face. Keep the explicit lighting normals pointing toward the sky.
    for (let index = 0; index < data.indices.length; index += 3) {
      [data.indices[index + 1], data.indices[index + 2]] = [data.indices[index + 2], data.indices[index + 1]];
    }
    vertices.indices = data.indices;
    vertices.applyToMesh(mesh);
    mesh.material = material;
    mesh.parent = root;
    mesh.isPickable = false;
    mesh.receiveShadows = true;
    assignMetadata(mesh, entry.id);
    meshes.push(mesh);
  }
  return meshes;
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
  if (entry.type === 'road') {
    const roadMeshes = createCityRoad(scene, entry, root);
    if (roadMeshes) return { entry, root, meshes: roadMeshes };
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
    if (entry.type !== "road") shadowGenerator.addShadowCaster(mesh);
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

  {
    const x = root.position.x;
    const z = root.position.z;
    const isVehicle = entry.modelPath.startsWith('car-models/') && !/\/box\.obj$/.test(entry.modelPath);
    const mapped = isVehicle ? mapCityRoadPoint(x, z) : mapCityPoint(x, z);
    root.position.x = mapped.x;
    root.position.z = mapped.z;
    root.rotation.y = isVehicle ? mapCityRoadHeading(x, z, root.rotation.y) : mapCityHeading(x, z, root.rotation.y);
  }

  let glowMesh: AbstractMesh | undefined;
  let labelMesh: AbstractMesh | undefined;
  let labelAnchor: Vector3 | undefined;
  let labelAspect: number | undefined;
  let setLabelDayMode: ((isDay: boolean) => void) | undefined;
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

    const bubbleColor = ICON_COLORS[entry.key] ?? "#a9d9c3";
    const labelText = PANEL_TITLES[entry.key] ?? entry.name;
    const bubbleMat = createIconBubble(scene, entry.id, bubbleColor, labelText);
    const bubble = MeshBuilder.CreatePlane(
      `${entry.id}-bubble`,
      { width: 1, height: 1 },
      scene
    );
    bubble.billboardMode = Mesh.BILLBOARDMODE_ALL;
    labelAnchor = new Vector3(root.position.x, max.y + .4, root.position.z);
    labelAspect = bubbleMat.aspect;
    setLabelDayMode = bubbleMat.setDayMode;
    bubble.position.copyFrom(labelAnchor);
    bubble.isPickable = isPortfolio;
    assignMetadata(bubble, entry.id);
    bubble.renderingGroupId = 2;
    bubble.alphaIndex = 1;
    bubble.applyFog = false;
    bubble.material = bubbleMat.material;
    labelMesh = bubble;
  }

  queueReveal(root, entry, revealDelay);
  return { entry, root, meshes, glowMesh, labelMesh, labelAnchor, labelAspect, setLabelDayMode };
};
