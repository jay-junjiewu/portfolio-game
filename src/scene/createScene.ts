import {
  ArcRotateCamera,
  Color3,
  Color4,
  DirectionalLight,
  Engine,
  DynamicTexture,
  HemisphericLight,
  MeshBuilder,
  PointerEventTypes,
  Scene,
  ShadowGenerator,
  StandardMaterial,
  Vector3,
} from "@babylonjs/core";
import { KeyboardEventTypes } from "@babylonjs/core/Events/keyboardEvents";
import { CITY_LAYOUT, CITY_TILE_SIZE, type BuildingKey, type AnimationSequence } from "../data/cityLayout";
import type { LoadedBuilding } from "./loadBuilding";
import { loadBuilding } from "./loadBuilding";
import { setupPicking } from "./picking";

export type SceneCallbacks = {
  onBuildingSelect: (key: BuildingKey | null) => void;
  onAssetsLoaded?: () => void;
};

export type SceneControls = {
  scene: Scene;
  resetCamera: () => void;
  setDayMode: (isDay: boolean) => void;
  setCameraOrbit: (alpha: number, beta: number) => void;
  focusOnBuilding: (key: BuildingKey | null) => void;
  dispose: () => void;
};

const isMobileDevice = () => {
  if (typeof window === "undefined") return false;
  const coarsePointer = window.matchMedia?.("(pointer: coarse)").matches ?? false;
  const smallViewport = window.matchMedia?.("(max-width: 900px)").matches ?? false;
  return coarsePointer || smallViewport;
};

const setupCamera = (scene: Scene, canvas: HTMLCanvasElement) => {
  const target = new Vector3(0, 4, 0);
  const isMobile = isMobileDevice();
  const initialRadius = isMobile ? 52 : 42;
  const camera = new ArcRotateCamera(
    "city-camera",
    3* Math.PI / 4,
    1,
    initialRadius,
    target,
    scene
  );
  camera.lowerRadiusLimit = 12;
  camera.upperRadiusLimit = 60;
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
  pointerInput.angularSensibilityX = 10000;
  pointerInput.angularSensibilityY = 10000;
  pointerInput.panningSensibility = isMobile ? 240 : 450;
  pointerInput.pinchZoom = true;
  pointerInput.multiTouchPanning = false;
  pointerInput.multiTouchPanAndZoom = false;
  pointerInput.pinchDeltaPercentage = 0.01;
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
  const touchPointers = new Set<number>();
  const updatePanningButton = () => {
    cameraPanning._panningMouseButton =
      touchPointers.size > 0 || spacePanningActive ? 0 : -1;
  };
  const setSpacePanning = (active: boolean) => {
    if (spacePanningActive === active) return;
    spacePanningActive = active;
    updatePanningButton();
  };

  scene.onPrePointerObservable.add((pointerInfo) => {
    const event = pointerInfo.event as PointerEvent;
    if (event.pointerType !== "touch" && event.pointerType !== "pen") {
      return;
    }
    if (pointerInfo.type === PointerEventTypes.POINTERDOWN) {
      touchPointers.add(event.pointerId);
      updatePanningButton();
    } else if (pointerInfo.type === PointerEventTypes.POINTERUP) {
      touchPointers.delete(event.pointerId);
      updatePanningButton();
    }
  });

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

const createGround = (scene: Scene) => {
  const ground = MeshBuilder.CreateGround(
    "ground",
    { width: 220, height: 220, subdivisions: 2 },
    scene
  );
  const groundMaterial = new StandardMaterial("ground-mat", scene);
  groundMaterial.diffuseColor = Color3.FromHexString("#c9efd8");
  groundMaterial.specularColor = Color3.Black();

  const gridTexture = new DynamicTexture("grid-tex", { width: 512, height: 512 }, scene, false);
  const ctx = gridTexture.getContext();
  if (ctx) {
    ctx.clearRect(0, 0, 512, 512);
    ctx.strokeStyle = "rgba(6, 28, 64, 0.22)";
    ctx.lineWidth = 2;
    const step = 64;
    for (let i = 0; i <= 512; i += step) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 512);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(512, i);
      ctx.stroke();
    }
    gridTexture.update(false);
    gridTexture.hasAlpha = true;
    gridTexture.uScale = 10;
    gridTexture.vScale = 10;
    groundMaterial.diffuseTexture = gridTexture;

  }

  ground.material = groundMaterial;
  ground.receiveShadows = true;
  return { ground, groundMaterial };
};

const addGridLines = (scene: Scene) => {
  const size = CITY_TILE_SIZE;
  const blocks = 17;
  const start = -Math.floor((blocks - 1) / 2) * size;
  const end = Math.floor((blocks + 1) / 2) * size;
  const color = Color3.FromHexString("#597392");

  for (let x = start; x <= end; x += size) {
    MeshBuilder.CreateLines(
      `grid-x-${x}`,
      {
        points: [new Vector3(x, 0.01, start), new Vector3(x, 0.01, end)],
      },
      scene
    ).color = color;
  }

  for (let z = start; z <= end; z += size) {
    MeshBuilder.CreateLines(
      `grid-z-${z}`,
      {
        points: [new Vector3(start, 0.01, z), new Vector3(end, 0.01, z)],
      },
      scene
    ).color = color;
  }
};

const setupLights = (scene: Scene) => {
  const hemi = new HemisphericLight("hemi-light", new Vector3(0, 1, 0), scene);
  hemi.intensity = 0.8;
  hemi.groundColor = Color3.FromHexString("#7cabd9");

  const directional = new DirectionalLight(
    "sun",
    new Vector3(-0.5, -1, -0.4),
    scene
  );
  directional.position = new Vector3(20, 30, 20);
  directional.intensity = 1.1;

  const shadowGenerator = new ShadowGenerator(1024, directional);
  shadowGenerator.useBlurExponentialShadowMap = true;
  shadowGenerator.blurKernel = 16;

  return { hemi, directional, shadowGenerator };
};

const animateCameraFocus = (camera: ArcRotateCamera, target: Vector3) => {
  const lerpFactor = 0.2;
  const update = () => {
    camera.target = Vector3.Lerp(camera.target, target, lerpFactor);
    if (Vector3.Distance(camera.target, target) > 0.1) {
      requestAnimationFrame(update);
    }
  };
  update();
};

const clampBeta = (beta: number) => {
  const min = 0.2;
  const max = Math.PI - 0.2;
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
  scene.clearColor = new Color4(0.82, 0.92, 1, 1);

  const { ground, groundMaterial } = createGround(scene);

  // Grid for testing
  // addGridLines(scene);
  const camera = setupCamera(scene, canvas);
  const disposeTouchRotation = setupTwoFingerRotation(scene, camera);
  const { hemi, directional, shadowGenerator } = setupLights(scene);

  const loadedBuildings: LoadedBuilding[] = [];

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

  let animationObserverActive = false;
  const ensureAnimationObserver = () => {
    if (animationObserverActive) return;
    animationObserverActive = true;
    scene.onBeforeRenderObservable.add(() => {
      const now = performance.now() / 1000;
      animatedDecor.forEach(({ root, segments, totalDuration, loop, basePosition, rotationOffset, startTime }) => {
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
          root.position.x = finalPosition.x;
          root.position.z = finalPosition.z;
          root.position.y = basePosition.y;
          return;
        }
        const cycleTime = loop ? elapsed % totalDuration : Math.min(elapsed, totalDuration);
        let remaining = cycleTime;
        for (const segment of segments) {
          if (remaining <= segment.duration) {
            const progress = segment.duration > 0 ? remaining / segment.duration : 1;
            if (segment.type === "pause") {
              root.position.x = segment.position.x;
              root.position.z = segment.position.z;
              root.position.y = basePosition.y;
              return;
            }
            if (segment.type === "turn") {
              const position = quadraticPoint(segment.start, segment.control, segment.end, progress);
              const tangent = quadraticTangent(segment.start, segment.control, segment.end, progress);
              root.position.x = position.x;
              root.position.z = position.z;
              root.position.y = basePosition.y;
              if (tangent.lengthSquared() > 0.0001) {
                const heading = Math.atan2(tangent.x, tangent.z);
                root.rotation.y = heading + rotationOffset;
              }
              return;
            }
            const position = Vector3.Lerp(segment.start, segment.end, progress);
            const direction = segment.end.subtract(segment.start);
            root.position.x = position.x;
            root.position.z = position.z;
            root.position.y = basePosition.y;
            if (direction.lengthSquared() > 0.0001) {
              const heading = Math.atan2(direction.x, direction.z);
              root.rotation.y = heading + rotationOffset;
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
        root.position.x = fallbackPosition.x;
        root.position.z = fallbackPosition.z;
        root.position.y = basePosition.y;
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
  const applyDayModeToBuilding = (building: LoadedBuilding, isDay: boolean) => {
    if (building.glowMesh) {
      building.glowMesh.isVisible = !isDay;
    }
    building.meshes.forEach((mesh) => {
      const mat = mesh.material as StandardMaterial | null;
      if (!mat || !mat.emissiveColor) return;
      const colorValue = isDay ? 0.02 : 0.22;
      mat.emissiveColor = new Color3(colorValue, colorValue, colorValue);
    });
  };

  const registerAnimated = (building: LoadedBuilding) => {
    const sequence = building.entry.animation;
    if (!sequence || sequence.type !== "sequence" || sequence.steps.length === 0) return;
    const basePosition = building.root.position.clone();
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
    applyDayModeToBuilding(building, isDayMode);
    registerAnimated(building);
  };

  const mainEntries = CITY_LAYOUT.filter((entry) => entry.type === "main");
  const otherEntries = CITY_LAYOUT.filter((entry) => entry.type !== "main");
  const mainBuildings = await Promise.all(
    mainEntries.map((entry) => loadBuilding(scene, entry, shadowGenerator))
  );
  mainBuildings.forEach(addLoadedBuilding);

  const loadRemaining = (async () => {
    const batchSize = 8;
    for (let i = 0; i < otherEntries.length; i += batchSize) {
      const batch = otherEntries.slice(i, i + batchSize);
      const batchBuildings = await Promise.all(
        batch.map((entry) => loadBuilding(scene, entry, shadowGenerator))
      );
      batchBuildings.forEach(addLoadedBuilding);
    }
  })();
  loadRemaining.then(() => callbacks.onAssetsLoaded?.()).catch(() => callbacks.onAssetsLoaded?.());

  const disposePicking = setupPicking(scene, loadedBuildings, {
    onSelect: callbacks.onBuildingSelect,
    onFocusRequest: (building) =>
      animateCameraFocus(camera, new Vector3(building.root.position.x, 4, building.root.position.z)),
  });

  const defaultCameraState = {
    alpha: camera.alpha,
    beta: camera.beta,
    radius: camera.radius,
    target: camera.target.clone(),
  };
  let orbitAnimationFrame: number | null = null;

  const setDayMode = (isDay: boolean) => {
    isDayMode = isDay;
    scene.clearColor = isDay
      ? new Color4(0.84, 0.93, 0.86, 1)
      : new Color4(0.04, 0.05, 0.08, 1);
    scene.ambientColor = isDay
      ? Color3.FromHexString("#dbe8d9")
      : Color3.FromHexString("#1c2942");
    hemi.intensity = isDay ? 0.8 : 0.55;
    directional.intensity = isDay ? 1.2 : 0.7;
    groundMaterial.diffuseColor = isDay
      ? Color3.FromHexString("#bfe3c1")
      : Color3.FromHexString("#1f2835");
    groundMaterial.specularColor = isDay
      ? Color3.Black()
      : Color3.FromHexString("#111111");

    loadedBuildings.forEach((building) => applyDayModeToBuilding(building, isDay));
  };

  const focusOnBuilding = (key: BuildingKey | null) => {
    if (!key) {
      animateCameraFocus(camera, new Vector3(0, 4, 0));
      return;
    }
    const building = loadedBuildings.find(
      (entry) => entry.entry.type === "main" && entry.entry.key === key
    );
    if (!building) return;
    const target = new Vector3(building.root.position.x, 4, building.root.position.z);
    animateCameraFocus(camera, target);
    camera.radius = Math.max(camera.lowerRadiusLimit ?? 12, camera.radius * 0.8);
  };

  const resetCamera = () => {
    camera.alpha = defaultCameraState.alpha;
    camera.beta = defaultCameraState.beta;
    camera.radius = defaultCameraState.radius;
    camera.target = defaultCameraState.target.clone();
  };

  return {
    scene,
    resetCamera,
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
    dispose: () => {
      if (orbitAnimationFrame !== null) {
        window.cancelAnimationFrame(orbitAnimationFrame);
      }
      disposePicking();
      disposeTouchRotation();
      scene.dispose();
    },
  };
};
