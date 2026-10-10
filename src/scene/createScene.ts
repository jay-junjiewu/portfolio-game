import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import type { Engine } from "@babylonjs/core/Engines/engine";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { PointerEventTypes } from "@babylonjs/core/Events/pointerEvents";
import { Scalar } from "@babylonjs/core/Maths/math.scalar";
import { Scene } from "@babylonjs/core/scene";
import { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { GlowLayer } from "@babylonjs/core/Layers/glowLayer";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { KeyboardEventTypes } from "@babylonjs/core/Events/keyboardEvents";
// ShadowGenerator's render hook lives in a separate scene component that the
// barrel import used to register implicitly; pull it in so shadows still draw.
import "@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent";
import { CITY_TILE_SIZE, type BuildingKey, type AnimationSequence } from "../data/cityLayout";
import { ISLAND_LAYOUT as CITY_LAYOUT } from "../data/islandLayout";
import { createIslandEnvironment } from "./islandEnvironment";
import { createDistrictDetails } from "./districtDetails";
import { configureCityRoads, mapCityRoadHeading, mapCityRoadPoint } from "./cityTerrain";
import { createAtmosphere } from "./atmosphere";
import type { LoadedBuilding, RevealEntry } from "./loadBuilding";
import { createModelCache, loadBuilding, revealQueue, setupBuildingLabels } from "./loadBuilding";
import { setupPicking } from "./picking";
import { isMobileDevice, prefersReducedMotion } from "../utils/device";

export type SceneCallbacks = {
  onBuildingSelect: (key: BuildingKey | null) => void;
  onAssetsLoaded?: () => void;
  onAllAssetsLoaded?: () => void;
};

export type SceneControls = {
  scene: Scene;
  resetCamera: () => void;
  focusOnPoint: (x: number, z: number, radius?: number) => void;
  zoomCamera: (delta: number) => void;
  setPhotoMode: (enabled: boolean) => void;
  setDayMode: (isDay: boolean) => void;
  setCameraOrbit: (alpha: number, beta: number) => void;
  focusOnBuilding: (key: BuildingKey | null) => void;
  startCameraTour: (onComplete?: () => void) => () => void;
  dispose: () => void;
};

const setupCamera = (scene: Scene, canvas: HTMLCanvasElement) => {
  const target = new Vector3(2, -5, 2);
  const isMobile = isMobileDevice();
  const aspect = canvas.clientWidth / Math.max(1, canvas.clientHeight);
  const initialRadius = Math.max(185, 155 / Math.max(.35, aspect));
  const camera = new ArcRotateCamera(
    "city-camera",
    3* Math.PI / 4,
    0.86,
    initialRadius,
    target,
    scene
  );
  camera.lowerRadiusLimit = isMobile ? 48 : 18;
  camera.upperRadiusLimit = Math.max(420, initialRadius + 40);
  camera.lowerBetaLimit = .3;
  camera.upperBetaLimit = 1.35;
  camera.panningDistanceLimit = 95;
  camera.minZ = .5;
  camera.maxZ = 800;
  camera.wheelDeltaPercentage = 0.01;
  camera.panningSensibility = 30;
  camera.useAutoRotationBehavior = false;
  const pointerInput = camera.inputs.attached.pointers as unknown as {
    buttons: number[];
    angularSensibilityX: number;
    angularSensibilityY: number;
    panningSensibility: number;
    pinchZoom?: boolean;
    multiTouchPanning?: boolean;
    multiTouchPanAndZoom?: boolean;
    pinchDeltaPercentage?: number;
    useNaturalPinchZoom?: boolean;
  };
  pointerInput.buttons = [0];
  pointerInput.angularSensibilityX = 1600;
  pointerInput.angularSensibilityY = 1800;
  pointerInput.panningSensibility = isMobile ? 240 : 450;
  pointerInput.pinchZoom = true;
  pointerInput.multiTouchPanning = false;
  pointerInput.multiTouchPanAndZoom = false;
  pointerInput.pinchDeltaPercentage = 0.002;
  pointerInput.useNaturalPinchZoom = false;
  camera.attachControl(false, false, -1);
  const keyboardInput = camera.inputs.attached.keyboard as unknown as {
    angularSpeed?: number;
    keysLeft?: number[];
    keysRight?: number[];
  } | undefined;
  if (keyboardInput) {
    keyboardInput.angularSpeed = 0.004;
    if (keyboardInput.keysLeft && !keyboardInput.keysLeft.includes(81)) {
      keyboardInput.keysLeft.push(81);
    }
    if (keyboardInput.keysRight && !keyboardInput.keysRight.includes(69)) {
      keyboardInput.keysRight.push(69);
    }
  }
  const baseInertia = camera.inertia;

  const cameraPanning = camera as ArcRotateCamera & {
    _panningMouseButton: number;
  };
  let spacePanningActive = false;
  const rotationKeys = new Set(["KeyQ", "KeyE", "ArrowLeft", "ArrowRight"]);
  const activeRotationKeys = new Set<string>();
  const setSpacePanning = (active: boolean) => {
    if (spacePanningActive === active) return;
    spacePanningActive = active;
    cameraPanning._panningMouseButton = active ? 0 : -1;
  };

  scene.onKeyboardObservable.add((info) => {
    const event = info.event;
    if (rotationKeys.has(event.code)) {
      if (info.type === KeyboardEventTypes.KEYDOWN) {
        activeRotationKeys.add(event.code);
        camera.inertia = 0;
      } else if (info.type === KeyboardEventTypes.KEYUP) {
        activeRotationKeys.delete(event.code);
        if (activeRotationKeys.size === 0) {
          camera.inertia = baseInertia;
        }
      }
    }
    if (event.code === "Space") {
      if (info.type === KeyboardEventTypes.KEYDOWN) {
        setSpacePanning(true);
      } else if (info.type === KeyboardEventTypes.KEYUP) {
        setSpacePanning(false);
      }
      event.preventDefault();
      return;
    }
    if (info.type !== KeyboardEventTypes.KEYDOWN) return;
    const panStep = 0.5;
    const forwardDir = camera.target.subtract(camera.position);
    forwardDir.y = 0;
    if (forwardDir.lengthSquared() < 0.0001) {
      forwardDir.set(Math.sin(camera.alpha), 0, Math.cos(camera.alpha));
    }
    forwardDir.normalize();
    const right = Vector3.Cross(forwardDir, Vector3.Up()).normalize();

    switch (event.code) {
      case "KeyW":
        camera.target.addInPlace(forwardDir.scale(panStep));
        camera.position.addInPlace(forwardDir.scale(panStep));
        event.preventDefault();
        break;
      case "KeyS":
        camera.target.addInPlace(forwardDir.scale(-panStep));
        camera.position.addInPlace(forwardDir.scale(-panStep));
        event.preventDefault();
        break;
      case "KeyA":
        camera.target.addInPlace(right.scale(panStep));
        camera.position.addInPlace(right.scale(panStep));
        event.preventDefault();
        break;
      case "KeyD":
        camera.target.addInPlace(right.scale(-panStep));
        camera.position.addInPlace(right.scale(-panStep));
        event.preventDefault();
        break;
      default:
        break;
    }
  });

  return camera;
};

const setupTwoFingerRotation = (scene: Scene, camera: ArcRotateCamera) => {
  const activeTouches = new Map<number, { x: number; y: number }>();
  let lastMidpoint: { x: number; y: number } | null = null;
  const rotationSensibility = 1400;

  const getMidpoint = () => {
    const points = Array.from(activeTouches.values());
    return {
      x: (points[0].x + points[1].x) / 2,
      y: (points[0].y + points[1].y) / 2,
    };
  };

  const observer = scene.onPointerObservable.add((pointerInfo) => {
    const event = pointerInfo.event as PointerEvent;
    if (event.pointerType !== "touch") return;

    switch (pointerInfo.type) {
      case PointerEventTypes.POINTERDOWN: {
        activeTouches.set(event.pointerId, { x: event.clientX, y: event.clientY });
        if (activeTouches.size === 2) {
          lastMidpoint = getMidpoint();
        }
        break;
      }
      case PointerEventTypes.POINTERMOVE: {
        if (!activeTouches.has(event.pointerId)) {
          return;
        }
        activeTouches.set(event.pointerId, { x: event.clientX, y: event.clientY });
        if (activeTouches.size === 2) {
          const midpoint = getMidpoint();
          if (lastMidpoint) {
            const dx = midpoint.x - lastMidpoint.x;
            const dy = midpoint.y - lastMidpoint.y;
            camera.inertialAlphaOffset -= dx / rotationSensibility;
            camera.inertialBetaOffset -= dy / rotationSensibility;
          }
          lastMidpoint = midpoint;
        }
        break;
      }
      case PointerEventTypes.POINTERUP: {
        activeTouches.delete(event.pointerId);
        if (activeTouches.size < 2) {
          lastMidpoint = null;
        }
        break;
      }
      default:
        break;
    }
  });

  return () => {
    scene.onPointerObservable.remove(observer);
  };
};

// Warm sky fill and sandy bounce keep shaded facades and foliage readable.
// Use the same daylight values at startup and after returning from night.
const DAY_LIGHTING = {
  skyColor: "#B8DDEB",
  sunIntensity: .88,
  fillIntensity: .94,
  skyFill: "#FFF8EE",
  groundBounce: "#C4C3AB",
  exposure: 1,
  contrast: 1,
  shadowLift: .34,
};

const setupLights = (scene: Scene) => {
  const hemi = new HemisphericLight("hemi-light", new Vector3(0, 1, 0), scene);
  hemi.intensity = DAY_LIGHTING.fillIntensity;
  hemi.diffuse = Color3.FromHexString(DAY_LIGHTING.skyFill);
  hemi.groundColor = Color3.FromHexString(DAY_LIGHTING.groundBounce);

  const directional = new DirectionalLight(
    "sun",
    new Vector3(-.38, -1, .26),
    scene
  );
  // A higher afternoon sun keeps tree and tower shadows close to their bases.
  directional.position = new Vector3(38, 100, -26);
  directional.diffuse = Color3.FromHexString("#FFF1D6");
  directional.autoCalcShadowZBounds = true;
  // Balance the steeper angle so sunlit sand keeps the same brightness.
  directional.intensity = DAY_LIGHTING.sunIntensity;

  const shadowGenerator = new ShadowGenerator(isMobileDevice() ? 1024 : 2048, directional);
  shadowGenerator.usePercentageCloserFiltering = true;
  shadowGenerator.filteringQuality = ShadowGenerator.QUALITY_MEDIUM;
  shadowGenerator.bias = .0003;
  shadowGenerator.normalBias = .035;
  shadowGenerator.setDarkness(DAY_LIGHTING.shadowLift);

  return { hemi, directional, shadowGenerator };
};

const animateCameraFocus = (camera: ArcRotateCamera, target: Vector3) => {
  let frame: number | null = null;
  const update = () => {
    camera.target.copyFrom(prefersReducedMotion() ? target : Vector3.Lerp(camera.target, target, .16));
    if (Vector3.Distance(camera.target, target) > .05) frame = requestAnimationFrame(update);
  };
  update();
  return () => { if (frame !== null) cancelAnimationFrame(frame); };
};

const clampBeta = (beta: number) => {
  const min = .3;
  const max = 1.35;
  return Math.min(max, Math.max(min, beta));
};

const shortestAngle = (from: number, to: number) => {
  const twoPi = Math.PI * 2;
  const delta = ((to - from + Math.PI) % twoPi + twoPi) % twoPi;
  return delta - Math.PI;
};

export const createCityScene = async (
  engine: Engine,
  canvas: HTMLCanvasElement,
  callbacks: SceneCallbacks
): Promise<SceneControls> => {
  const scene = new Scene(engine);
  scene.clearColor = Color4.FromHexString(`${DAY_LIGHTING.skyColor}FF`);

  // Drop any reveal entries left over from a previous scene (e.g. a StrictMode
  // remount) so this scene's observer never tweens disposed nodes.
  revealQueue.length = 0;

  const camera = setupCamera(scene, canvas);
  configureCityRoads(CITY_LAYOUT.filter(entry => entry.type === "road"), CITY_TILE_SIZE);
  const disposeTouchRotation = setupTwoFingerRotation(scene, camera);
  const { hemi, directional, shadowGenerator } = setupLights(scene);
  const environment = createIslandEnvironment(scene, shadowGenerator);
  const districts = createDistrictDetails(scene, shadowGenerator);
  const atmosphere = createAtmosphere(scene, camera);
  const nightGlow = new GlowLayer("city-lantern-glow", scene, {
    mainTextureRatio: isMobileDevice() ? .25 : .35,
    blurKernelSize: 24,
  });
  nightGlow.intensity = .24;
  nightGlow.isEnabled = false;
  scene.meshes.forEach(mesh => {
    if (mesh instanceof Mesh && /lantern-glass|warm-lanterns|streetlight-bulbs/.test(mesh.material?.name ?? "")) {
      nightGlow.addIncludedOnlyMesh(mesh);
    }
  });
  scene.imageProcessingConfiguration.contrast = DAY_LIGHTING.contrast;
  scene.imageProcessingConfiguration.exposure = DAY_LIGHTING.exposure;
  scene.imageProcessingConfiguration.toneMappingEnabled = true;
  scene.imageProcessingConfiguration.toneMappingType = 1;
  scene.fogMode = Scene.FOGMODE_EXP2;
  scene.fogColor = Color3.FromHexString(DAY_LIGHTING.skyColor);
  scene.fogDensity = .00055;

  const loadedBuildings: LoadedBuilding[] = [];
  const batchedCityMeshes: Mesh[] = [];

  type AnimationSegment =
    | { type: "move"; start: Vector3; end: Vector3; duration: number }
    | { type: "pause"; position: Vector3; duration: number }
    | {
        type: "turn";
        start: Vector3;
        control: Vector3;
        end: Vector3;
        duration: number;
      };

  const animatedDecor: Array<{
    root: LoadedBuilding["root"];
    sequence: AnimationSequence;
    segments: AnimationSegment[];
    totalDuration: number;
    basePosition: Vector3;
    loop: boolean;
    rotationOffset: number;
    startTime: number;
  }> = [];

  const placeTraffic = (root: LoadedBuilding["root"], position: Vector3) => {
    const mapped = mapCityRoadPoint(position.x, position.z);
    root.position.x = mapped.x;
    root.position.z = mapped.z;
    root.position.y = position.y;
  };

  let animationObserverActive = false;
  const ensureAnimationObserver = () => {
    if (animationObserverActive) return;
    animationObserverActive = true;
    scene.onBeforeRenderObservable.add(() => {
      if (prefersReducedMotion()) return;
      const now = performance.now() / 1000;
      animatedDecor.forEach(({ root, segments, totalDuration, loop, rotationOffset, startTime }) => {
        if (!segments.length || totalDuration <= 0) return;
        const elapsed = now - startTime;
        if (!loop && elapsed >= totalDuration) {
          const last = segments[segments.length - 1];
          const finalPosition =
            last.type === "pause"
              ? last.position
              : last.type === "turn"
              ? last.end
              : last.end;
          placeTraffic(root, finalPosition);
          return;
        }
        const cycleTime = loop ? elapsed % totalDuration : Math.min(elapsed, totalDuration);
        let remaining = cycleTime;
        for (const segment of segments) {
          if (remaining <= segment.duration) {
            const progress = segment.duration > 0 ? remaining / segment.duration : 1;
            if (segment.type === "pause") {
              placeTraffic(root, segment.position);
              return;
            }
            if (segment.type === "turn") {
              const position = quadraticPoint(segment.start, segment.control, segment.end, progress);
              const tangent = quadraticTangent(segment.start, segment.control, segment.end, progress);
              placeTraffic(root, position);
              if (tangent.lengthSquared() > 0.0001) {
                const heading = Math.atan2(tangent.x, tangent.z);
                root.rotation.y = mapCityRoadHeading(position.x, position.z, heading) + rotationOffset;
              }
              return;
            }
            const position = Vector3.Lerp(segment.start, segment.end, progress);
            const direction = segment.end.subtract(segment.start);
            placeTraffic(root, position);
            if (direction.lengthSquared() > 0.0001) {
              const heading = Math.atan2(direction.x, direction.z);
              root.rotation.y = mapCityRoadHeading(position.x, position.z, heading) + rotationOffset;
            }
            return;
          }
          remaining -= segment.duration;
        }
        const fallback = segments[segments.length - 1];
        const fallbackPosition =
          fallback.type === "pause"
            ? fallback.position
            : fallback.type === "turn"
            ? fallback.end
            : fallback.end;
        placeTraffic(root, fallbackPosition);
      });
    });
  };

  const quadraticPoint = (start: Vector3, control: Vector3, end: Vector3, t: number) => {
    const oneMinus = 1 - t;
    const p0 = start.scale(oneMinus * oneMinus);
    const p1 = control.scale(2 * oneMinus * t);
    const p2 = end.scale(t * t);
    return p0.add(p1).add(p2);
  };

  const quadraticTangent = (start: Vector3, control: Vector3, end: Vector3, t: number) => {
    const oneMinus = 1 - t;
    const term1 = control.subtract(start).scale(2 * oneMinus);
    const term2 = end.subtract(control).scale(2 * t);
    return term1.add(term2);
  };

  const estimateQuadraticLength = (start: Vector3, control: Vector3, end: Vector3) => {
    let length = 0;
    const steps = 12;
    let prev = start;
    for (let i = 1; i <= steps; i += 1) {
      const t = i / steps;
      const point = quadraticPoint(start, control, end, t);
      length += Vector3.Distance(prev, point);
      prev = point;
    }
    return length;
  };

  // --- Intro "city builds itself" reveal -------------------------------------
  // loadBuilding snaps each building to a hidden start state (scale 0, raised Y)
  // and pushes it onto revealQueue. A single onBeforeRenderObservable below
  // drains the queue: once a building's stagger delay elapses it grows in with
  // an ease-out-back pop. We only ever iterate the in-flight + just-queued
  // reveals, never the full set of loaded buildings. Under reduced motion the
  // queue stays empty (loadBuilding never enqueues) so this observer is a no-op.
  const REVEAL_DURATION = 520;
  const revealsInFlight: Array<RevealEntry & { elapsed: number }> = [];
  // Slight overshoot ease-out-back so buildings pop past final scale and settle.
  const easeOutBack = (t: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    const p = t - 1;
    return 1 + c3 * p * p * p + c1 * p * p;
  };

  let revealObserverActive = false;
  const ensureRevealObserver = () => {
    if (revealObserverActive) return;
    revealObserverActive = true;
    scene.onBeforeRenderObservable.add(() => {
      const now = performance.now();
      // Promote any queued reveals whose stagger delay has elapsed.
      for (let i = revealQueue.length - 1; i >= 0; i -= 1) {
        const pending = revealQueue[i];
        if (now - pending.queuedAt >= pending.delay) {
          revealQueue.splice(i, 1);
          revealsInFlight.push({ ...pending, elapsed: 0 });
        }
      }
      if (!revealsInFlight.length) return;

      const dt = scene.getEngine().getDeltaTime();
      for (let i = revealsInFlight.length - 1; i >= 0; i -= 1) {
        const reveal = revealsInFlight[i];
        if (reveal.root.isDisposed()) {
          revealsInFlight.splice(i, 1);
          continue;
        }
        reveal.elapsed += dt;
        const t = Scalar.Clamp(reveal.elapsed / REVEAL_DURATION, 0, 1);
        const eased = easeOutBack(t);
        reveal.root.scaling.set(
          reveal.finalScaling.x * eased,
          reveal.finalScaling.y * eased,
          reveal.finalScaling.z * eased
        );
        // Cars (scaleOnly) keep their looping-observer-owned Y untouched.
        if (!reveal.scaleOnly) {
          reveal.root.position.y = Scalar.Lerp(reveal.raisedY, reveal.finalY, eased);
        }
        if (t >= 1) {
          reveal.root.scaling.copyFrom(reveal.finalScaling);
          if (!reveal.scaleOnly) reveal.root.position.y = reveal.finalY;
          revealsInFlight.splice(i, 1);
        }
      }
    });
  };

  const buildSegments = (
    basePosition: Vector3,
    sequence: AnimationSequence,
    halfTile: number
  ) => {
    const segments: AnimationSegment[] = [];
    let cursor = basePosition.clone();
    const resolvePoint = (
      point: { x: number; z: number; space?: "layout" | "world" },
      y: number
    ) => {
      const space = point.space ?? "layout";
      const offset = space === "layout" ? halfTile : 0;
      return new Vector3(point.x + offset, y, point.z + offset);
    };

    sequence.steps.forEach((step) => {
      if (step.type === "pause") {
        const duration = Math.max(step.duration, 0);
        if (duration <= 0) return;
        segments.push({ type: "pause", position: cursor.clone(), duration });
        return;
      }

      if (step.type === "move") {
        const target = resolvePoint(step.target, basePosition.y);
        const distance = Vector3.Distance(cursor, target);
        if (distance <= 0.0001) return;
        const speed = Math.max(step.speed, 0.01);
        const duration = distance / speed;
        segments.push({ type: "move", start: cursor.clone(), end: target, duration });
        cursor = target;
        return;
      }

      if (step.type === "turn") {
        const start = resolvePoint(step.from, basePosition.y);
        const control = resolvePoint(step.corner, basePosition.y);
        const end = resolvePoint(step.to, basePosition.y);
        cursor = start;
        const length = estimateQuadraticLength(start, control, end);
        const speed = Math.max(step.speed, 0.01);
        const duration = length / speed;
        if (duration <= 0) return;
        segments.push({
          type: "turn",
          start,
          control,
          end,
          duration,
        });
        cursor = end;
      }
    });

    return segments;
  };

  const halfTile = CITY_TILE_SIZE / 2;
  let isDayMode = true;
  const applyMaterialLighting = (mat: StandardMaterial | null, isDay: boolean) => {
    if (!mat || !mat.emissiveColor) return;
    const colorValue = isDay ? 0 : .065;
    mat.emissiveColor = new Color3(colorValue, colorValue, colorValue * 1.4);
    if (mat.metadata?.cityWindowLighting && mat.emissiveTexture) {
      mat.emissiveTexture.level = isDay ? 0 : .85;
    }
    mat.specularColor = Color3.FromHexString("#293b3a").scale(.2);
  };
  const applyDayModeToBuilding = (building: LoadedBuilding, isDay: boolean) => {
    building.setLabelDayMode?.(isDay);
    if (building.glowMesh) {
      building.glowMesh.isVisible = !isDay;
    }
    building.meshes.forEach((mesh) => {
      applyMaterialLighting(mesh.material as StandardMaterial | null, isDay);
    });
  };

  const registerAnimated = (building: LoadedBuilding) => {
    const sequence = building.entry.animation;
    if (!sequence || sequence.type !== "sequence" || sequence.steps.length === 0) return;
    const basePosition = new Vector3(building.entry.position.x + halfTile, building.root.position.y, building.entry.position.z + halfTile);
    const segments = buildSegments(basePosition, sequence, halfTile);
    const totalDuration = segments.reduce((sum, seg) => sum + seg.duration, 0);
    if (totalDuration <= 0) return;
    const baseRotation = building.entry.rotation?.y ?? 0;
    const firstSegment = segments.find((seg) => seg.type !== "pause");
    const initialHeading = (() => {
      if (!firstSegment) return 0;
      if (firstSegment.type === "move") {
        const dir = firstSegment.end.subtract(firstSegment.start);
        if (dir.lengthSquared() < 0.0001) return 0;
        return Math.atan2(dir.x, dir.z);
      }
      const tangent = quadraticTangent(firstSegment.start, firstSegment.control, firstSegment.end, 0);
      if (tangent.lengthSquared() < 0.0001) return 0;
      return Math.atan2(tangent.x, tangent.z);
    })();
    const rotationOffset = baseRotation - initialHeading;
    placeTraffic(building.root, basePosition);
    building.root.rotation.y = mapCityRoadHeading(basePosition.x, basePosition.z, initialHeading) + rotationOffset;
    animatedDecor.push({
      root: building.root,
      sequence,
      segments,
      totalDuration,
      basePosition,
      loop: sequence.loop !== false,
      rotationOffset,
      startTime: performance.now() / 1000,
    });
    ensureAnimationObserver();
  };

  const addLoadedBuilding = (building: LoadedBuilding) => {
    loadedBuildings.push(building);
    if (building.entry.type === "main") {
      building.meshes.forEach(mesh => { if (mesh instanceof Mesh) nightGlow.addIncludedOnlyMesh(mesh); });
    }
    applyDayModeToBuilding(building, isDayMode);
    registerAnimated(building);
  };

  // Stagger reveals so the city grows outward from the centre. Distance from
  // origin drives the cascade; main buildings get a near-zero delay so the
  // camera tour always has visible targets, decor cascades a touch slower.
  const revealMotion = !prefersReducedMotion();
  const revealDelayFor = (entry: (typeof CITY_LAYOUT)[number]) => {
    if (!revealMotion) return 0;
    const dist = Math.hypot(entry.position.x, entry.position.z);
    if (entry.type === "main") {
      // Tiny spread (~0-160ms) keyed to distance — centre pops first.
      return Math.min(160, dist * 4);
    }
    // Decor: ~6ms per world unit out from centre, capped so the far edges of
    // the city still arrive promptly after their batch loads.
    return Math.min(900, dist * 6);
  };

  const modelCache = createModelCache();
  const mainEntries = CITY_LAYOUT.filter((entry) => entry.type === "main");
  const otherEntries = CITY_LAYOUT.filter((entry) => entry.type !== "main");
  const mainBuildings = await Promise.all(
    mainEntries.map((entry) =>
      loadBuilding(scene, entry, shadowGenerator, modelCache, revealDelayFor(entry))
    )
  );
  mainBuildings.forEach(addLoadedBuilding);
  const disposeBuildingLabels = setupBuildingLabels(scene, camera, canvas, mainBuildings);
  // Always attach the drainer (idempotent, no-op when the queue stays empty),
  // so a node hidden by queueReveal always has an observer to reveal it — even
  // if reduced-motion is toggled off mid-load after revealMotion was captured.
  ensureRevealObserver();
  callbacks.onAssetsLoaded?.();

  const loadRemaining = (async () => {
    const batchSize = 32;
    for (let i = 0; i < otherEntries.length; i += batchSize) {
      const batch = otherEntries.slice(i, i + batchSize);
      const batchBuildings = await Promise.all(
        batch.map((entry) =>
          loadBuilding(scene, entry, shadowGenerator, modelCache, revealDelayFor(entry))
        )
      );
      batchBuildings.forEach(addLoadedBuilding);
      ensureRevealObserver();
    }
  })();
  loadRemaining.then(() => {
    // Consolidate stationary scenery after its entrance animation. Keep the
    // five interactive buildings and every moving vehicle independent.
    const batchObserver = scene.onBeforeRenderObservable.add(() => {
      if (revealQueue.length || revealsInFlight.length) return;
      scene.onBeforeRenderObservable.remove(batchObserver);
      const groups = new Map<string, { meshes: Mesh[]; castsShadow: boolean }>();
      const stationary = loadedBuildings.filter(b => b.entry.type !== "main" && !b.entry.animation);
      stationary.forEach(building => {
        building.meshes.forEach(mesh => {
          if (!(mesh instanceof Mesh) || !mesh.getTotalVertices()) return;
          mesh.computeWorldMatrix(true);
          const castsShadow = building.entry.type !== "road";
          const key = `${mesh.material?.uniqueId}:${castsShadow}:${mesh.getVerticesDataKinds().sort().join(",")}`;
          const group = groups.get(key) ?? { meshes: [], castsShadow };
          group.meshes.push(mesh);
          groups.set(key, group);
        });
      });
      groups.forEach(({ meshes, castsShadow }) => {
        const merged = meshes.length === 1 ? meshes[0] : Mesh.MergeMeshes(meshes, true, true);
        if (!merged) return;
        merged.name = `city-scenery-${batchedCityMeshes.length}`;
        merged.isPickable = false;
        merged.receiveShadows = true;
        merged.freezeWorldMatrix();
        if (castsShadow) shadowGenerator.addShadowCaster(merged);
        batchedCityMeshes.push(merged);
      });
      stationary.forEach(building => {
        building.meshes = building.meshes.filter(mesh => !mesh.isDisposed());
      });
    });
    callbacks.onAllAssetsLoaded?.();
  }).catch(() => callbacks.onAllAssetsLoaded?.());

  let orbitAnimationFrame: number | null = null;
  let cancelFocusAnimation: (() => void) | null = null;
  const focusCamera = (target: Vector3) => {
    if (orbitAnimationFrame !== null) window.cancelAnimationFrame(orbitAnimationFrame);
    orbitAnimationFrame = null;
    cancelFocusAnimation?.();
    cancelFocusAnimation = animateCameraFocus(camera, target);
  };
  const disposePicking = setupPicking(scene, loadedBuildings, {
    onSelect: callbacks.onBuildingSelect,
    onFocusRequest: (building) =>
      focusCamera(new Vector3(building.root.position.x, 4, building.root.position.z)),
  });

  const defaultCameraState = {
    alpha: camera.alpha,
    beta: camera.beta,
    radius: camera.radius,
    target: camera.target.clone(),
  };

  const setDayMode = (isDay: boolean) => {
    isDayMode = isDay;
    scene.clearColor = isDay
      ? Color4.FromHexString(`${DAY_LIGHTING.skyColor}FF`)
      : Color4.FromHexString("#314b69ff");
    scene.fogColor = isDay ? Color3.FromHexString(DAY_LIGHTING.skyColor) : Color3.FromHexString("#314b69");
    scene.fogDensity = isDay ? .00055 : .0021;
    scene.ambientColor = Color3.FromHexString(isDay ? "#222b24" : "#283952");
    scene.imageProcessingConfiguration.exposure = isDay ? DAY_LIGHTING.exposure : 1.05;
    scene.imageProcessingConfiguration.contrast = isDay ? DAY_LIGHTING.contrast : 1.02;
    shadowGenerator.setDarkness(isDay ? DAY_LIGHTING.shadowLift : .18);
    hemi.intensity = isDay ? DAY_LIGHTING.fillIntensity : .72;
    directional.direction.copyFromFloats(isDay ? -.38 : -.65, -1, isDay ? .26 : .45);
    directional.position.copyFromFloats(isDay ? 38 : 40, isDay ? 100 : 65, isDay ? -26 : -35);
    directional.intensity = isDay ? DAY_LIGHTING.sunIntensity : .38;
    directional.diffuse = Color3.FromHexString(isDay ? "#FFF1D6" : "#bbd5ff");
    hemi.diffuse = Color3.FromHexString(isDay ? DAY_LIGHTING.skyFill : "#deeff0");
    hemi.groundColor = Color3.FromHexString(isDay ? DAY_LIGHTING.groundBounce : "#6e839b");
    environment.setDayMode(isDay);
    districts.setDayMode(isDay);
    atmosphere.setDayMode(isDay);
    nightGlow.isEnabled = !isDay;

    loadedBuildings.forEach((building) => applyDayModeToBuilding(building, isDay));
    batchedCityMeshes.forEach(mesh => applyMaterialLighting(mesh.material as StandardMaterial | null, isDay));
  };

  const focusOnBuilding = (key: BuildingKey | null) => {
    if (!key) {
      focusCamera(new Vector3(2, 0, 2));
      return;
    }
    const building = loadedBuildings.find(
      (entry) => entry.entry.type === "main" && entry.entry.key === key
    );
    if (!building) return;
    const target = new Vector3(building.root.position.x, 4, building.root.position.z);
    focusCamera(target);
    camera.radius = isMobileDevice() ? 64 : 48;
  };

  let cancelActiveTour: (() => void) | null = null;
  const resetCamera = () => {
    cancelActiveTour?.();
    cancelFocusAnimation?.();
    if (orbitAnimationFrame !== null) window.cancelAnimationFrame(orbitAnimationFrame);
    camera.inertialAlphaOffset = 0;
    camera.inertialBetaOffset = 0;
    camera.inertialRadiusOffset = 0;
    camera.inertialPanningX = 0;
    camera.inertialPanningY = 0;
    camera.alpha = defaultCameraState.alpha;
    camera.beta = defaultCameraState.beta;
    camera.radius = defaultCameraState.radius;
    camera.target.copyFrom(defaultCameraState.target);
  };

  const startCameraTour = (onComplete?: () => void): (() => void) => {
    cancelActiveTour?.();
    cancelFocusAnimation?.();
    if (prefersReducedMotion()) {
      resetCamera();
      queueMicrotask(() => onComplete?.());
      return () => {};
    }
    if (orbitAnimationFrame !== null) {
      window.cancelAnimationFrame(orbitAnimationFrame);
      orbitAnimationFrame = null;
    }

    camera.detachControl();
    camera.inertialAlphaOffset = 0;
    camera.inertialBetaOffset = 0;
    camera.inertialRadiusOffset = 0;

    const easeInOut = (t: number): number => t * t * (3 - 2 * t);

    type TourWaypoint = {
      alpha: number;
      beta: number;
      radius: number;
      tx: number;
      tz: number;
      ty?: number;
      moveDuration: number;
      pauseDuration: number;
    };

    const isMobile = isMobileDevice();
    const closeRadius = isMobile ? 62 : 40;
    const homeRadius = defaultCameraState.radius;

    const waypoints: TourWaypoint[] = [
      // 0: high overview — snap here instantly, then pause
      { alpha: (3 * Math.PI) / 4, beta: .86, radius: homeRadius, tx: 2, tz: 2, ty: defaultCameraState.target.y, moveDuration: 0, pauseDuration: 600 },
      // 1: Projects (city centre)
      { alpha: Math.PI / 2, beta: 0.82, radius: closeRadius, tx: 2, tz: 2, moveDuration: 1600, pauseDuration: 650 },
      // 2: About (NE  12, 12)
      { alpha: (3 * Math.PI) / 4, beta: 0.78, radius: closeRadius + 2, tx: 14, tz: 14, moveDuration: 1600, pauseDuration: 650 },
      // 3: Experience (NW  -16, 12)
      { alpha: Math.PI, beta: 0.78, radius: closeRadius + 4, tx: -14, tz: 14, moveDuration: 1800, pauseDuration: 650 },
      // 4: Contact (SW  -12, -12)
      { alpha: Math.PI / 4, beta: 0.78, radius: closeRadius + 2, tx: -10, tz: -10, moveDuration: 1800, pauseDuration: 650 },
      // 5: Skills (SE  12, -12)
      { alpha: -(Math.PI / 4), beta: 0.78, radius: closeRadius + 2, tx: 14, tz: -10, moveDuration: 1600, pauseDuration: 650 },
      // 6: return home
      { alpha: (3 * Math.PI) / 4, beta: .86, radius: homeRadius, tx: 2, tz: 2, ty: defaultCameraState.target.y, moveDuration: 2000, pauseDuration: 0 },
    ];

    // Snap to initial overview position
    const first = waypoints[0];
    camera.alpha = first.alpha;
    camera.beta = first.beta;
    camera.radius = first.radius;
    camera.target.set(first.tx, first.ty ?? 4, first.tz);

    let cancelled = false;
    let tourRafId: number | null = null;
    let waypointIndex = 0;
    let segmentStart = performance.now();
    let phase: "pause" | "move" = "pause";
    let fromAlpha = first.alpha;
    let fromBeta = first.beta;
    let fromRadius = first.radius;
    let fromTx = first.tx;
    let fromTz = first.tz;
    let fromTy = first.ty ?? 4;

    const finish = () => {
      camera.inertialAlphaOffset = 0;
      camera.inertialBetaOffset = 0;
      camera.inertialRadiusOffset = 0;
      camera.attachControl(false, false, -1);
      if (!cancelled) onComplete?.();
    };

    const step = (timestamp: number) => {
      if (cancelled) return;
      const elapsed = timestamp - segmentStart;
      const wp = waypoints[waypointIndex];

      if (phase === "pause") {
        if (elapsed >= wp.pauseDuration) {
          waypointIndex++;
          if (waypointIndex >= waypoints.length) {
            finish();
            return;
          }
          fromAlpha = camera.alpha;
          fromBeta = camera.beta;
          fromRadius = camera.radius;
          fromTx = camera.target.x;
          fromTz = camera.target.z;
          fromTy = camera.target.y;
          segmentStart = timestamp;
          phase = "move";
        }
        tourRafId = window.requestAnimationFrame(step);
      } else {
        const nextWp = waypoints[waypointIndex];
        const t = Math.min(1, elapsed / nextWp.moveDuration);
        const e = easeInOut(t);

        camera.alpha = fromAlpha + shortestAngle(fromAlpha, nextWp.alpha) * e;
        camera.beta = fromBeta + (nextWp.beta - fromBeta) * e;
        camera.radius = fromRadius + (nextWp.radius - fromRadius) * e;
        camera.target.x = fromTx + (nextWp.tx - fromTx) * e;
        camera.target.z = fromTz + (nextWp.tz - fromTz) * e;
        camera.target.y = fromTy + ((nextWp.ty ?? 4) - fromTy) * e;

        if (t >= 1) {
          camera.alpha = nextWp.alpha;
          camera.beta = nextWp.beta;
          camera.radius = nextWp.radius;
          camera.target.set(nextWp.tx, nextWp.ty ?? 4, nextWp.tz);
          segmentStart = timestamp;
          phase = "pause";
        }
        tourRafId = window.requestAnimationFrame(step);
      }
    };

    tourRafId = window.requestAnimationFrame(step);

    cancelActiveTour = () => {
      if (cancelled) return;
      cancelled = true;
      if (tourRafId !== null) window.cancelAnimationFrame(tourRafId);
      finish();
    };
    return cancelActiveTour;
  };

  return {
    scene,
    resetCamera,
    setPhotoMode: (enabled) => {
      loadedBuildings.forEach(building => {
        if (building.labelMesh) building.labelMesh.isVisible = !enabled;
      });
    },
    focusOnPoint: (x, z, radius = 32) => {
      cancelActiveTour?.();
      cancelFocusAnimation?.();
      if (orbitAnimationFrame !== null) window.cancelAnimationFrame(orbitAnimationFrame);
      const from = camera.target.clone();
      const to = new Vector3(x, 1, z);
      const startRadius = camera.radius;
      const start = performance.now();
      const tick = (now: number) => {
        const progress = prefersReducedMotion() ? 1 : Math.min(1, (now - start) / 1000);
        const eased = progress * progress * (3 - 2 * progress);
        camera.target.copyFrom(Vector3.Lerp(from, to, eased));
        camera.radius = Scalar.Lerp(startRadius, radius, eased);
        if (progress < 1) orbitAnimationFrame = requestAnimationFrame(tick);
      };
      orbitAnimationFrame = requestAnimationFrame(tick);
    },
    zoomCamera: (delta) => {
      if (orbitAnimationFrame !== null) window.cancelAnimationFrame(orbitAnimationFrame);
      orbitAnimationFrame = null;
      cancelFocusAnimation?.();
      camera.radius = Scalar.Clamp(camera.radius + delta, camera.lowerRadiusLimit ?? 18, camera.upperRadiusLimit ?? 170);
    },
    setDayMode,
    setCameraOrbit: (alpha: number, beta: number) => {
      if (orbitAnimationFrame !== null) {
        window.cancelAnimationFrame(orbitAnimationFrame);
      }
      const startAlpha = camera.alpha;
      const startBeta = camera.beta;
      const targetAlpha = alpha;
      const targetBeta = clampBeta(beta);
      const startTime = performance.now();
      const duration = 320;

      const step = (time: number) => {
        const t = Math.min(1, (time - startTime) / duration);
        const eased = t * (2 - t);
        camera.alpha = startAlpha + shortestAngle(startAlpha, targetAlpha) * eased;
        camera.beta = startBeta + (targetBeta - startBeta) * eased;

        if (t < 1) {
          orbitAnimationFrame = window.requestAnimationFrame(step);
        }
      };

      orbitAnimationFrame = window.requestAnimationFrame(step);
    },
    focusOnBuilding,
    startCameraTour,
    dispose: () => {
      if (orbitAnimationFrame !== null) {
        window.cancelAnimationFrame(orbitAnimationFrame);
      }
      cancelActiveTour?.();
      cancelFocusAnimation?.();
      environment.dispose();
      districts.dispose();
      atmosphere.dispose();
      nightGlow.dispose();
      disposePicking();
      disposeBuildingLabels();
      disposeTouchRotation();
      scene.dispose();
    },
  };
};
