import {
  ArcRotateCamera,
  Color3,
  Color4,
  DirectionalLight,
  Engine,
  DynamicTexture,
  HemisphericLight,
  MeshBuilder,
  Scene,
  ShadowGenerator,
  StandardMaterial,
  Vector3,
} from "@babylonjs/core";
import { KeyboardEventTypes } from "@babylonjs/core/Events/keyboardEvents";
import type { BuildingKey } from "../data/cityLayout";
import { CITY_LAYOUT, CITY_TILE_SIZE } from "../data/cityLayout";
import { decorateScene } from "./decorate";
import type { LoadedBuilding } from "./loadBuilding";
import { loadBuilding } from "./loadBuilding";
import { setupPicking } from "./picking";

export type SceneCallbacks = {
  onBuildingSelect: (key: BuildingKey | null) => void;
};

export type SceneControls = {
  scene: Scene;
  resetCamera: () => void;
  setDayMode: (isDay: boolean) => void;
  focusOnBuilding: (key: BuildingKey | null) => void;
  dispose: () => void;
};

const setupCamera = (scene: Scene, canvas: HTMLCanvasElement) => {
  const target = new Vector3(0, 4, 0);
  const camera = new ArcRotateCamera(
    "city-camera",
    Math.PI / 4,
    1,
    32,
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
    panningMouseButton: number;
  };
  pointerInput.buttons = [0];
  pointerInput.angularSensibilityX = 10000;
  pointerInput.angularSensibilityY = 10000;
  pointerInput.panningSensibility = 450;
  pointerInput.panningMouseButton = 0;
  camera.attachControl(canvas, true);

  scene.onKeyboardObservable.add((info) => {
    const event = info.event;
    if (info.type !== KeyboardEventTypes.KEYDOWN) return;
    const panStep = 0.8;
    const forward = new Vector3(
      Math.sin(camera.alpha),
      0,
      Math.cos(camera.alpha)
    ).normalize();
    const right = Vector3.Cross(forward, Vector3.Up()).normalize();

    switch (event.code) {
      case "KeyQ":
        camera.alpha -= 0.1;
        event.preventDefault();
        break;
      case "KeyE":
        camera.alpha += 0.1;
        event.preventDefault();
        break;
      case "KeyW":
      case "ArrowUp":
        camera.target.addInPlace(forward.scale(panStep));
        camera.position.addInPlace(forward.scale(panStep));
        event.preventDefault();
        break;
      case "KeyS":
      case "ArrowDown":
        camera.target.addInPlace(forward.scale(-panStep));
        camera.position.addInPlace(forward.scale(-panStep));
        event.preventDefault();
        break;
      case "KeyA":
      case "ArrowLeft":
        camera.target.addInPlace(right.scale(-panStep));
        camera.position.addInPlace(right.scale(-panStep));
        event.preventDefault();
        break;
      case "KeyD":
      case "ArrowRight":
        camera.target.addInPlace(right.scale(panStep));
        camera.position.addInPlace(right.scale(panStep));
        event.preventDefault();
        break;
      default:
        break;
    }
  });

  return camera;
};

const createGround = (scene: Scene) => {
  const ground = MeshBuilder.CreateGround(
    "ground",
    { width: 220, height: 220, subdivisions: 2 },
    scene
  );
  const groundMaterial = new StandardMaterial("ground-mat", scene);
  groundMaterial.diffuseColor = Color3.FromHexString("#bfe3c1");
  groundMaterial.specularColor = Color3.Black();

  const gridTexture = new DynamicTexture("grid-tex", { width: 512, height: 512 }, scene, false);
  const ctx = gridTexture.getContext();
  if (ctx) {
    ctx.clearRect(0, 0, 512, 512);
    ctx.strokeStyle = "rgba(6, 28, 64, 0.07)";
    ctx.lineWidth = 1.25;
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
    gridTexture.uScale = 14;
    gridTexture.vScale = 14;
    groundMaterial.diffuseTexture = gridTexture;
  }

  ground.material = groundMaterial;
  ground.receiveShadows = true;
  return { ground, groundMaterial };
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

export const createCityScene = async (
  engine: Engine,
  canvas: HTMLCanvasElement,
  callbacks: SceneCallbacks
): Promise<SceneControls> => {
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.82, 0.92, 1, 1);

  const { ground, groundMaterial } = createGround(scene);
  const camera = setupCamera(scene, canvas);
  const { hemi, directional, shadowGenerator } = setupLights(scene);
  decorateScene(scene);

  const loadedBuildings: LoadedBuilding[] = [];
  for (const entry of CITY_LAYOUT) {
    const building = await loadBuilding(scene, entry, shadowGenerator);
    loadedBuildings.push(building);
  }

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

  const setDayMode = (isDay: boolean) => {
    scene.clearColor = isDay
      ? new Color4(0.84, 0.93, 0.86, 1)
      : new Color4(0.04, 0.05, 0.08, 1);
    hemi.intensity = isDay ? 0.8 : 0.25;
    directional.intensity = isDay ? 1.2 : 0.4;
    groundMaterial.diffuseColor = isDay
      ? Color3.FromHexString("#bfe3c1")
      : Color3.FromHexString("#1f2835");
    groundMaterial.specularColor = isDay
      ? Color3.Black()
      : Color3.FromHexString("#111111");

    loadedBuildings.forEach((building) => {
      if (building.glowMesh) {
        building.glowMesh.isVisible = !isDay;
      }
      building.meshes.forEach((mesh) => {
        const mat = mesh.material as StandardMaterial | null;
        if (!mat || !mat.emissiveColor) return;
        const colorValue = isDay ? 0.02 : 0.15;
        mat.emissiveColor = new Color3(colorValue, colorValue, colorValue);
      });
    });
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
    focusOnBuilding,
    dispose: () => {
      disposePicking();
      scene.dispose();
    },
  };
};
