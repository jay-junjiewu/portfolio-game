import type { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { ShaderMaterial } from "@babylonjs/core/Materials/shaderMaterial";
import type { Scene } from "@babylonjs/core/scene";
import { isMobileDevice, prefersReducedMotion } from "../utils/device";

export type AtmosphereControls = {
  setDayMode: (day: boolean) => void;
  dispose: () => void;
};

type CloudBankDefinition = {
  name: string;
  center: Vector3;
  size: Vector3;
  mist: number;
  seed: number;
  secondary?: boolean;
  mobile?: boolean;
  opacity?: number;
};

const vertexSource = /* glsl */ `
precision highp float;
attribute vec3 position;
uniform mat4 world;
uniform mat4 worldViewProjection;
varying vec3 vWorldPosition;
void main() {
  vWorldPosition = (world * vec4(position, 1.0)).xyz;
  gl_Position = worldViewProjection * vec4(position, 1.0);
}`;

const fragmentSource = /* glsl */ `
precision highp float;
varying vec3 vWorldPosition;
uniform vec3 cameraPosition;
uniform vec3 volumeCenter;
uniform vec3 halfExtent;
uniform vec3 sunDirection;
uniform vec3 litColor;
uniform vec3 shadeColor;
uniform vec3 skyColor;
uniform float time;
uniform float seed;
uniform float coastalMist;
uniform float viewFade;
uniform float daylight;
uniform float cloudScale;

// Smooth 3D value noise, with a trigonometry-free hash. No texture downloads.
float hash31(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.yzx + 33.33);
  return fract((p.x + p.y) * p.z);
}
float noise3(vec3 p) {
  vec3 cell = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash31(cell), hash31(cell + vec3(1,0,0)), f.x),
        mix(hash31(cell + vec3(0,1,0)), hash31(cell + vec3(1,1,0)), f.x), f.y),
    mix(mix(hash31(cell + vec3(0,0,1)), hash31(cell + vec3(1,0,1)), f.x),
        mix(hash31(cell + vec3(0,1,1)), hash31(cell + vec3(1,1,1)), f.x), f.y), f.z);
}
float cloudNoise(vec3 p) {
  float value = noise3(p) * 0.62;
  value += noise3(p * 2.13 + 17.8) * 0.28;
  #ifndef MOBILE_ATMOSPHERE
    value += noise3(p * 4.31 + 31.7) * 0.10;
  #else
    value += 0.05;
  #endif
  return value;
}

float smoothUnion(float a, float b, float radius) {
  float h = clamp(0.5 + 0.5 * (a - b) / radius, 0.0, 1.0);
  return mix(b, a, h) + radius * h * (1.0 - h);
}

float envelopeAt(vec3 p) {
  vec3 local = (p - volumeCenter) / halfExtent;
  if (coastalMist > 0.5) return max(0.0, 1.0 - dot(local, local));
  // Asymmetric rising plumes form one connected field, rather than one smooth
  // oval. Erosion below breaks up their contour before the ray is integrated.
  float west = 1.0 - length((local - vec3(-0.43, -0.16, 0.04)) / vec3(0.49, 0.63, 0.73));
  float middle = 1.0 - length((local - vec3(-0.06, 0.12, -0.10)) / vec3(0.59, 0.79, 0.71));
  float east = 1.0 - length((local - vec3(0.43, -0.15, 0.12)) / vec3(0.44, 0.58, 0.59));
  return smoothUnion(smoothUnion(west, middle, 0.18), east, 0.16);
}

float densityAt(vec3 p) {
  float envelope = envelopeAt(p);
  vec3 wind = vec3(time * 0.036, 0.0, time * 0.012);
  vec3 samplePoint = p * mix(0.135 * cloudScale, 0.045, coastalMist) + wind + seed;
  float detail = cloudNoise(samplePoint);
  float erosion = (1.0 - detail) * mix(0.5, 0.66, coastalMist);
  float density = smoothstep(-0.055, mix(0.20, 0.46, coastalMist), envelope - erosion);
  // Protect the central districts while allowing wisps above the far coast.
  float coastDistance = length((p.xz - vec2(2.0)) / vec2(52.0, 48.0));
  density *= smoothstep(1.0, 1.2, coastDistance);
  density *= mix(1.0, 0.28, coastalMist);
  return density;
}

vec2 intersectBox(vec3 origin, vec3 direction) {
  vec3 safeDirection = sign(direction) * max(abs(direction), vec3(0.00001));
  // sign(0) is zero, so keep exactly axis-aligned camera rays finite as well.
  safeDirection += (vec3(1.0) - abs(sign(safeDirection))) * 0.00001;
  vec3 t0 = (volumeCenter - halfExtent - origin) / safeDirection;
  vec3 t1 = (volumeCenter + halfExtent - origin) / safeDirection;
  vec3 nearPlane = min(t0, t1);
  vec3 farPlane = max(t0, t1);
  return vec2(max(max(nearPlane.x, nearPlane.y), nearPlane.z),
              min(min(farPlane.x, farPlane.y), farPlane.z));
}

void main() {
  if (viewFade < 0.012) discard;
  vec3 rayDirection = normalize(vWorldPosition - cameraPosition);
  vec2 bounds = intersectBox(cameraPosition, rayDirection);
  float entry = max(0.0, bounds.x);
  float distanceInVolume = bounds.y - entry;
  if (distanceInVolume <= 0.0) discard;

  float stepLength = distanceInVolume / float(RAY_STEPS);
  // Stable subpixel jitter hides low-step banding without temporal shimmer.
  float jitter = hash31(vec3(floor(gl_FragCoord.xy), seed));
  float rayDistance = entry + stepLength * (0.25 + 0.5 * jitter);
  float transmission = 1.0;
  vec3 scattered = vec3(0.0);
  float forwardScatter = pow(max(dot(rayDirection, sunDirection), 0.0), 5.0);

  for (int i = 0; i < RAY_STEPS; i++) {
    vec3 p = cameraPosition + rayDirection * rayDistance;
    float density = densityAt(p);
    if (density > 0.008) {
      // One coarse light probe estimates self-shadowing. Integrating extinction
      // along the view ray gives real volume depth rather than a shaded sprite.
      vec3 probe = p + sunDirection * 4.8 / cloudScale;
      float lightDepth = max(0.0, envelopeAt(probe) - (1.0 - noise3(probe * 0.135 * cloudScale + seed)) * 0.36);
      float sunlight = exp(-lightDepth * 3.4);
      float topLight = clamp((p.y - volumeCenter.y) / halfExtent.y * 0.3 + 0.65, 0.0, 1.0);
      vec3 lighting = mix(shadeColor, litColor, clamp(sunlight * 0.86 + topLight * 0.14, 0.0, 1.0));
      lighting += litColor * forwardScatter * 0.12 * daylight;
      float opacity = 1.0 - exp(-density * stepLength * mix(0.14 * cloudScale, 0.065, coastalMist));
      scattered += transmission * opacity * lighting;
      transmission *= 1.0 - opacity;
      if (transmission < 0.055) break;
    }
    rayDistance += stepLength;
  }

  float viewDistance = entry + distanceInVolume * 0.5;
  float clipFade = 1.0 - smoothstep(560.0, 740.0, viewDistance);
  float opacity = (1.0 - transmission) * viewFade * clipFade;
  if (opacity < 0.006) discard;
  // Distant banks share the sky's airlight instead of looking like separate
  // white objects sitting on the sea. This changes contrast, not coastal fog.
  float airlight = smoothstep(130.0, 500.0, viewDistance) * mix(0.28, 0.52, daylight);
  vec3 cloudColor = scattered / max(1.0 - transmission, 0.001);
  cloudColor = mix(cloudColor, skyColor, airlight * (1.0 - coastalMist));
  // Babylon's standard alpha blend expects straight, not premultiplied, RGB.
  gl_FragColor = vec4(cloudColor, opacity);
}`;

/** Bounded raymarched clouds and sea mist. The city itself stays cloud-free. */
export function createAtmosphere(scene: Scene, camera: ArcRotateCamera): AtmosphereControls {
  const mobile = isMobileDevice();
  const motionQuery = typeof window !== "undefined"
    ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  let reducedMotion = prefersReducedMotion();
  const onMotionPreference = () => { reducedMotion = motionQuery?.matches ?? false; };
  motionQuery?.addEventListener("change", onMotionPreference);

  const definitions: CloudBankDefinition[] = [
    { name: "east-cloud", center: new Vector3(174, 54, -74), size: new Vector3(126, 52, 76), mist: 0, seed: 3.1 },
    { name: "north-cloud", center: new Vector3(18, 62, -204), size: new Vector3(156, 58, 88), mist: 0, seed: 12.7 },
    { name: "west-cloud", center: new Vector3(-224, 72, 36), size: new Vector3(154, 61, 92), mist: 0, seed: 25.9 },
    { name: "south-cloud", center: new Vector3(42, 55, 194), size: new Vector3(144, 49, 90), mist: 0, seed: 41.2 },
    // Overlapping depths form an uneven sky field, with a lower bank visible
    // at the edge of the high overview and broader layers in a lower orbit.
    { name: "northeast-cloud", center: new Vector3(96, 34, -104), size: new Vector3(104, 39, 70), mist: 0, seed: 87.1, secondary: true, opacity: .88 },
    { name: "northwest-cloud", center: new Vector3(-144, 80, -238), size: new Vector3(152, 52, 92), mist: 0, seed: 102.6, secondary: true, opacity: .76 },
    { name: "east-high-cloud", center: new Vector3(298, 96, 94), size: new Vector3(182, 59, 106), mist: 0, seed: 119.3, secondary: true, mobile: false, opacity: .55 },
    { name: "west-low-cloud", center: new Vector3(-304, 58, -156), size: new Vector3(190, 46, 110), mist: 0, seed: 135.8, secondary: true, mobile: false, opacity: .5 },
    { name: "southwest-cloud", center: new Vector3(-176, 66, 242), size: new Vector3(176, 56, 112), mist: 0, seed: 154.2, secondary: true, mobile: false, opacity: .64 },
    { name: "southeast-high-cloud", center: new Vector3(224, 86, 234), size: new Vector3(164, 62, 110), mist: 0, seed: 178.4, secondary: true, mobile: false, opacity: .58 },
    { name: "north-sea-mist", center: new Vector3(48, 1.8, -67), size: new Vector3(70, 7, 24), mist: 1, seed: 56.4 },
    { name: "west-sea-mist", center: new Vector3(-75, 1.8, -32), size: new Vector3(25, 7, 55), mist: 1, seed: 72.3 },
  ];
  const daySunDirection = new Vector3(.38, 1, -.26).normalize();
  const nightSunDirection = new Vector3(.65, 1, -.45).normalize();
  const volumes = definitions.filter(definition => !mobile || definition.mobile !== false).map((definition) => {
    const mesh = MeshBuilder.CreateBox(`atmosphere-${definition.name}`, {
      width: definition.size.x, height: definition.size.y, depth: definition.size.z,
    }, scene);
    mesh.position.copyFrom(definition.center);
    mesh.isPickable = false;
    mesh.receiveShadows = false;
    mesh.freezeWorldMatrix();

    const material = new ShaderMaterial(`atmosphere-${definition.name}-material`, scene,
      { vertexSource, fragmentSource }, {
        attributes: ["position"],
        uniforms: ["world", "worldViewProjection", "cameraPosition", "volumeCenter", "halfExtent",
          "sunDirection", "litColor", "shadeColor", "skyColor", "time", "seed", "coastalMist", "viewFade", "daylight", "cloudScale"],
        defines: [`#define RAY_STEPS ${mobile ? 12 : definition.secondary ? 16 : 24}`, ...(mobile ? ["#define MOBILE_ATMOSPHERE"] : [])],
        needAlphaBlending: true,
      });
    // One front surface launches each ray; opaque terrain still depth-tests.
    material.backFaceCulling = true;
    material.disableDepthWrite = true;
    material.setVector3("volumeCenter", definition.center);
    material.setVector3("halfExtent", definition.size.scale(0.5));
    material.setVector3("sunDirection", daySunDirection);
    material.setFloat("seed", definition.seed);
    material.setFloat("coastalMist", definition.mist);
    material.setFloat("cloudScale", definition.mist ? 1 : 56 / definition.size.x);
    material.setFloat("viewFade", 1);
    material.setFloat("time", 0);
    mesh.material = material;
    return { mesh, material, definition };
  });

  let isDay = true;
  const setDayMode = (day: boolean) => {
    isDay = day;
    for (const { material, definition } of volumes) {
      material.setFloat("daylight", day ? 1 : 0);
      material.setVector3("sunDirection", day ? daySunDirection : nightSunDirection);
      material.setColor3("skyColor", new Color3(scene.clearColor.r, scene.clearColor.g, scene.clearColor.b));
      material.setColor3("litColor", Color3.FromHexString(day
        ? definition.mist ? "#D8EFFB" : "#FFFEF8"
        : definition.mist ? "#526C85" : "#94A8C2"));
      material.setColor3("shadeColor", Color3.FromHexString(day ? "#D5E8F5" : "#2C405B"));
    }
  };
  setDayMode(true);

  let time = 0;
  const update = () => {
    if (!reducedMotion) time += Math.min(scene.getEngine().getDeltaTime(), 80) * 0.001;
    const cameraPosition = camera.globalPosition;
    const cameraLength = Math.max(1, Math.hypot(cameraPosition.x - 2, cameraPosition.z - 2));
    const sightline = camera.target.subtract(cameraPosition);
    const sightlineLengthSquared = Math.max(1, sightline.lengthSquared());
    const smooth = (value: number) => {
      const t = Math.max(0, Math.min(1, value));
      return t * t * (3 - 2 * t);
    };
    for (const { mesh, material, definition } of volumes) {
      const center = definition.center;
      let fade = 1;
      if (definition.mist) {
        const bankLength = Math.hypot(center.x - 2, center.z - 2);
        const facingCamera = ((center.x - 2) * (cameraPosition.x - 2) + (center.z - 2) * (cameraPosition.z - 2)) / (bankLength * cameraLength);
        fade = smooth((.42 - facingCamera) / .85);
      } else {
        // Keep genuine foreground obstructions out of the city view without
        // making every cloud on the camera's side of the island disappear.
        const toBank = center.subtract(cameraPosition);
        const alongView = Vector3.Dot(toBank, sightline) / sightlineLengthSquared;
        if (alongView > 0 && alongView < 1) {
          const closest = cameraPosition.add(sightline.scale(alongView));
          const clearance = Math.hypot((center.x - closest.x) / (definition.size.x / 2 + 18),
            (center.y - closest.y) / (definition.size.y / 2 + 12), (center.z - closest.z) / (definition.size.z / 2 + 18));
          fade *= smooth((clearance - .25) / .95);
        }
        const outside = Math.hypot(Math.max(0, Math.abs(toBank.x) - definition.size.x / 2),
          Math.max(0, Math.abs(toBank.y) - definition.size.y / 2), Math.max(0, Math.abs(toBank.z) - definition.size.z / 2));
        fade *= smooth((outside - 6) / 20);
      }
      // Clear summer days keep the low sea mist out of the view; blue-hour
      // mist retains its existing softness when the lights come on.
      const opacity = definition.mist ? isDay ? 0 : .58 : definition.opacity ?? (isDay ? .97 : .9);
      mesh.setEnabled(fade * opacity > .012);
      material.setFloat("viewFade", fade * opacity);
      material.setFloat("time", time);
      material.setVector3("cameraPosition", cameraPosition);
    }
  };
  update();
  const observer = scene.onBeforeRenderObservable.add(update);
  let disposed = false;

  return {
    setDayMode,
    dispose: () => {
      if (disposed) return;
      disposed = true;
      scene.onBeforeRenderObservable.remove(observer);
      motionQuery?.removeEventListener("change", onMotionPreference);
      for (const { mesh, material } of volumes) {
        mesh.dispose();
        material.dispose();
      }
    },
  };
}
