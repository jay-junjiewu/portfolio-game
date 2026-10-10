export type CityPoint = { x: number; z: number };

const smootherstep = (value: number) => {
  const t = Math.max(0, Math.min(1, value));
  return t * t * t * (t * (t * 6 - 15) + 10);
};

/**
 * A shared, continuous bend for the city anchors and road centerlines.
 * Inputs and outputs are WORLD coordinates, after the original tile offset.
 * Downtown [-18,18] stays exactly fixed. The outer avenues gradually follow
 * broad coastal curves, with no discontinuities at road-tile boundaries.
 */
export function mapCityPoint(x: number, z: number): CityPoint {
  const edgeX = smootherstep((Math.abs(x) - 18) / 20);
  const edgeZ = smootherstep((Math.abs(z) - 18) / 20);
  return {
    // Keep the bend outward on both sides, giving intact building footprints
    // more room instead of compressing tightly packed outer neighbourhoods.
    x: x + Math.sign(x) * edgeX * (4 + 3 * Math.sin(z / 13 + .2)),
    z: z + Math.sign(z) * edgeZ * (4 + 3 * Math.sin(x / 15 - .5)),
  };
}

/** Map a heading measured as atan2(dx, dz), retaining its local road tangent. */
export function mapCityHeading(x: number, z: number, heading: number): number {
  const dx = Math.sin(heading) * .025;
  const dz = Math.cos(heading) * .025;
  const before = mapCityPoint(x - dx, z - dz);
  const after = mapCityPoint(x + dx, z + dz);
  return Math.atan2(after.x - before.x, after.z - before.z);
}

export const CITY_ROAD_WIDTH = 4;
export const CITY_ASPHALT_WIDTH = 3.08;

export type CityRoadSample = CityPoint & {
  sourceX: number;
  sourceZ: number;
  sourceTangentX: number;
  sourceTangentZ: number;
  /** Unit tangent of the road after bending. */
  tangentX: number;
  tangentZ: number;
};

export type CityRoadPlan = {
  sourceX: number;
  sourceZ: number;
  center: CityPoint;
  paths: CityRoadSample[][];
  /** Junctions and cul-de-sacs need a filled center between their arms. */
  fillCenter: boolean;
  intersection: boolean;
  corner?: CityRoadCorner;
};

type CityRoadCorner = {
  center: CityPoint;
  radius: number;
  startAngle: number;
  sweep: number;
  /** Identity downtown curves stay exact circles. */
  worldControls?: [CityPoint, CityPoint, CityPoint, CityPoint];
};

const cubicPoint = (controls: CityPoint[], t: number): CityPoint => {
  const [a, b, c, d] = controls;
  const u = 1 - t;
  return {
    x: u ** 3 * a.x + 3 * u * u * t * b.x + 3 * u * t * t * c.x + t ** 3 * d.x,
    z: u ** 3 * a.z + 3 * u * u * t * b.z + 3 * u * t * t * c.z + t ** 3 * d.z,
  };
};
const cubicTangent = (controls: CityPoint[], t: number): CityPoint => {
  const [a, b, c, d] = controls;
  const u = 1 - t;
  return {
    x: 3 * u * u * (b.x - a.x) + 6 * u * t * (c.x - b.x) + 3 * t * t * (d.x - c.x),
    z: 3 * u * u * (b.z - a.z) + 6 * u * t * (c.z - b.z) + 3 * t * t * (d.z - c.z),
  };
};
const cornerSample = (corner: CityRoadCorner, t: number): CityRoadSample => {
  const angle = corner.startAngle + corner.sweep * t;
  const sourceX = corner.center.x + Math.cos(angle) * corner.radius;
  const sourceZ = corner.center.z + Math.sin(angle) * corner.radius;
  const sourceTangentX = -Math.sin(angle) * Math.sign(corner.sweep);
  const sourceTangentZ = Math.cos(angle) * Math.sign(corner.sweep);
  const mapped = corner.worldControls ? cubicPoint(corner.worldControls, t) : { x: sourceX, z: sourceZ };
  const tangent = corner.worldControls ? cubicTangent(corner.worldControls, t) : { x: sourceTangentX, z: sourceTangentZ };
  const length = Math.hypot(tangent.x, tangent.z) || 1;
  return { ...mapped, sourceX, sourceZ, sourceTangentX, sourceTangentZ, tangentX: tangent.x / length, tangentZ: tangent.z / length };
};

/** Fit a rounded world-space corner without squeezing its inside lane. */
const fitCornerControls = (a: CityRoadSample, b: CityRoadSample): [CityPoint, CityPoint, CityPoint, CityPoint] => {
  const chord = Math.hypot(b.x - a.x, b.z - a.z);
  const controls = (h0: number, h1: number): [CityPoint, CityPoint, CityPoint, CityPoint] => [
    { x: a.x, z: a.z },
    { x: a.x + a.tangentX * h0, z: a.z + a.tangentZ * h0 },
    { x: b.x - b.tangentX * h1, z: b.z - b.tangentZ * h1 },
    { x: b.x, z: b.z },
  ];
  const minimumRadius = (points: CityPoint[]) => {
    const [p0, p1, p2, p3] = points;
    let radius = Infinity;
    let sign = 0;
    for (let index = 0; index <= 32; index += 1) {
      const t = index / 32;
      const tangent = cubicTangent(points, t);
      const ax = 6 * (1 - t) * (p2.x - 2 * p1.x + p0.x) + 6 * t * (p3.x - 2 * p2.x + p1.x);
      const az = 6 * (1 - t) * (p2.z - 2 * p1.z + p0.z) + 6 * t * (p3.z - 2 * p2.z + p1.z);
      const cross = tangent.x * az - tangent.z * ax;
      if (sign && sign * cross < 0) return 0;
      sign = Math.sign(cross);
      radius = Math.min(radius, Math.hypot(tangent.x, tangent.z) ** 3 / Math.max(1e-9, Math.abs(cross)));
    }
    return radius;
  };
  let best = { h0: chord * .39, h1: chord * .39, radius: 0 };
  // There are only five deformed bends. A small setup-time search gives each
  // a generous turning radius while retaining both neighbours' exact tangents.
  for (let h0 = .2; h0 <= .85; h0 += .025) {
    for (let h1 = .2; h1 <= .85; h1 += .025) {
      const radius = minimumRadius(controls(h0 * chord, h1 * chord));
      if (radius > best.radius) best = { h0: h0 * chord, h1: h1 * chord, radius };
    }
  }
  const seed = { ...best };
  for (let h0 = -5; h0 <= 5; h0 += 1) {
    for (let h1 = -5; h1 <= 5; h1 += 1) {
      const first = seed.h0 + h0 * chord * .0025;
      const second = seed.h1 + h1 * chord * .0025;
      const radius = minimumRadius(controls(first, second));
      if (radius > best.radius) best = { h0: first, h1: second, radius };
    }
  }
  return controls(best.h0, best.h1);
};

const roadPlans = new Map<string, CityRoadPlan>();
let roadTileSize = 4;
let roadGridOffset = 2;
const roadKey = (x: number, z: number) => `${x.toFixed(4)},${z.toFixed(4)}`;

/**
 * Describe the connected road graph once, before the scene is populated.
 * The original grid determines connectivity; the smooth city field bends its
 * centerlines only. Road surfaces and traffic share these sampled frames,
 * keeping lane and pavement widths independent of the field's stretching.
 */
export function configureCityRoads(
  entries: readonly { type?: string; position: { x: number; z: number } }[],
  tileSize = 4,
) {
  roadPlans.clear();
  roadTileSize = tileSize;
  roadGridOffset = tileSize / 2;
  const nodes = entries.filter(entry => !entry.type || entry.type === 'road').map(entry => ({
    x: entry.position.x + roadGridOffset,
    z: entry.position.z + roadGridOffset,
  }));
  const occupied = new Set(nodes.map(point => roadKey(point.x, point.z)));
  const directions = [{ x: 1, z: 0 }, { x: -1, z: 0 }, { x: 0, z: 1 }, { x: 0, z: -1 }];
  const half = tileSize / 2;
  const neighboursAt = (node: CityPoint) => directions.filter(direction => occupied.has(roadKey(
    node.x + direction.x * tileSize, node.z + direction.z * tileSize,
  )));
  const cornerRadii = new Map<string, number>();
  for (const node of nodes) {
    const neighbours = neighboursAt(node);
    if (neighbours.length === 2 && neighbours[0].x !== -neighbours[1].x && neighbours[0].z !== -neighbours[1].z) {
      const deformed = Math.abs(node.x) > 18 || Math.abs(node.z) > 18;
      cornerRadii.set(roadKey(node.x, node.z), deformed ? tileSize * .75 : half);
    }
  }
  const reach = (node: CityPoint, direction: CityPoint) => {
    const neighbourRadius = cornerRadii.get(roadKey(node.x + direction.x * tileSize, node.z + direction.z * tileSize));
    return neighbourRadius ? tileSize - neighbourRadius : half;
  };

  const samplePath = (
    pointAt: (t: number) => CityPoint,
    tangentAt: (t: number) => CityPoint,
    steps: number,
  ): CityRoadSample[] => Array.from({ length: steps + 1 }, (_, index) => {
    const t = index / steps;
    const source = pointAt(t);
    const tangent = tangentAt(t);
    const length = Math.hypot(tangent.x, tangent.z) || 1;
    const dx = tangent.x / length * .002;
    const dz = tangent.z / length * .002;
    const before = mapCityPoint(source.x - dx, source.z - dz);
    const after = mapCityPoint(source.x + dx, source.z + dz);
    const mappedLength = Math.hypot(after.x - before.x, after.z - before.z) || 1;
    return {
      ...mapCityPoint(source.x, source.z),
      sourceX: source.x, sourceZ: source.z,
      sourceTangentX: tangent.x / length, sourceTangentZ: tangent.z / length,
      tangentX: (after.x - before.x) / mappedLength,
      tangentZ: (after.z - before.z) / mappedLength,
    };
  });

  for (const node of nodes) {
    const neighbours = neighboursAt(node);
    const paths: CityRoadSample[][] = [];
    let corner: CityRoadCorner | undefined;
    if (neighbours.length === 2) {
      const [a, b] = neighbours;
      if (a.x === -b.x && a.z === -b.z) {
        const start = { x: node.x + a.x * reach(node, a), z: node.z + a.z * reach(node, a) };
        const end = { x: node.x + b.x * reach(node, b), z: node.z + b.z * reach(node, b) };
        paths.push(samplePath(
          t => ({ x: start.x + (end.x - start.x) * t, z: start.z + (end.z - start.z) * t }),
          () => ({ x: end.x - start.x, z: end.z - start.z }), 16,
        ));
      } else {
        const radius = cornerRadii.get(roadKey(node.x, node.z)) ?? half;
        corner = {
          center: { x: node.x + (a.x + b.x) * radius, z: node.z + (a.z + b.z) * radius },
          radius, startAngle: Math.atan2(-b.z, -b.x),
          sweep: Math.sign(b.x * a.z - b.z * a.x) * Math.PI / 2,
        };
        if (radius !== half) {
          const first = cornerSample(corner, 0);
          const last = cornerSample(corner, 1);
          const endpoints = samplePath(
            t => t === 0 ? { x: first.sourceX, z: first.sourceZ } : { x: last.sourceX, z: last.sourceZ },
            t => t === 0 ? { x: -a.x, z: -a.z } : b, 1,
          );
          corner.worldControls = fitCornerControls(endpoints[0], endpoints[1]);
        }
        paths.push(Array.from({ length: 49 }, (_, index) => cornerSample(corner!, index / 48)));
      }
    } else {
      for (const direction of neighbours) {
        const length = reach(node, direction);
        paths.push(samplePath(
          t => ({ x: node.x + direction.x * length * t, z: node.z + direction.z * length * t }),
          () => direction, 8,
        ));
      }
    }
    roadPlans.set(roadKey(node.x, node.z), {
      sourceX: node.x, sourceZ: node.z, center: mapCityPoint(node.x, node.z), paths,
      fillCenter: neighbours.length !== 2, intersection: neighbours.length > 2,
      corner,
    });
  }
}

export function getCityRoadPlan(x: number, z: number): CityRoadPlan | undefined {
  return roadPlans.get(roadKey(x, z));
}

/** Attach a walk to the actual outer pavement, including rounded corners. */
export function getCityRoadEdge(x: number, z: number, outwardX: number, outwardZ: number) {
  const desired = mapCityPoint(x + outwardX * CITY_ROAD_WIDTH / 2, z + outwardZ * CITY_ROAD_WIDTH / 2);
  const origin = mapCityPoint(x, z);
  const directionLength = Math.hypot(desired.x - origin.x, desired.z - origin.z) || 1;
  const outward = { x: (desired.x - origin.x) / directionLength, z: (desired.z - origin.z) / directionLength };
  const plan = getCityRoadPlan(x, z);
  let nearestDistance = Infinity;
  let result = { ...desired, outwardX: outward.x, outwardZ: outward.z };
  if (!plan) return result;
  for (const path of plan.paths) {
    for (const side of [-1, 1]) {
      for (let index = 1; index < path.length; index += 1) {
        const a = path[index - 1];
        const b = path[index];
        const normalAX = a.tangentZ * side;
        const normalAZ = -a.tangentX * side;
        const normalBX = b.tangentZ * side;
        const normalBZ = -b.tangentX * side;
        if ((normalAX + normalBX) * outward.x + (normalAZ + normalBZ) * outward.z < .5) continue;
        const ax = a.x + normalAX * CITY_ROAD_WIDTH / 2;
        const az = a.z + normalAZ * CITY_ROAD_WIDTH / 2;
        const bx = b.x + normalBX * CITY_ROAD_WIDTH / 2;
        const bz = b.z + normalBZ * CITY_ROAD_WIDTH / 2;
        const dx = bx - ax;
        const dz = bz - az;
        const denominator = dx * dx + dz * dz;
        if (denominator < 1e-10) continue;
        const t = Math.max(0, Math.min(1, ((desired.x - ax) * dx + (desired.z - az) * dz) / denominator));
        const px = ax + dx * t;
        const pz = az + dz * t;
        const distance = (desired.x - px) ** 2 + (desired.z - pz) ** 2;
        if (distance >= nearestDistance) continue;
        nearestDistance = distance;
        const nx = normalAX + (normalBX - normalAX) * t;
        const nz = normalAZ + (normalBZ - normalAZ) * t;
        const length = Math.hypot(nx, nz) || 1;
        result = { x: px, z: pz, outwardX: nx / length, outwardZ: nz / length };
      }
    }
  }
  return result;
}

/** Preserve each authored lane offset in the road's perpendicular frame. */
export function mapCityRoadPoint(x: number, z: number): CityPoint {
  if (!roadPlans.size) return mapCityPoint(x, z);
  const gridX = Math.round((x - roadGridOffset) / roadTileSize) * roadTileSize + roadGridOffset;
  const gridZ = Math.round((z - roadGridOffset) / roadTileSize) * roadTileSize + roadGridOffset;
  let nearestDistance = Infinity;
  let result: CityPoint | undefined;
  let junctionDistance = Infinity;
  for (let gx = -1; gx <= 1; gx += 1) {
    for (let gz = -1; gz <= 1; gz += 1) {
      const plan = getCityRoadPlan(gridX + gx * roadTileSize, gridZ + gz * roadTileSize);
      if (!plan) continue;
      if (plan.intersection) junctionDistance = Math.min(junctionDistance, Math.hypot(x - plan.sourceX, z - plan.sourceZ));
      if (plan.corner) {
        const corner = plan.corner;
        const angle = Math.atan2(z - corner.center.z, x - corner.center.x);
        const delta = (angle - corner.startAngle + Math.PI * 3) % (Math.PI * 2) - Math.PI;
        const t = Math.max(0, Math.min(1, delta / corner.sweep));
        const sample = cornerSample(corner, t);
        const dx = x - sample.sourceX;
        const dz = z - sample.sourceZ;
        const distance = dx * dx + dz * dz;
        if (distance < nearestDistance) {
          nearestDistance = distance;
          const across = dx * sample.sourceTangentZ - dz * sample.sourceTangentX;
          const along = dx * sample.sourceTangentX + dz * sample.sourceTangentZ;
          result = {
            x: sample.x + sample.tangentZ * across + sample.tangentX * along,
            z: sample.z - sample.tangentX * across + sample.tangentZ * along,
          };
        }
        continue;
      }
      for (const path of plan.paths) {
        for (let index = 1; index < path.length; index += 1) {
          const a = path[index - 1];
          const b = path[index];
          const dx = b.sourceX - a.sourceX;
          const dz = b.sourceZ - a.sourceZ;
          const lengthSquared = dx * dx + dz * dz;
          const t = Math.max(0, Math.min(1, ((x - a.sourceX) * dx + (z - a.sourceZ) * dz) / lengthSquared));
          const sourceX = a.sourceX + dx * t;
          const sourceZ = a.sourceZ + dz * t;
          const distance = (x - sourceX) ** 2 + (z - sourceZ) ** 2;
          if (distance >= nearestDistance) continue;
          nearestDistance = distance;
          const sourceTangentX = a.sourceTangentX + (b.sourceTangentX - a.sourceTangentX) * t;
          const sourceTangentZ = a.sourceTangentZ + (b.sourceTangentZ - a.sourceTangentZ) * t;
          const sourceLength = Math.hypot(sourceTangentX, sourceTangentZ) || 1;
          const offset = ((x - sourceX) * sourceTangentZ - (z - sourceZ) * sourceTangentX) / sourceLength;
          const along = ((x - sourceX) * sourceTangentX + (z - sourceZ) * sourceTangentZ) / sourceLength;
          const tangentX = a.tangentX + (b.tangentX - a.tangentX) * t;
          const tangentZ = a.tangentZ + (b.tangentZ - a.tangentZ) * t;
          const tangentLength = Math.hypot(tangentX, tangentZ) || 1;
          result = {
            x: a.x + (b.x - a.x) * t + (tangentZ * offset + tangentX * along) / tangentLength,
            z: a.z + (b.z - a.z) * t + (-tangentX * offset + tangentZ * along) / tangentLength,
          };
        }
      }
    }
  }
  if (!result) return mapCityPoint(x, z);
  // An intersection is a shared paved region, not a single lane frame. A
  // smooth central blend prevents a turning car switching nearest arms.
  // Authored off-road hospital pull-ins likewise keep their original anchors.
  const junctionBlend = 1 - smootherstep((junctionDistance - 1.8) / 1.2);
  const offRoadBlend = smootherstep((Math.sqrt(nearestDistance) - 2.2) / 1.2);
  const blend = Math.max(junctionBlend, offRoadBlend);
  if (blend > 0) {
    const original = mapCityPoint(x, z);
    result.x += (original.x - result.x) * blend;
    result.z += (original.z - result.z) * blend;
  }
  return result;
}

export function mapCityRoadHeading(x: number, z: number, heading: number): number {
  const dx = Math.sin(heading) * .025;
  const dz = Math.cos(heading) * .025;
  const before = mapCityRoadPoint(x - dx, z - dz);
  const after = mapCityRoadPoint(x + dx, z + dz);
  return Math.atan2(after.x - before.x, after.z - before.z);
}
