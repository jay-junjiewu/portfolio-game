import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Curve3 } from '@babylonjs/core/Maths/math.path';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { Material } from '@babylonjs/core/Materials/material';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { RawTexture } from '@babylonjs/core/Materials/Textures/rawTexture';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import type { Scene } from '@babylonjs/core/scene';
import type { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import { ISLAND_LAYOUT, WATERFRONT_GARDEN } from '../data/islandLayout';
import { CITY_TILE_SIZE } from '../data/cityLayout';
import { prefersReducedMotion } from '../utils/device';
import { getCityRoadEdge, mapCityHeading, mapCityPoint } from './cityTerrain';

type SandTrailSample = { x: number; z: number; halfWidth: number };

/** The terrain and its sandy accesses share the same irregular shoreline. */
export function coastalShorePoint(angle: number, radius = 1) {
  const shape = 1 + .085 * Math.sin(angle * 3 + .6) + .06 * Math.cos(angle * 5) - .045 * Math.cos(angle * 2);
  return { x: 2 + Math.cos(angle) * 64 * shape * radius, z: 2 + Math.sin(angle) * 58 * shape * radius };
}

const beachAccess = (name: string, start: [number, number], direction: [number, number], width: number, via?: [number, number]) => {
  const angle = Math.atan2((direction[1] - 2) / 58, (direction[0] - 2) / 64);
  const end = coastalShorePoint(angle, 1.097);
  return { name, angle, width, points: [start, ...(via ? [via] : []), [end.x, end.z] as [number, number]] };
};

// Short, flared accesses join the nearby shore; the inland promenades retain
// their established routes and furniture positions.
export const BEACH_CONNECTIONS = [
  beachAccess('southeast-beach', [44, -28], [44, -28], 7.2),
  beachAccess('northeast-beach', [46, 39], [46, 39], 8),
  beachAccess('southwest-beach', [-37, -40], [-37, -40], 7),
  beachAccess('lighthouse-beach', [51.3, -16], [56, -20], 6, [54.5, -19.3]),
];

/** A continuous dune slope meets the level mainland with a flat tangent. */
export function coastalGroundHeight(radius: number) {
  const t = Math.max(0, Math.min(1, (radius - 1) / .135));
  return -.05 - 1.71 * t * t * (3 - 2 * t);
}

export const COASTAL_TRAILS = {
  south: { points: [[-37, -40], [-29, -44], [-17, -43], [-7, -40], [7, -40], [21, -41], [35, -38], [44, -28]] as [number, number][], width: 4.4 },
  harbor: { points: [[-17, -43], [-20.5, -44], [-22.4, -45.8], [-23, -48]] as [number, number][], width: 3.8 },
  east: { points: [[44, -28], [44, -15], [45, -1], [45, 13], [46, 27], [46, 39]] as [number, number][], width: 4.25 },
  north: { points: [[-32, 39], [-18, 40.5], [-3, 44], [13, 46], [28, 48], [40, 45], [46, 39]] as [number, number][], width: 4.2 },
  lighthouse: { points: [[44, -15], [46.5, -14.8], [49.5, -16], [53, -15.9]] as [number, number][], width: 3.5 },
};
const coastClearanceRoutes = Object.values(COASTAL_TRAILS).map(route => ({
  width: route.width,
  points: Curve3.CreateCatmullRomSpline(route.points.map(([x, z]) => new Vector3(x, 0, z)), 20).getPoints(),
}));

// Describe the inland sand edge once around the coast. Nearby walks pull that
// boundary inland; broad angular falloffs avoid a chain of circular aprons.
const coastBoundaryResolution = 720;
const coastalSandBoundary = new Float32Array(coastBoundaryResolution).fill(1);
for (const route of coastClearanceRoutes) {
  for (const point of route.points) {
    const angle = Math.atan2((point.z - 2) / 58, (point.x - 2) / 64);
    const edge = coastalShorePoint(angle);
    const edgeDistance = Math.hypot(edge.x - 2, edge.z - 2);
    const pointDistance = Math.hypot(point.x - 2, point.z - 2);
    if (edgeDistance - pointDistance > 6.5) continue;
    const inset = Math.max(0, 1 - (pointDistance - route.width / 2 - .9) / edgeDistance);
    for (let index = 0; index < coastBoundaryResolution; index += 1) {
      const direction = index / coastBoundaryResolution * Math.PI * 2;
      const delta = Math.atan2(Math.sin(direction - angle), Math.cos(direction - angle));
      const distance = Math.abs(delta) * edgeDistance;
      if (distance > 18) continue;
      const influence = Math.exp(-distance * distance / 72);
      coastalSandBoundary[index] = Math.min(coastalSandBoundary[index], 1 - inset * influence);
    }
  }
}
// Smooth the boundary itself, rather than unioning many visible round caps.
const unfilteredBoundary = coastalSandBoundary.slice();
for (let index = 0; index < coastBoundaryResolution; index += 1) {
  let sum = 0;
  let total = 0;
  for (let offset = -8; offset <= 8; offset += 1) {
    const weight = Math.exp(-offset * offset / 24);
    sum += unfilteredBoundary[(index + offset + coastBoundaryResolution) % coastBoundaryResolution] * weight;
    total += weight;
  }
  coastalSandBoundary[index] = sum / total;
}

const coastNoise = (x: number, z: number, frequency: number) => {
  const px = x * frequency;
  const pz = z * frequency;
  const ix = Math.floor(px);
  const iz = Math.floor(pz);
  const fx = px - ix;
  const fz = pz - iz;
  const u = fx * fx * (3 - 2 * fx);
  const v = fz * fz * (3 - 2 * fz);
  const hash = (a: number, b: number) => {
    let value = Math.imul(a, 374761393) ^ Math.imul(b, 668265263);
    value = Math.imul(value ^ (value >>> 13), 1274126177);
    return ((value ^ (value >>> 16)) >>> 0) / 4294967295 * 2 - 1;
  };
  const a = hash(ix, iz);
  const b = hash(ix + 1, iz);
  const c = hash(ix, iz + 1);
  const d = hash(ix + 1, iz + 1);
  return (a + (b - a) * u) * (1 - v) + (c + (d - c) * u) * v;
};

/** Soft, irregular sand/grass intermix shared by every part of the coast. */
export function coastalSandCoverage(x: number, z: number) {
  const angle = Math.atan2((z - 2) / 58, (x - 2) / 64);
  const edge = coastalShorePoint(angle);
  const edgeDistance = Math.hypot(edge.x - 2, edge.z - 2);
  const radialDistance = Math.hypot(x - 2, z - 2);
  const coordinate = ((angle / (Math.PI * 2) + 1) % 1) * coastBoundaryResolution;
  const index = Math.floor(coordinate);
  const boundary = coastalSandBoundary[index] + (coastalSandBoundary[(index + 1) % coastBoundaryResolution] - coastalSandBoundary[index]) * (coordinate - index);
  let distance = radialDistance - boundary * edgeDistance;
  if (distance < -3) return 0;
  if (distance > 3) return 1;
  distance += coastNoise(x, z, .115) * .9 + coastNoise(x, z, .36) * .38 + coastNoise(x, z, 1.7) * .14;
  const t = Math.max(0, Math.min(1, (distance + 1.3) / 2.6));
  return t * t * (3 - 2 * t);
}

/** Forest trunks and shrubs leave room for the expanded coast trails. */
export function isClearOfCoastalTrails(x: number, z: number, padding = 0) {
  return coastClearanceRoutes.every(route => {
    const threshold = route.width / 2 + .2 + padding;
    for (let index = 1; index < route.points.length; index += 1) {
      const a = route.points[index - 1];
      const b = route.points[index];
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz)));
      if (Math.hypot(x - a.x - dx * t, z - a.z - dz * t) < threshold) return false;
    }
    return true;
  });
}

/** Mipmapped grain stays quiet at overview distance and visible near the beach. */
export function createCoastalTrailMaterial(scene: Scene, name: string) {
  const material = new StandardMaterial(name, scene);
  // Beach and trails share a softly dimmed white texture, with no beige tint.
  material.diffuseColor = Color3.FromHexString('#E9D6AF');
  material.specularColor = Color3.Black();
  material.transparencyMode = Material.MATERIAL_ALPHABLEND;
  material.disableDepthWrite = true;
  material.zOffsetUnits = -2;
  const size = 256;
  const pixels = new Uint8Array(size * size * 3);
  let seed = 90127;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      seed = Math.imul(seed, 1664525) + 1013904223 | 0;
      const grain = ((seed >>> 0) / 4294967295 - .5) * 4;
      const ripple = Math.sin(x / size * Math.PI * 8 + Math.sin(y / size * Math.PI * 4)) * .7;
      const offset = (y * size + x) * 3;
      pixels[offset] = pixels[offset + 1] = pixels[offset + 2] = 240 + grain + ripple;
    }
  }
  const texture = RawTexture.CreateRGBTexture(pixels, size, size, scene, true, false, Texture.TRILINEAR_SAMPLINGMODE);
  texture.name = `${name}-grain`;
  texture.wrapU = Texture.WRAP_ADDRESSMODE;
  texture.wrapV = Texture.WRAP_ADDRESSMODE;
  texture.anisotropicFilteringLevel = 4;
  texture.gammaSpace = false;
  material.diffuseTexture = texture;
  material.onDisposeObservable.add(() => texture.dispose());
  return material;
}

/** Retain each route's established profile for coverage and prop clearance. */
const sampleCoastalTrail = (
  points: [number, number][], width: number,
  options: { smooth?: boolean; startWidth?: number; endWidth?: number } = {},
) => {
  const controls = points.map(([x, z]) => new Vector3(x, -.035, z));
  const linearSteps = Math.max(3, Math.ceil(Vector3.Distance(controls[0], controls.at(-1)!) / .35));
  const vectors = options.smooth !== false && points.length > 2
    ? Curve3.CreateCatmullRomSpline(controls, 20).getPoints()
    : controls.length === 2
      ? Array.from({ length: linearSteps }, (_, index) => Vector3.Lerp(controls[0], controls[1], index / (linearSteps - 1)))
      : controls;
  const distances = [0];
  for (let index = 1; index < vectors.length; index += 1) distances.push(distances[index - 1] + Vector3.Distance(vectors[index - 1], vectors[index]));
  const length = distances.at(-1) || 1;
  const samples: SandTrailSample[] = [];
  const ease = (value: number) => {
    const t = Math.max(0, Math.min(1, value));
    return t * t * (3 - 2 * t);
  };
  vectors.forEach((point, index) => {
    const previous = vectors[Math.max(0, index - 1)];
    const next = vectors[Math.min(vectors.length - 1, index + 1)];
    const beforeX = point.x - previous.x;
    const beforeZ = point.z - previous.z;
    const afterX = next.x - point.x;
    const afterZ = next.z - point.z;
    const turn = beforeX * afterZ - beforeZ * afterX;
    const radius = Math.abs(turn) > 1e-10
      ? Math.hypot(beforeX, beforeZ) * Math.hypot(afterX, afterZ) * Math.hypot(next.x - previous.x, next.z - previous.z) / (2 * Math.abs(turn))
      : Infinity;
    const progress = distances[index] / length;
    const startTaper = 1 - ease(progress * 4);
    const endTaper = ease((progress - .75) * 4);
    const localWidth = width + ((options.startWidth ?? width) - width) * startTaper + ((options.endWidth ?? width) - width) * endTaper;
    const irregularity = Math.sin(progress * Math.PI);
    let widest = 0;
    for (const side of [-1, 0, 1]) {
      const variation = (Math.sin(distances[index] * .78 + side * 1.7) * .13 + Math.sin(distances[index] * 2.13 - side) * .045) * irregularity;
      const requestedHalfWidth = localWidth / 2 + variation;
      const halfWidth = side === Math.sign(turn) ? Math.min(requestedHalfWidth, radius * .78) : requestedHalfWidth;
      widest = Math.max(widest, halfWidth);
    }
    samples.push({ x: point.x, z: point.z, halfWidth: widest });
  });
  return samples;
};

type CoastalTrailProfile = { name: string; samples: SandTrailSample[]; flatStart?: boolean; flatEnd?: boolean };

/** One coverage field joins the whole trail network without overlapping caps. */
const createUnifiedCoastalSurface = (scene: Scene, profiles: CoastalTrailProfile[], material: StandardMaterial) => {
  const resolution = 2048;
  const feather = .28;
  const joinRadius = .65;
  const allSamples = profiles.flatMap(profile => profile.samples);
  for (let index = 0; index < 224; index += 1) {
    const point = coastalShorePoint(index / 224 * Math.PI * 2, 1.14);
    allSamples.push({ ...point, halfWidth: 1 });
  }
  const minX = Math.floor(Math.min(...allSamples.map(point => point.x - point.halfWidth)) - 1);
  const minZ = Math.floor(Math.min(...allSamples.map(point => point.z - point.halfWidth)) - 1);
  const maxX = Math.ceil(Math.max(...allSamples.map(point => point.x + point.halfWidth)) + 1);
  const maxZ = Math.ceil(Math.max(...allSamples.map(point => point.z + point.halfWidth)) + 1);
  const spanX = maxX - minX;
  const spanZ = maxZ - minZ;
  const pixelsPerX = resolution / spanX;
  const pixelsPerZ = resolution / spanZ;
  const signedDistance = new Float32Array(resolution * resolution).fill(Infinity);
  const routeDistance = new Float32Array(resolution * resolution);
  const clampPixel = (value: number) => Math.max(0, Math.min(resolution - 1, value));

  for (const profile of profiles) {
    routeDistance.fill(Infinity);
    let routeMinX = resolution - 1;
    let routeMinZ = resolution - 1;
    let routeMaxX = 0;
    let routeMaxZ = 0;
    for (let index = 1; index < profile.samples.length; index += 1) {
      const a = profile.samples[index - 1];
      const b = profile.samples[index];
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const lengthSquared = dx * dx + dz * dz;
      if (lengthSquared < 1e-10) continue;
      const padding = Math.max(a.halfWidth, b.halfWidth) + joinRadius;
      const x0 = clampPixel(Math.floor((Math.min(a.x, b.x) - padding - minX) * pixelsPerX));
      const z0 = clampPixel(Math.floor((Math.min(a.z, b.z) - padding - minZ) * pixelsPerZ));
      const x1 = clampPixel(Math.ceil((Math.max(a.x, b.x) + padding - minX) * pixelsPerX));
      const z1 = clampPixel(Math.ceil((Math.max(a.z, b.z) + padding - minZ) * pixelsPerZ));
      routeMinX = Math.min(routeMinX, x0);
      routeMinZ = Math.min(routeMinZ, z0);
      routeMaxX = Math.max(routeMaxX, x1);
      routeMaxZ = Math.max(routeMaxZ, z1);
      for (let pz = z0; pz <= z1; pz += 1) {
        const z = minZ + (pz + .5) / pixelsPerZ;
        for (let px = x0; px <= x1; px += 1) {
          const x = minX + (px + .5) / pixelsPerX;
          const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / lengthSquared));
          const distance = Math.hypot(x - a.x - dx * t, z - a.z - dz * t) - a.halfWidth - (b.halfWidth - a.halfWidth) * t;
          const pixel = pz * resolution + px;
          routeDistance[pixel] = Math.min(routeDistance[pixel], distance);
        }
      }
    }
    const first = profile.samples[0];
    const second = profile.samples[1];
    const last = profile.samples.at(-1)!;
    const penultimate = profile.samples.at(-2)!;
    const startLength = Math.hypot(second.x - first.x, second.z - first.z);
    const endLength = Math.hypot(last.x - penultimate.x, last.z - penultimate.z);
    for (let pz = routeMinZ; pz <= routeMaxZ; pz += 1) {
      const z = minZ + (pz + .5) / pixelsPerZ;
      for (let px = routeMinX; px <= routeMaxX; px += 1) {
        const pixel = pz * resolution + px;
        let distance = routeDistance[pixel];
        if (!Number.isFinite(distance)) continue;
        const x = minX + (px + .5) / pixelsPerX;
        // Flat terminals meet city curbs, the dock and lighthouse footing
        // without rounding the sand into their neighbouring surfaces.
        if (profile.flatStart) distance = Math.max(distance, -((x - first.x) * (second.x - first.x) + (z - first.z) * (second.z - first.z)) / startLength);
        if (profile.flatEnd) distance = Math.max(distance, ((x - last.x) * (last.x - penultimate.x) + (z - last.z) * (last.z - penultimate.z)) / endLength);
        const existing = signedDistance[pixel];
        if (!Number.isFinite(existing)) {
          signedDistance[pixel] = distance;
        } else {
          // A small smooth union rounds re-entrant corners at T-junctions.
          // It operates between whole routes, so sampling density never
          // changes the width of an ordinary stretch of trail.
          const blend = Math.max(0, joinRadius - Math.abs(existing - distance)) / joinRadius;
          signedDistance[pixel] = Math.min(existing, distance) - blend * blend * joinRadius * .25;
        }
      }
    }
  }

  const mask = new Uint8Array(resolution * resolution);
  const cellsX = Math.ceil(spanX);
  const cellsZ = Math.ceil(spanZ);
  const activeCells = new Uint8Array(cellsX * cellsZ);
  for (let pz = 0; pz < resolution; pz += 1) {
    for (let px = 0; px < resolution; px += 1) {
      const pixel = pz * resolution + px;
      const t = Math.max(0, Math.min(1, -signedDistance[pixel] / feather));
      const x = minX + (px + .5) / pixelsPerX;
      const z = minZ + (pz + .5) / pixelsPerZ;
      const alpha = Math.round(Math.max(t * t * (3 - 2 * t), coastalSandCoverage(x, z)) * 255);
      mask[pixel] = alpha;
      if (alpha) activeCells[Math.min(cellsZ - 1, Math.floor(pz / resolution * cellsZ)) * cellsX + Math.min(cellsX - 1, Math.floor(px / resolution * cellsX))] = 1;
    }
  }
  const opacity = RawTexture.CreateAlphaTexture(mask, resolution, resolution, scene, true, false, Texture.TRILINEAR_SAMPLINGMODE);
  opacity.name = 'district-unified-trail-coverage';
  opacity.coordinatesIndex = 1;
  opacity.wrapU = opacity.wrapV = Texture.CLAMP_ADDRESSMODE;
  opacity.anisotropicFilteringLevel = 4;
  material.opacityTexture = opacity;
  material.onDisposeObservable.add(() => opacity.dispose());

  const data = new VertexData();
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const uvs2: number[] = [];
  const indices: number[] = [];
  const terrain = ['lawn']
    .map(name => scene.getMeshByName(`island-${name}`)).filter(mesh => mesh !== null);
  if (terrain.length) {
    // Use the terrain's actual triangles. The sand then follows every ramp
    // and shoreline facet exactly, rather than bridging them with a flat grid.
    for (const ground of terrain) {
      const groundPositions = ground.getVerticesData('position')!;
      const groundNormals = ground.getVerticesData('normal')!;
      const groundIndices = ground.getIndices()!;
      const offset = positions.length / 3;
      for (let index = 0; index < groundPositions.length; index += 3) {
        const x = groundPositions[index];
        const z = groundPositions[index + 2];
        positions.push(x, groundPositions[index + 1] + .015, z);
        normals.push(groundNormals[index], groundNormals[index + 1], groundNormals[index + 2]);
        uvs.push(x / 7, z / 7);
        uvs2.push((x - minX) / spanX, (z - minZ) / spanZ);
      }
      for (let index = 0; index < groundIndices.length; index += 3) {
        const a = groundIndices[index] * 3;
        const b = groundIndices[index + 1] * 3;
        const c = groundIndices[index + 2] * 3;
        const area = (groundPositions[b] - groundPositions[a]) * (groundPositions[c + 2] - groundPositions[a + 2])
          - (groundPositions[b + 2] - groundPositions[a + 2]) * (groundPositions[c] - groundPositions[a]);
        if (Math.abs(area) < 1e-8) continue;
        indices.push(offset + groundIndices[index], offset + groundIndices[index + 1], offset + groundIndices[index + 2]);
      }
    }
  } else {
  // A flat fallback also lets the district be previewed independently.
  for (let cz = 0; cz < cellsZ; cz += 1) {
    for (let cx = 0; cx < cellsX; cx += 1) {
      // Include one surrounding cell so filtering can feather across a cell
      // boundary. Every cell is emitted once; there are no coplanar overlaps.
      let active = false;
      for (let dz = -1; dz <= 1 && !active; dz += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          const nx = cx + dx;
          const nz = cz + dz;
          if (nx >= 0 && nx < cellsX && nz >= 0 && nz < cellsZ && activeCells[nz * cellsX + nx]) active = true;
        }
      }
      if (!active) continue;
      const start = positions.length / 3;
      for (const [dx, dz] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
        const u = (cx + dx) / cellsX;
        const v = (cz + dz) / cellsZ;
        const x = minX + u * spanX;
        const z = minZ + v * spanZ;
        positions.push(x, -.035, z);
        normals.push(0, 1, 0);
        uvs.push(x / 7, z / 7);
        uvs2.push(u, v);
      }
      indices.push(start, start + 1, start + 2, start + 1, start + 3, start + 2);
    }
  }
  }
  data.positions = positions;
  data.normals = normals;
  data.uvs = uvs;
  data.uvs2 = uvs2;
  data.indices = indices;
  const mesh = new Mesh('district-unified-coastal-trails', scene);
  data.applyToMesh(mesh);
  mesh.metadata = { coastalTrail: true, coverageResolution: resolution, routeCount: profiles.length, routeNames: profiles.map(profile => profile.name), coverageBounds: { minX, minZ, spanX, spanZ }, conformsToTerrain: terrain.length > 0 };
  return mesh;
};

/** Curving public walks connect the softened city edge to its coastline. */
export function createDistrictDetails(scene: Scene, shadows: ShadowGenerator) {
  const ownedMeshes: Mesh[] = [];
  const ownedMaterials: StandardMaterial[] = [];
  const batches = new Map<string, { meshes: Mesh[]; cast: boolean }>();
  const material = (name: string, color: string) => {
    const mat = new StandardMaterial(`district-${name}`, scene);
    mat.diffuseColor = Color3.FromHexString(color);
    mat.specularColor = Color3.Black();
    ownedMaterials.push(mat);
    return mat;
  };
  const pavement = material('limestone', '#d9caae');
  const trailSand = createCoastalTrailMaterial(scene, 'district-coastal-sand');
  ownedMaterials.push(trailSand);
  const trim = material('stone-edging', '#b6b9a5');
  const wood = material('cedar', '#927055');
  const iron = material('park-iron', '#345452');
  const water = material('fountain-water', '#71b9b7');
  water.specularColor = Color3.FromHexString('#93c7c8');
  const leaves = ['#4F8264', '#709A69', '#81A575', '#568C78'].map((color, index) => material(`garden-green-${index}`, color));
  const flowers = ['#d99e7c', '#ebcd85', '#adadc7'].map((color, index) => material(`flowers-${index}`, color));
  const lamps = material('warm-lanterns', '#ffdda0');
  lamps.disableLighting = true;
  lamps.emissiveColor = Color3.FromHexString('#ffd392').scale(.2);
  const streetBulbs = material('streetlight-bulbs', '#ffdda0');
  streetBulbs.disableLighting = true;
  streetBulbs.emissiveColor = Color3.FromHexString('#ffce8b');
  streetBulbs.alpha = 0;
  const lightPools = material('streetlight-pools', '#e6b578');
  lightPools.disableLighting = true;
  lightPools.emissiveColor = Color3.FromHexString('#e6b578');
  lightPools.alpha = 0;
  lightPools.disableDepthWrite = true;
  lightPools.transparencyMode = Material.MATERIAL_ALPHABLEND;
  // Keep the translucent glow above road paint even at the distant phone
  // overview. Its opacity reaches zero before the quad's geometric boundary.
  lightPools.zOffsetUnits = -7;
  const falloffSize = 128;
  const falloffPixels = new Uint8Array(falloffSize * falloffSize);
  for (let py = 0; py < falloffSize; py += 1) {
    for (let px = 0; px < falloffSize; px += 1) {
      const radius = Math.hypot((px + .5) / falloffSize * 2 - 1, (py + .5) / falloffSize * 2 - 1);
      const edge = Math.max(0, Math.min(1, (radius - .58) / .32));
      const fade = Math.exp(-3.8 * radius * radius) * (1 - edge * edge * (3 - 2 * edge));
      falloffPixels[py * falloffSize + px] = Math.round(fade * 255);
    }
  }
  const lightFalloff = RawTexture.CreateAlphaTexture(falloffPixels, falloffSize, falloffSize, scene, true, false, Texture.TRILINEAR_SAMPLINGMODE);
  lightFalloff.name = 'district-streetlight-falloff';
  lightFalloff.wrapU = lightFalloff.wrapV = Texture.CLAMP_ADDRESSMODE;
  lightFalloff.anisotropicFilteringLevel = 4;
  lightPools.opacityTexture = lightFalloff;
  lightPools.onDisposeObservable.add(() => lightFalloff.dispose());

  const finish = (mesh: Mesh, mat: StandardMaterial, cast = false, animated = false) => {
    mesh.material = mat;
    mesh.isPickable = false;
    mesh.receiveShadows = true;
    ownedMeshes.push(mesh);
    if (animated) return mesh;
    const key = `${mat.uniqueId}-${cast}-${mesh.getVerticesDataKinds().sort().join(',')}`;
    const group = batches.get(key) ?? { meshes: [], cast };
    group.meshes.push(mesh);
    batches.set(key, group);
    return mesh;
  };
  const box = (name: string, x: number, y: number, z: number, width: number, height: number, depth: number, mat: StandardMaterial, cast = true) => {
    const mesh = MeshBuilder.CreateBox(`district-${name}`, { width, height, depth }, scene);
    mesh.position.set(x, y, z);
    return finish(mesh, mat, cast);
  };
  const cylinder = (name: string, x: number, y: number, z: number, diameter: number, height: number, mat: StandardMaterial, cast = false) => {
    const mesh = MeshBuilder.CreateCylinder(`district-${name}`, { diameter, height, tessellation: 32 }, scene);
    mesh.position.set(x, y, z);
    return finish(mesh, mat, cast);
  };
  const trailSamples: SandTrailSample[][] = [];
  const trailProfiles: CoastalTrailProfile[] = [];
  const path = (name: string, points: [number, number][], width: number, options: { smooth?: boolean; startWidth?: number; endWidth?: number; flatStart?: boolean; flatEnd?: boolean } = {}) => {
    const samples = sampleCoastalTrail(points, width, options);
    trailSamples.push(samples);
    trailProfiles.push({ name, samples, flatStart: options.flatStart, flatEnd: options.flatEnd });
  };

  const streetGate = (name: string, streetX: number, streetZ: number, outwardX: number, outwardZ: number, end: [number, number]) => {
    // Use the generated pavement boundary, so corner walks meet their rounded
    // curb rather than the obsolete edge of a square source tile.
    const edge = getCityRoadEdge(streetX, streetZ, outwardX, outwardZ);
    const outward = new Vector3(edge.outwardX, 0, edge.outwardZ);
    const start = new Vector3(edge.x, .009, edge.z).add(outward.scale(.025));
    const finish = new Vector3(end[0], .009, end[1]);
    const chord = finish.subtract(start);
    const handleLength = chord.length() / 3;
    const firstHandle = start.add(outward.scale(handleLength));
    const secondHandle = finish.subtract(chord.normalize().scale(handleLength));
    const points = Curve3.CreateCubicBezier(start, firstHandle, secondHandle, finish, 24).getPoints();
    path(name, points.map(point => [point.x, point.z]), 3.35, { smooth: false, startWidth: 2.35, endWidth: 3.6, flatStart: true });
  };
  // Shared control points make every branch meet the promenade exactly. Gate
  // starts use the same deformation as the outer avenues and their cars.
  path('south-promenade', COASTAL_TRAILS.south.points, COASTAL_TRAILS.south.width);
  path('harbor-walk', COASTAL_TRAILS.harbor.points, COASTAL_TRAILS.harbor.width, { endWidth: 3.15, flatEnd: true });
  streetGate('west-city-connection', -30, -30, 0, -1, [-37, -40]);
  streetGate('central-city-connection', -6, -30, 0, -1, [-7, -40]);
  streetGate('east-city-connection', 18, -30, 0, -1, [21, -41]);
  path('east-promenade', COASTAL_TRAILS.east.points, COASTAL_TRAILS.east.width);
  streetGate('east-street-gate', 34, 10, 1, 0, [45, 13]);
  path('north-promenade', COASTAL_TRAILS.north.points, COASTAL_TRAILS.north.width);
  streetGate('north-street-gate', -18, 34, 0, 1, [-18, 40.5]);
  streetGate('northeast-street-gate', 34, 34, 0, 1, [40, 45]);
  path('lighthouse-walk', COASTAL_TRAILS.lighthouse.points, COASTAL_TRAILS.lighthouse.width, { startWidth: 4.1, endWidth: 3.1 });
  path('lighthouse-approach', [[53, -15.9], [53, -14.5]], 3.1, { endWidth: 2.6, flatEnd: true });
  finish(createUnifiedCoastalSurface(scene, trailProfiles, trailSand), trailSand);

  // Keep the wider sandy walking surface clear while retaining each existing
  // rest stop's neighbourhood. Moving its furniture is gentler than pinching
  // the trail around every lamp post or planter.
  const clearTrail = (initialX: number, initialZ: number, clearance: number) => {
    let x = initialX;
    let z = initialZ;
    for (let iteration = 0; iteration < 6; iteration += 1) {
      let correction = 0;
      let pushX = 0;
      let pushZ = 0;
      for (const samples of trailSamples) {
        for (let index = 1; index < samples.length; index += 1) {
          const a = samples[index - 1];
          const b = samples[index];
          const dx = b.x - a.x;
          const dz = b.z - a.z;
          const lengthSquared = dx * dx + dz * dz;
          if (lengthSquared < 1e-8) continue;
          const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / lengthSquared));
          const px = a.x + dx * t;
          const pz = a.z + dz * t;
          const distance = Math.hypot(x - px, z - pz);
          const overlap = a.halfWidth + (b.halfWidth - a.halfWidth) * t + clearance - distance;
          if (overlap <= correction) continue;
          correction = overlap;
          if (distance > .001) {
            pushX = (x - px) / distance;
            pushZ = (z - pz) / distance;
          } else {
            const side = Math.sign(-dz * (x - 2) + dx * (z - 2)) || 1;
            pushX = -dz / Math.sqrt(lengthSquared) * side;
            pushZ = dx / Math.sqrt(lengthSquared) * side;
          }
        }
      }
      if (correction < .001) break;
      x += pushX * (correction + .035);
      z += pushZ * (correction + .035);
    }
    return { x, z };
  };

  const gx = WATERFRONT_GARDEN.x;
  const gz = WATERFRONT_GARDEN.z;
  cylinder('garden-plaza-edge', gx, -.015, gz, 12.6, .1, trim);
  cylinder('garden-plaza', gx, .018, gz, 12.1, .1, pavement);
  cylinder('fountain-footing', gx, .14, gz, 4.6, .18, trim);
  cylinder('fountain-basin', gx, .34, gz, 4.1, .4, pavement, true);
  const surface = MeshBuilder.CreateDisc('district-fountain-surface', { radius: 1.78, tessellation: 40 }, scene);
  surface.rotation.x = Math.PI / 2;
  surface.position.set(gx, .55, gz);
  finish(surface, water);
  cylinder('fountain-stem', gx, 1.08, gz, .3, 1.2, pavement, true);
  const bowl = MeshBuilder.CreateCylinder('district-fountain-bowl', { diameterTop: 1.8, diameterBottom: .48, height: .35, tessellation: 32 }, scene);
  bowl.position.set(gx, 1.65, gz);
  finish(bowl, pavement, true);
  cylinder('fountain-top-water', gx, 1.835, gz, 1.57, .025, water);
  const waterRings = [0, 1, 2].map(index => {
    const ring = MeshBuilder.CreateTorus(`fountain-ripple-${index}`, { diameter: 1.2 + index * .85, thickness: .024, tessellation: 32 }, scene);
    ring.position.set(gx, .568, gz);
    return finish(ring, water, false, true);
  });
  for (let i = 0; i < 4; i += 1) {
    const angle = i * Math.PI / 2;
    const jetPath = Array.from({ length: 13 }, (_, index) => {
      const t = index / 12;
      const radius = .64 + t * .68;
      return new Vector3(gx + Math.cos(angle) * radius, 1.81 + Math.sin(t * Math.PI) * .16 - t * 1.24, gz + Math.sin(angle) * radius);
    });
    finish(MeshBuilder.CreateTube(`district-fountain-stream-${i}`, { path: jetPath, radius: .027, tessellation: 5 }, scene), water);
  }

  const bench = (x: number, z: number, rotation = 0, avoidTrail = true) => {
    if (avoidTrail) ({ x, z } = clearTrail(x, z, .95));
    const transform = (localX: number, localZ: number) => [x + Math.cos(rotation) * localX + Math.sin(rotation) * localZ, z - Math.sin(rotation) * localX + Math.cos(rotation) * localZ];
    const seat = box('bench-seat', x, .55, z, 2, .14, .65, wood);
    seat.rotation.y = rotation;
    const [backX, backZ] = transform(0, .27);
    const back = box('bench-back', backX, .98, backZ, 2, .55, .12, wood);
    back.rotation.y = rotation;
    for (const side of [-.7, .7]) {
      const [legX, legZ] = transform(side, 0);
      const leg = box('bench-leg', legX, .25, legZ, .14, .48, .58, iron);
      leg.rotation.y = rotation;
    }
  };
  for (const [x, z, rotation] of [[-31, -46, 0], [16, -43, -.1], [29, -42, -.2], [-8, 44, Math.PI], [11, 48, Math.PI], [28, 50, Math.PI], [42, 43, -.6], [47, 10, -Math.PI / 2]]) bench(x, z, rotation);
  for (const [dx, dz, rotation] of [[-4.5, 0, Math.PI / 2], [4.5, 0, -Math.PI / 2], [0, -4.5, Math.PI]]) bench(gx + dx, gz + dz, rotation, false);

  const tree = (x: number, z: number, index: number) => {
    ({ x, z } = clearTrail(x, z, .85));
    const scale = .8 + (index % 3) * .06;
    cylinder('garden-trunk', x, 1.25 * scale, z, .28 * scale, 2.6 * scale, wood, true);
    const lobes = [[0, 3.1, 0, 1.48, 1.8, 1.36], [.85, 2.95, .22, 1.05, 1.23, 1.1], [-.56, 4, -.25, .9, 1.25, .9]];
    lobes.forEach(([dx, y, dz, sx, sy, sz], lobe) => {
      const crown = MeshBuilder.CreateSphere('district-garden-canopy', { diameter: 2, segments: 5 }, scene);
      crown.position.set(x + dx * scale, y * scale, z + dz * scale);
      crown.scaling.set(sx * scale, sy * scale, sz * scale);
      finish(crown, leaves[(index + (lobe === 1 ? 1 : 0)) % leaves.length], true);
    });
    cylinder('tree-planter', x, .12, z, 1.4, .3, trim);
  };
  const trees = [
    [-36, -44], [-27, -44], [-16, -46], [-9, -44], [11, -42], [21, -39], [31, -35], [39, -29],
    [-9, -47], [9, -47], [-28, 38], [-17, 42], [-4, 46], [12, 49], [26, 51], [38, 45],
    [48, -25], [48, -3], [48, 12], [47, 30],
  ];
  trees.forEach(([x, z], index) => tree(x, z, index));
  for (let bed = 0; bed < 6; bed += 1) {
    const angle = bed / 6 * Math.PI * 2;
    const { x, z } = clearTrail(gx + Math.cos(angle) * 6.8, gz + Math.sin(angle) * 6.8, .85);
    cylinder('flower-bed', x, .11, z, 1.45, .25, trim);
    for (let bloom = 0; bloom < 7; bloom += 1) {
      const a = bloom / 7 * Math.PI * 2;
      const flower = MeshBuilder.CreateSphere('district-flowers', { diameter: .35, segments: 3 }, scene);
      flower.position.set(x + Math.cos(a) * .39, .35, z + Math.sin(a) * .39);
      finish(flower, flowers[(bed + bloom) % flowers.length]);
    }
  }

  const pool = (x: number, z: number, radius: number, y: number, fixtureId: string) => {
    const glow = MeshBuilder.CreateGround('district-warm-light-pool', { width: radius * 2, height: radius * 2 }, scene);
    glow.position.set(x, y, z);
    glow.metadata = { lightPool: { fixtureId, x, y, z, radius } };
    finish(glow, lightPools);
  };
  const lantern = (x: number, z: number) => {
    ({ x, z } = clearTrail(x, z, .36));
    cylinder('promenade-lamp-post', x, 1.25, z, .1, 2.5, iron, true);
    cylinder('promenade-lamp-foot', x, .08, z, .4, .16, iron);
    box('promenade-lantern', x, 2.59, z, .33, .44, .33, lamps, false);
    box('promenade-lantern-cap', x, 2.85, z, .48, .1, .48, iron);
    pool(x, z, 2.5, .085, `promenade-${x.toFixed(3)}-${z.toFixed(3)}`);
  };
  for (const [x, z] of [[-35, -39.8], [-28, -42.8], [-17, -41.8], [-6, -38.8], [8, -38.8], [22, -39.8], [36, -36.8], [-28, 38.8], [-15, 39.2], [-1, 42.2], [14, 44.8], [28, 46.8], [41, 42], [42.8, -21], [43.5, -7], [43.8, 8], [44.7, 26]]) lantern(x, z);
  lantern(-23, -44);
  lantern(-5.4, -45);
  lantern(5.4, -45);

  // All placed road lights use this curved asset: footprint .225, lens
  // underside y=.652778, extending from z=-.2 to the taper at z=-.1.
  // A slim visible lower rim lets the lens read from above without replacing
  // the opaque cap. Each fixture illuminates the road directly beneath it.
  ISLAND_LAYOUT.filter(entry => entry.modelPath.endsWith('/light-curved.obj')).forEach(entry => {
    const scale = (entry.targetScale ?? 1) / .225;
    const originalX = entry.position.x + CITY_TILE_SIZE / 2;
    const originalZ = entry.position.z + CITY_TILE_SIZE / 2;
    const root = mapCityPoint(originalX, originalZ);
    const rotation = mapCityHeading(originalX, originalZ, entry.rotation?.y ?? 0);
    const x = root.x - Math.sin(rotation) * .157 * scale;
    const z = root.z - Math.cos(rotation) * .157 * scale;
    const y = (entry.position.y ?? 0) + .6485 * scale;
    const bulb = box('streetlight-bulb', x, y, z, .058 * scale, .016 * scale, .086 * scale, streetBulbs, false);
    bulb.rotation.y = rotation;
    bulb.metadata = { streetlightFixture: { fixtureId: entry.id, x, y, z } };
    pool(x, z, 2.35, .025, entry.id);
  });

  for (const { meshes, cast } of batches.values()) {
    const streetlightFixtures = meshes.flatMap(mesh => mesh.metadata?.streetlightFixture ? [mesh.metadata.streetlightFixture] : []);
    const lightPoolFixtures = meshes.flatMap(mesh => mesh.metadata?.lightPool ? [mesh.metadata.lightPool] : []);
    const merged = meshes.length === 1 ? meshes[0] : Mesh.MergeMeshes(meshes, true, true);
    if (!merged) continue;
    merged.name = `district-batched-${merged.material?.name}`;
    merged.isPickable = false;
    merged.receiveShadows = true;
    if (streetlightFixtures.length || lightPoolFixtures.length) merged.metadata = { streetlightFixtures, lightPoolFixtures };
    merged.freezeWorldMatrix();
    if (meshes.length > 1) ownedMeshes.push(merged);
    if (cast) shadows.addShadowCaster(merged);
  }
  let time = 0;
  const observer = scene.onBeforeRenderObservable.add(() => {
    if (prefersReducedMotion()) return;
    time += Math.min(scene.getEngine().getDeltaTime(), 60) * .0004;
    waterRings.forEach((ring, index) => {
      const scale = .72 + ((time + index / 3) % 1) * .28;
      ring.scaling.set(scale, 1, scale);
    });
  });

  return {
    setDayMode(isDay: boolean) {
      lamps.emissiveColor = Color3.FromHexString('#ffd392').scale(isDay ? .2 : 1.45);
      streetBulbs.alpha = isDay ? 0 : 1;
      streetBulbs.emissiveColor = Color3.FromHexString('#ffce8b').scale(isDay ? .1 : 1.55);
      lightPools.alpha = isDay ? 0 : .3;
    },
    dispose() {
      scene.onBeforeRenderObservable.remove(observer);
      ownedMeshes.forEach(mesh => { if (!mesh.isDisposed()) mesh.dispose(); });
      ownedMaterials.forEach(mat => mat.dispose());
    },
  };
}
