import type { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { VertexBuffer } from "@babylonjs/core/Buffers/buffer";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Scene } from "@babylonjs/core/scene";
import { coastalShorePoint } from "./districtDetails";

/**
 * "Take a tour" as a drone flight: one continuous, smoothed loop over the
 * island (along the beach, then across the city over the streets) with the
 * camera looking ahead like a gimbal. A coarse height map of the scenery
 * keeps the drone above rooftops and trees, and a little hover drift sells it.
 */

const CELL = 2;
const GRID_HALF = 90;
const GRID_SIZE = Math.ceil((GRID_HALF * 2) / CELL);
const CLEARANCE = 3;

/** Max height of solid scenery per 2x2 cell, so the drone can stay above it. */
const buildHeightMap = (scene: Scene) => {
  const grid = new Float32Array(GRID_SIZE * GRID_SIZE).fill(-Infinity);
  const cellIndex = (x: number, z: number) => {
    const cx = Math.floor((x + GRID_HALF) / CELL);
    const cz = Math.floor((z + GRID_HALF) / CELL);
    if (cx < 0 || cz < 0 || cx >= GRID_SIZE || cz >= GRID_SIZE) return -1;
    return cz * GRID_SIZE + cx;
  };
  const raise = (x: number, z: number, y: number) => {
    const index = cellIndex(x, z);
    if (index >= 0 && y > grid[index]) grid[index] = y;
  };

  const solid = (mesh: AbstractMesh) =>
    mesh.isEnabled() && mesh.isVisible && mesh.getTotalVertices() > 0 && !/label|glow|atmosphere|ocean|cloud|sky/i.test(mesh.name);

  for (const mesh of scene.meshes) {
    if (!solid(mesh)) continue;
    mesh.computeWorldMatrix(true);
    const box = mesh.getBoundingInfo().boundingBox;
    const min = box.minimumWorld;
    const max = box.maximumWorld;
    if (min.y > 14) continue; // floating things (birds, clouds, labels)
    const spanX = max.x - min.x;
    const spanZ = max.z - min.z;
    if (spanX <= 24 && spanZ <= 24) {
      // A single object: its box is a good enough footprint.
      for (let x = min.x; x <= max.x + CELL; x += CELL) {
        for (let z = min.z; z <= max.z + CELL; z += CELL) raise(Math.min(x, max.x), Math.min(z, max.z), max.y);
      }
      continue;
    }
    // Large merged scenery: sample its vertices instead of its whole box.
    const positions = mesh.getVerticesData(VertexBuffer.PositionKind);
    if (!positions) continue;
    const world = mesh.getWorldMatrix();
    const point = new Vector3();
    for (let i = 0; i < positions.length; i += 3) {
      Vector3.TransformCoordinatesFromFloatsToRef(positions[i], positions[i + 1], positions[i + 2], world, point);
      raise(point.x, point.z, point.y);
    }
  }

  /** Highest scenery within `radius` of (x, z). */
  return (x: number, z: number, radius = 4) => {
    let top = 0;
    for (let dx = -radius; dx <= radius; dx += CELL) {
      for (let dz = -radius; dz <= radius; dz += CELL) {
        const index = cellIndex(x + dx, z + dz);
        if (index >= 0 && grid[index] > top) top = grid[index];
      }
    }
    return top;
  };
};

/** Uniform Catmull-Rom between p1 and p2. */
const catmullRom = (p0: Vector3, p1: Vector3, p2: Vector3, p3: Vector3, t: number, out: Vector3) => {
  const t2 = t * t;
  const t3 = t2 * t;
  const f = (a: number, b: number, c: number, d: number) =>
    0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
  out.set(f(p0.x, p1.x, p2.x, p3.x), f(p0.y, p1.y, p2.y, p3.y), f(p0.z, p1.z, p2.z, p3.z));
  return out;
};

const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

/** A point on the flight plan: where to be, how fast to fly there, how much to look inland. */
type Waypoint = { pos: Vector3; speed: number; inland: number };

type DroneTourOptions = {
  scene: Scene;
  camera: ArcRotateCamera;
  /** Where the tour starts and ends (the default overview). */
  home: { position: Vector3; target: Vector3 };
  isMobile: boolean;
  onDone: (cancelled: boolean) => void;
};

const ISLAND_CENTRE = new Vector3(2, 3, 2);
const deg = (degrees: number) => (degrees * Math.PI) / 180;

/**
 * The flight plan, one smooth loop: dive in from the overview, cruise the
 * beach most of the way round the island with the city off to one side, cut
 * back across the middle over the roads, then climb out and land on the
 * overview. No stops and no tight turns.
 */
const flightPlan = (home: Vector3, isMobile: boolean): Waypoint[] => {
  const lift = isMobile ? 4 : 0;
  const shore = (degrees: number, radius: number, y: number, speed = 17, inland = 0.45): Waypoint => {
    const p = coastalShorePoint(deg(degrees), radius);
    return { pos: new Vector3(p.x, y + lift, p.z), speed, inland };
  };
  const at = (x: number, y: number, z: number, speed: number, inland: number): Waypoint => ({
    pos: new Vector3(x, y + lift, z),
    speed,
    inland,
  });
  return [
    { pos: home.clone(), speed: 55, inland: 0 },
    shore(135, 1.55, 46, 38, 0.3),
    // Along the beach, clockwise from the north-west, the city on the right.
    shore(118, 1.02, 15),
    shore(90, 1.0, 13),
    shore(60, 1.01, 12),
    shore(30, 1.0, 13),
    shore(0, 1.02, 14),
    shore(-30, 1.0, 12),
    shore(-60, 1.0, 13),
    shore(-90, 1.03, 14, 17, 0.35),
    // Turn inland and run up the middle of the island over the streets.
    at(-6, 20, -34, 15, 0.1),
    at(2, 25, -6, 14, 0),
    at(10, 25, 18, 14, 0),
    // Bank left before the north shore, climbing over land with the gaze
    // swinging back onto the island, then pull back to the overview while
    // still facing the island (never out to sea).
    at(16, 27, 30, 16, 0.45),
    at(-22, 40, 34, 22, 0.95),
    { pos: home.clone(), speed: 50, inland: 1 },
  ];
};

export const startDroneTour = ({ scene, camera, home, isMobile, onDone }: DroneTourOptions) => {
  // Rebuilt per flight (a few ms): buildings may still have been growing in last time.
  const heightAt = buildHeightMap(scene);
  const plan = flightPlan(home.position, isMobile);

  // Sample the spline densely, then fly it by distance so speed is controlled.
  const samples: { pos: Vector3; dist: number; speed: number; inland: number }[] = [];
  const SUBSTEPS = 24;
  const k = (n: number) => plan[Math.max(0, Math.min(plan.length - 1, n))];
  let dist = 0;
  for (let i = 1; i < plan.length; i++) {
    for (let step = i === 1 ? 0 : 1; step <= SUBSTEPS; step++) {
      const t = step / SUBSTEPS;
      const pos = catmullRom(k(i - 2).pos, k(i - 1).pos, k(i).pos, k(i + 1).pos, t, new Vector3());
      if (samples.length) dist += Vector3.Distance(samples[samples.length - 1].pos, pos);
      samples.push({
        pos,
        dist,
        speed: k(i - 1).speed + (k(i).speed - k(i - 1).speed) * smoothstep(0, 1, t),
        inland: k(i - 1).inland + (k(i).inland - k(i - 1).inland) * smoothstep(0, 1, t),
      });
    }
  }
  const length = dist;

  // Time to reach each sample, with a gentle take-off and landing.
  const RAMP = 40;
  const times = [0];
  for (let i = 1; i < samples.length; i++) {
    const ds = samples[i].dist - samples[i - 1].dist;
    const d = samples[i].dist;
    const ramp = 0.18 + 0.82 * Math.min(smoothstep(0, RAMP, d), smoothstep(0, RAMP, length - d));
    times.push(times[i - 1] + ds / (samples[i].speed * ramp));
  }
  const total = times[times.length - 1];

  const sampleAt = (distance: number, out: Vector3) => {
    const d = Math.min(length, Math.max(0, distance));
    let lo = 0;
    let hi = samples.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (samples[mid].dist < d) lo = mid;
      else hi = mid;
    }
    const a = samples[lo];
    const b = samples[hi];
    const t = b.dist > a.dist ? (d - a.dist) / (b.dist - a.dist) : 0;
    out.copyFrom(a.pos).scaleInPlace(1 - t).addInPlace(b.pos.scale(t));
    return { inland: a.inland + (b.inland - a.inland) * t, index: lo };
  };

  // Free the camera from the user limits while flying; restored at the end.
  const saved = {
    lowerRadiusLimit: camera.lowerRadiusLimit,
    upperRadiusLimit: camera.upperRadiusLimit,
    lowerBetaLimit: camera.lowerBetaLimit,
    upperBetaLimit: camera.upperBetaLimit,
    panningDistanceLimit: camera.panningDistanceLimit,
  };
  camera.lowerRadiusLimit = 0.5;
  camera.upperRadiusLimit = null;
  camera.lowerBetaLimit = 0.01;
  camera.upperBetaLimit = Math.PI - 0.01;
  camera.panningDistanceLimit = null;
  camera.inertialAlphaOffset = 0;
  camera.inertialBetaOffset = 0;
  camera.inertialRadiusOffset = 0;
  camera.inertialPanningX = 0;
  camera.inertialPanningY = 0;

  const pos = new Vector3();
  const ahead = new Vector3();
  const look = new Vector3();
  const smoothedLook = home.target.clone();
  let lift = 0;
  let cancelled = false;
  let done = false;
  let rafId: number | null = null;
  let begin: number | null = null;
  let last = 0;

  const restore = () => {
    camera.lowerRadiusLimit = saved.lowerRadiusLimit;
    camera.upperRadiusLimit = saved.upperRadiusLimit;
    camera.lowerBetaLimit = saved.lowerBetaLimit;
    camera.upperBetaLimit = saved.upperBetaLimit;
    camera.panningDistanceLimit = saved.panningDistanceLimit;
  };

  const distanceAtTime = (time: number) => {
    let lo = 0;
    let hi = times.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (times[mid] < time) lo = mid;
      else hi = mid;
    }
    const t = times[hi] > times[lo] ? (time - times[lo]) / (times[hi] - times[lo]) : 0;
    return samples[lo].dist + (samples[hi].dist - samples[lo].dist) * Math.min(1, Math.max(0, t));
  };

  const frame = (now: number) => {
    if (cancelled) return;
    begin ??= now;
    const dt = Math.min(0.1, (now - (last || now)) / 1000);
    last = now;
    const seconds = (now - begin) / 1000;
    const progress = Math.min(1, seconds / total);
    const d = distanceAtTime(seconds);

    const { inland } = sampleAt(d, pos);
    sampleAt(d + 22, ahead);

    // Look where we're heading, tipped down, drawn partly towards the island
    // centre so the city stays in frame while cruising the beach.
    const forward = ahead.subtract(pos);
    forward.y = 0;
    if (forward.lengthSquared() < 1e-4) forward.set(0, 0, 1);
    forward.normalize();
    look.copyFrom(pos).addInPlace(forward.scale(26));
    look.y = Math.max(1, pos.y - 10);
    look.scaleInPlace(1 - inland).addInPlace(ISLAND_CENTRE.scale(inland));

    // Near take-off and landing, look at the overview's own target instead.
    const homeWeight = 1 - Math.min(smoothstep(0, 70, d), smoothstep(0, 110, length - d));
    look.scaleInPlace(1 - homeWeight).addInPlace(home.target.scale(homeWeight));

    // Ease the gaze so it turns like a gimbal, not instantly.
    smoothedLook.addInPlace(look.subtract(smoothedLook).scale(Math.min(1, dt * 3)));

    // Hover drift, faded out near take-off and landing.
    const drift = 1 - homeWeight;
    pos.x += Math.sin(seconds * 0.9) * 0.4 * drift;
    pos.y += Math.sin(seconds * 1.7) * 0.25 * drift;
    pos.z += Math.cos(seconds * 1.1) * 0.4 * drift;

    // Stay above rooftops and trees: rise quickly when something is close, sink back slowly.
    const needed = Math.max(0, heightAt(pos.x, pos.z) + CLEARANCE - pos.y) * drift;
    lift += (needed - lift) * Math.min(1, dt * (needed > lift ? 8 : 1.5));
    pos.y += lift;

    camera.target.copyFrom(progress >= 1 ? home.target : smoothedLook);
    camera.setPosition(progress >= 1 ? home.position : pos);

    if (progress >= 1) {
      finish(false);
      return;
    }
    rafId = window.requestAnimationFrame(frame);
  };

  const finish = (wasCancelled: boolean) => {
    if (done) return;
    done = true;
    if (rafId !== null) window.cancelAnimationFrame(rafId);
    rafId = null;
    restore();
    onDone(wasCancelled);
  };

  rafId = window.requestAnimationFrame(frame);

  return () => {
    if (cancelled) return;
    cancelled = true;
    finish(true);
  };
};
