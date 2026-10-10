import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { ShaderMaterial } from "@babylonjs/core/Materials/shaderMaterial";
import type { Scene } from "@babylonjs/core/scene";
import { prefersReducedMotion } from "../utils/device";

const vertexSource = /* glsl */ `
precision highp float;
attribute vec3 position;
uniform mat4 world;
uniform mat4 worldViewProjection;
varying vec3 worldPosition;
void main() {
  worldPosition = (world * vec4(position, 1.0)).xyz;
  gl_Position = worldViewProjection * vec4(position, 1.0);
}`;

const fragmentSource = /* glsl */ `
precision highp float;
varying vec3 worldPosition;
uniform vec3 cameraPosition;
uniform vec3 horizonColor;
uniform vec3 deepColor;
uniform vec3 shallowColor;
uniform vec3 reflectionColor;
uniform float daylight;
uniform float time;

void main() {
  vec2 p = worldPosition.xz;
  vec3 viewDirection = normalize(cameraPosition - worldPosition);
  float distanceToCamera = length(cameraPosition - worldPosition);

  // Broad swells and narrower crests travel together with a slow sea breeze.
  // Uneven phases break up parallel bands without making a crossing grid.
  // Only the fine ripples fade early; the swells remain visible in the overview.
  float fineDetail = 1.0 - smoothstep(110.0, 360.0, distanceToCamera);
  float mediumDetail = 1.0 - smoothstep(250.0, 520.0, distanceToCamera);
  float swell = dot(p, vec2(0.13, 0.045)) - time * 0.32
              + sin(dot(p, vec2(-0.032, 0.059)) + time * 0.08) * 0.65;
  float waveA = dot(p, vec2(0.36, 0.11)) - time * 0.58 + sin(swell) * 0.85
              + sin(dot(p, vec2(-0.025, 0.075)) + time * 0.11) * 0.7;
  float waveB = dot(p, vec2(0.19, 0.074)) - time * 0.39
              + cos(dot(p, vec2(-0.018, 0.057)) - time * 0.09) * 1.1;
  float waveC = dot(p, vec2(1.25, 0.62)) - time * 0.76 + sin(waveA) * 0.8;
  float waveD = dot(p, vec2(0.91, 0.48)) - time * 0.62 + sin(waveB) * 0.6;
  vec2 slope = vec2(0.13, 0.045) * cos(swell) * 0.48
             + vec2(0.36, 0.11) * cos(waveA) * 0.20
             + vec2(0.19, 0.074) * cos(waveB) * 0.16
             + (vec2(1.25, 0.62) * cos(waveC) * 0.025
             + vec2(0.91, 0.48) * cos(waveD) * 0.018) * fineDetail;
  vec3 normal = normalize(vec3(-slope.x, 1.0, -slope.y));

  // The same coastline equation as the terrain makes a continuous underwater
  // shelf, without a second opaque water ring or a visible boundary.
  vec2 coast = (p - vec2(2.0)) / vec2(64.0, 58.0);
  float angle = atan(coast.y, coast.x);
  float coastline = 1.0 + 0.085 * sin(angle * 3.0 + 0.6)
                    + 0.06 * cos(angle * 5.0) - 0.045 * cos(angle * 2.0);
  float coastRadius = length(coast) / coastline;
  float shelf = 1.0 - smoothstep(1.10, 1.38, coastRadius);
  vec3 water = mix(deepColor, shallowColor, shelf);
  float rollingLight = sin(swell) * 0.026 + sin(waveB) * 0.017
                     + sin(waveA) * 0.014 + sin(waveC) * 0.003 * fineDetail;
  water += vec3(0.78, 1.0, 0.94) * rollingLight * mix(0.65, 1.0, daylight);

  float fresnel = 0.04 + 0.96 * pow(1.0 - max(dot(normal, viewDirection), 0.0), 5.0);
  vec3 reflected = reflect(-viewDirection, normal);
  vec3 skyReflection = mix(horizonColor, reflectionColor, smoothstep(0.0, 0.75, reflected.y));
  water = mix(water, skyReflection, 0.12 + fresnel * 0.55);

  // Soft elongated highlights move with each crest, not a static sparkle map.
  float crestBreak = 0.45 + 0.55 * smoothstep(-0.55, 0.75,
    sin(dot(p, vec2(-0.055, 0.16)) + time * 0.14));
  float crest = pow(max(sin(waveA), 0.0), 6.0) * crestBreak * mediumDetail;
  water = mix(water, reflectionColor, crest * mix(0.13, 0.22, daylight));

  // Incoming wavelets follow the actual shore, washing into its sandy shelf.
  // Broken arcs and a broad fade avoid a bright, uniform outline of the island.
  float shoreDistance = (coastRadius - 1.135) * 60.0;
  float shoreBand = smoothstep(-0.3, 1.2, shoreDistance)
                  * (1.0 - smoothstep(7.0, 17.0, shoreDistance));
  float shorePhase = shoreDistance * 1.1 + time * 0.67
                   + sin(angle * 7.0) * 0.7 + sin(angle * 13.0 - time * 0.10) * 0.3;
  float shoreCrest = smoothstep(0.50, 0.96, sin(shorePhase));
  float shoreBreak = smoothstep(-0.45, 0.65,
    sin(angle * 13.0 + shoreDistance * 0.18 - time * 0.09)
    + sin(angle * 29.0 + time * 0.12) * 0.3);
  float wash = shoreCrest * shoreBand * (0.18 + shoreBreak * 0.82);
  vec3 foamColor = mix(vec3(0.46, 0.65, 0.72), vec3(0.83, 0.94, 0.88), daylight);
  water = mix(water, foamColor, wash * mix(0.26, 0.38, daylight) * mediumDetail);

  vec3 sunDirection = normalize(mix(vec3(0.65, 1.0, -0.45), vec3(0.38, 1.0, -0.26), daylight));
  vec3 halfDirection = normalize(sunDirection + viewDirection);
  float glint = pow(max(dot(normal, halfDirection), 0.0), 90.0);
  water += mix(vec3(0.25, 0.38, 0.52), vec3(1.0, 0.87, 0.66), daylight)
           * glint * mix(0.05, 0.12, daylight) * (0.2 + fresnel * 0.8) * fineDetail;

  // These are display-space colors, like scene.clearColor. Fully converge
  // before camera.maxZ clips the sea, avoiding a tone-mapped fog/sky seam.
  // Daytime water keeps its color well beyond the island. The far sea still
  // reaches the exact sky color before the camera's 800-unit clipping plane.
  float haze = smoothstep(mix(170.0, 290.0, daylight), mix(440.0, 700.0, daylight), distanceToCamera);
  gl_FragColor = vec4(mix(water, horizonColor, haze), 1.0);
}`;

/** A single continuous sea surface, including its feathered coastal shelf. */
export function createOceanMaterial(scene: Scene) {
  const material = new ShaderMaterial("island-ocean-water", scene,
    { vertexSource, fragmentSource }, {
      attributes: ["position"],
      uniforms: ["world", "worldViewProjection", "cameraPosition", "horizonColor",
        "deepColor", "shallowColor", "reflectionColor", "daylight", "time"],
    });
  material.setFloat("time", 0);
  material.setVector3("cameraPosition", Vector3.Zero());

  const setDayMode = (day: boolean) => {
    material.setFloat("daylight", day ? 1 : 0);
    material.setColor3("deepColor", Color3.FromHexString(day ? "#589EA8" : "#24495F"));
    material.setColor3("shallowColor", Color3.FromHexString(day ? "#98CDC0" : "#477A87"));
    material.setColor3("reflectionColor", Color3.FromHexString(day ? "#A8CEC9" : "#294960"));
    material.setColor3("horizonColor", new Color3(scene.clearColor.r, scene.clearColor.g, scene.clearColor.b));
  };
  setDayMode(true);

  let time = 0;
  const observer = scene.onBeforeRenderObservable.add(() => {
    if (!prefersReducedMotion()) time += Math.min(scene.getEngine().getDeltaTime(), 80) * .001;
    material.setFloat("time", time);
    if (scene.activeCamera) material.setVector3("cameraPosition", scene.activeCamera.globalPosition);
  });
  return {
    material,
    setDayMode,
    dispose() {
      scene.onBeforeRenderObservable.remove(observer);
      material.dispose();
    },
  };
}
