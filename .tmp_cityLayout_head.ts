export type BuildingKey =
  | "about"
  | "projects"
  | "skills"
  | "experience"
  | "contact";

export type BasePlacement = {
  id: string;
  name: string;
  modelPath: string;
  position: { x: number; y?: number; z: number };
  targetScale?: number;
  rotation?: { y: number };
  isPortfolio?: boolean;
};

export type BuildingPlacement = BasePlacement & {
  type: "main";
  key: BuildingKey;
  isPortfolio?: boolean;
};

export type DecorativePlacement = BasePlacement & {
  type: "decor";
};

export type RoadPlacement = BasePlacement & {
  type: "road";
};

export type CityEntity = BuildingPlacement | DecorativePlacement | RoadPlacement;

export const TILE_SIZE = 4;
const UNIFORM_SCALE = TILE_SIZE * 0.9;

type TileStripConfig = {
  idPrefix: string;
  modelPath: string;
  start: { x: number; z: number; y?: number };
  end: { x: number; z: number; y?: number };
  y?: number;
  targetScale?: number;
  rotation?: { y: number };
};

const createTileBlock = ({
  idPrefix,
  modelPath,
  start,
  end,
  y = 0,
  targetScale = TILE_SIZE,
  rotation,
}: TileStripConfig): RoadPlacement[] => {
  // Treat start/end as integer grid coordinates (tile units) and scale to world space.
  const gridStartX = Math.round(start.x);
  const gridStartZ = Math.round(start.z);
  const gridEndX = Math.round(end.x);
  const gridEndZ = Math.round(end.z);

  const deltaX = gridEndX - gridStartX;
  const deltaZ = gridEndZ - gridStartZ;
  const baseY = start.y ?? end.y ?? y;

  const stepsX = Math.max(1, Math.abs(deltaX) + 1);
  const stepsZ = Math.max(1, Math.abs(deltaZ) + 1);
  const stepX = deltaX === 0 ? 0 : Math.sign(deltaX);
  const stepZ = deltaZ === 0 ? 0 : Math.sign(deltaZ);

  const tiles: RoadPlacement[] = [];
  for (let zIdx = 0; zIdx < stepsZ; zIdx += 1) {
    for (let xIdx = 0; xIdx < stepsX; xIdx += 1) {
      const idx = zIdx * stepsX + xIdx;
      tiles.push({
        id: `${idPrefix}-${idx + 1}`,
        type: "road",
        name: `${idPrefix}-${idx + 1}`,
        modelPath,
        position: {
          x: (gridStartX + stepX * xIdx) * TILE_SIZE,
          y: baseY,
          z: (gridStartZ + stepZ * zIdx) * TILE_SIZE,
        },
        targetScale,
        rotation,
      });
    }
  }

  return tiles;
};

// Main portfolio buildings
const MAIN_BUILDINGS: BuildingPlacement[] = [
  {
    id: "about",
    type: "main",
    key: "about",
    name: "Studio Pavilion",
    modelPath: "commerical-models/OBJ format/building-skyscraper-a.obj",
    position: { x: 0, z: 0 },
    targetScale: UNIFORM_SCALE,
    isPortfolio: true,
  },
  {
    id: "projects",
    type: "main",
    key: "projects",
    name: "Innovation Arcade",
    modelPath: "commerical-models/OBJ format/building-skyscraper-b.obj",
    position: { x: TILE_SIZE * 1, z: 0 },
    targetScale: UNIFORM_SCALE,
    isPortfolio: true,
  },
  {
    id: "skills",
    type: "main",
    key: "skills",
    name: "Learning Tower",
    modelPath: "commerical-models/OBJ format/building-skyscraper-c.obj",
    position: { x: TILE_SIZE * 1, z: TILE_SIZE * 1 },
    targetScale: UNIFORM_SCALE,
    isPortfolio: true,
  },
  {
    id: "experience",
    type: "main",
    key: "experience",
    name: "Experience Exchange",
    modelPath: "commerical-models/OBJ format/building-skyscraper-d.obj",
    position: { x: -TILE_SIZE * 3, z: TILE_SIZE * 1 },
    targetScale: UNIFORM_SCALE,
    isPortfolio: true,
  },
  {
    id: "contact",
    type: "main",
    key: "contact",
    name: "Signal Center",
    modelPath: "commerical-models/OBJ format/building-skyscraper-e.obj",
    position: { x: -TILE_SIZE * 1, z: -TILE_SIZE * 3 },
    targetScale: UNIFORM_SCALE,
    isPortfolio: true,
  },
];

// Drop new decorative buildings here (shops, homes, etc.)
const RAW_DECORATIVE_BUILDINGS: DecorativePlacement[] = [
  // Commercial Building
  {
    id: "decor-commercial-building-a-1",
    type: "decor",
    name: "commerical-building-a-1",
    modelPath: "commerical-models/OBJ format/building-a.obj",
    position: { x: -TILE_SIZE * 12, z: -TILE_SIZE * 12 },
    targetScale: UNIFORM_SCALE
  },
  {
    id: "decor-commercial-building-b-1",
    type: "decor",
    name: "commerical-building-b-1",
    modelPath: "commerical-models/OBJ format/building-b.obj",
    position: { x: -TILE_SIZE * 11, z: -TILE_SIZE * 12 },
    targetScale: UNIFORM_SCALE
  },
  {
    id: "decor-commercial-building-c-1",
    type: "decor",
    name: "commerical-building-c-1",
    modelPath: "commerical-models/OBJ format/building-c.obj",
    position: { x: -TILE_SIZE * 10, z: -TILE_SIZE * 12 },
    targetScale: UNIFORM_SCALE
  },
  {
    id: "decor-commercial-building-d-1",
    type: "decor",
    name: "commerical-building-d-1",
    modelPath: "commerical-models/OBJ format/building-d.obj",
    position: { x: -TILE_SIZE * 9, z: -TILE_SIZE * 12 },
    targetScale: UNIFORM_SCALE
  },
  {
    id: "decor-commercial-building-e-1",
    type: "decor",
    name: "commerical-building-e-1",
    modelPath: "commerical-models/OBJ format/building-e.obj",
    position: { x: -TILE_SIZE * 8, z: -TILE_SIZE * 12 },
    targetScale: UNIFORM_SCALE
  },
  {
    id: "decor-commercial-building-f-1",
    type: "decor",
    name: "commerical-building-f-1",
    modelPath: "commerical-models/OBJ format/building-f.obj",
    position: { x: -TILE_SIZE * 7, z: -TILE_SIZE * 12 },
    targetScale: UNIFORM_SCALE
  },
  {
    id: "decor-commercial-building-g-1",
    type: "decor",
    name: "commerical-building-g-1",
    modelPath: "commerical-models/OBJ format/building-g.obj",
    position: { x: -TILE_SIZE * 6, z: -TILE_SIZE * 12 },
    targetScale: UNIFORM_SCALE
  },
  {
    id: "decor-commercial-building-h-1",
    type: "decor",
    name: "commerical-building-h-1",
    modelPath: "commerical-models/OBJ format/building-h.obj",
    position: { x: -TILE_SIZE * 5, z: -TILE_SIZE * 12 },
    targetScale: UNIFORM_SCALE
  },
  {
    id: "decor-commercial-building-i-1",
    type: "decor",
    name: "commerical-building-i-1",
    modelPath: "commerical-models/OBJ format/building-i.obj",
    position: { x: -TILE_SIZE * 4, z: -TILE_SIZE * 12 },
    targetScale: UNIFORM_SCALE
  },
  {
    id: "decor-commercial-building-j-1",
    type: "decor",
    name: "commerical-building-j-1",
    modelPath: "commerical-models/OBJ format/building-j.obj",
    position: { x: -TILE_SIZE * 3, z: -TILE_SIZE * 12 },
    targetScale: UNIFORM_SCALE
  },
  {
    id: "decor-commercial-building-k-1",
    type: "decor",
    name: "commerical-building-k-1",
    modelPath: "commerical-models/OBJ format/building-k.obj",
    position: { x: -TILE_SIZE * 2, z: -TILE_SIZE * 12 },
    targetScale: UNIFORM_SCALE
  },
  {
    id: "decor-commercial-building-l-1",
    type: "decor",
    name: "commerical-building-l-1",
    modelPath: "commerical-models/OBJ format/building-l.obj",
    position: { x: -TILE_SIZE * 1, z: -TILE_SIZE * 12 },
    targetScale: UNIFORM_SCALE
  },
  {
    id: "decor-commercial-building-m-1",
    type: "decor",
    name: "commerical-building-m-1",
    modelPath: "commerical-models/OBJ format/building-m.obj",
    position: { x: 0, z: -TILE_SIZE * 12 },
    targetScale: UNIFORM_SCALE
  },
  {
    id: "decor-commercial-building-n-1",
    type: "decor",
    name: "commerical-building-n-1",
    modelPath: "commerical-models/OBJ format/building-n.obj",
    position: { x: TILE_SIZE * 1, z: -TILE_SIZE * 12 },
    targetScale: UNIFORM_SCALE
  },

  // Commercial Skyscraper
  {
    id: "decor-commercial-building-skyscraper-a-1",
    type: "decor",
    name: "commercial-building-skyscraper-a-1",
    modelPath: "commerical-models/OBJ format/building-skyscraper-a.obj",
    position: { x: TILE_SIZE * -12, z: -TILE_SIZE * 11 },
    targetScale: UNIFORM_SCALE
  },
  {
    id: "decor-commercial-building-skyscraper-b-1",
    type: "decor",
    name: "commercial-building-skyscraper-b-1",
    modelPath: "commerical-models/OBJ format/building-skyscraper-b.obj",
    position: { x: TILE_SIZE * -11, z: -TILE_SIZE * 11 },
    targetScale: UNIFORM_SCALE
  },
  {
    id: "decor-commercial-building-skyscraper-c-1",
    type: "decor",
    name: "commercial-building-skyscraper-c-1",
    modelPath: "commerical-models/OBJ format/building-skyscraper-c.obj",
    position: { x: TILE_SIZE * -10, z: -TILE_SIZE * 11 },
    targetScale: UNIFORM_SCALE
  },
  {
    id: "decor-commercial-building-skyscraper-d-1",
    type: "decor",
    name: "commercial-building-skyscraper-d-1",
    modelPath: "commerical-models/OBJ format/building-skyscraper-d.obj",
    position: { x: TILE_SIZE * -9, z: -TILE_SIZE * 11 },
    targetScale: UNIFORM_SCALE
  },
  {
    id: "decor-commercial-building-skyscraper-e-1",
    type: "decor",
    name: "commercial-building-skyscraper-e-1",
    modelPath: "commerical-models/OBJ format/building-skyscraper-e.obj",
    position: { x: TILE_SIZE * -8, z: -TILE_SIZE * 11 },
    targetScale: UNIFORM_SCALE
  },

  // Commercial Details
  {
    id: "decor-commercial-detail-awning-wide-1",
    type: "decor",
    name: "commercial-detail-awning-wide-1",
    modelPath: "commerical-models/OBJ format/detail-awning-wide.obj",
    position: { x: TILE_SIZE * -7, z: -TILE_SIZE * 11 },
    targetScale: UNIFORM_SCALE
  },
  {
    id: "decor-commercial-detail-awning-1",
    type: "decor",
    name: "commercial-detail-awning-1",
    modelPath: "commerical-models/OBJ format/detail-awning.obj",
    position: { x: TILE_SIZE * -6, z: -TILE_SIZE * 11 },
    targetScale: UNIFORM_SCALE
  },
  {
    id: "decor-commercial-detail-overhang-wide-1",
    type: "decor",
    name: "commercial-detail-overhang-wide-1",
    modelPath: "commerical-models/OBJ format/detail-overhang-wide.obj",
    position: { x: TILE_SIZE * -5, z: -TILE_SIZE * 11 },
    targetScale: UNIFORM_SCALE
  },
  {
    id: "decor-commercial-detail-overhang-1",
    type: "decor",
    name: "commercial-detail-overhang-1",
    modelPath: "commerical-models/OBJ format/detail-overhang.obj",
    position: { x: TILE_SIZE * -4, z: -TILE_SIZE * 11 },
    targetScale: UNIFORM_SCALE
  },
  {
    id: "decor-commercial-detail-parasol-a-1",
    type: "decor",
    name: "commercial-detail-parasol-a-1",
    modelPath: "commerical-models/OBJ format/detail-parasol-a.obj",
    position: { x: TILE_SIZE * -3, z: -TILE_SIZE * 11 },
    targetScale: UNIFORM_SCALE
  },
  {
    id: "decor-commercial-detail-parasol-b-1",
    type: "decor",
    name: "commercial-detail-parasol-b-1",
    modelPath: "commerical-models/OBJ format/detail-parasol-b.obj",
    position: { x: TILE_SIZE * -2, z: -TILE_SIZE * 11 },
    targetScale: UNIFORM_SCALE
  },

  // Industrial Building
  {
    id: "decor-industrial-building-a-1",
    type: "decor",
    name: "industrial-building-a-1",
    modelPath: "industrial-models/OBJ format/building-a.obj",
    position: { x: -TILE_SIZE * 12, z: -TILE_SIZE * 10 },
    targetScale: UNIFORM_SCALE
  },
  {
    id: "decor-industrial-building-b-1",
    type: "decor",
    name: "industrial-building-b-1",
    modelPath: "industrial-models/OBJ format/building-b.obj",
    position: { x: -TILE_SIZE * 11, z: -TILE_SIZE * 10 },
    targetScale: UNIFORM_SCALE
  },
  {
    id: "decor-industrial-building-c-1",
    type: "decor",
    name: "industrial-building-c-1",
    modelPath: "industrial-models/OBJ format/building-c.obj",
    position: { x: -TILE_SIZE * 10, z: -TILE_SIZE * 10 },
    targetScale: UNIFORM_SCALE
  },
  {
    id: "decor-industrial-building-d-1",
    type: "decor",
    name: "industrial-building-d-1",
    modelPath: "industrial-models/OBJ format/building-d.obj",
    position: { x: -TILE_SIZE * 9, z: -TILE_SIZE * 10 },
    targetScale: UNIFORM_SCALE
  },
  {
    id: "decor-industrial-building-e-1",
    type: "decor",
    name: "industrial-building-e-1",
    modelPath: "industrial-models/OBJ format/building-e.obj",
    position: { x: -TILE_SIZE * 8, z: -TILE_SIZE * 10 },
    targetScale: UNIFORM_SCALE
  },
  {
    id: "decor-industrial-building-f-1",
    type: "decor",
    name: "industrial-building-f-1",
    modelPath: "industrial-models/OBJ format/building-f.obj",
    position: { x: -TILE_SIZE * 7, z: -TILE_SIZE * 10 },
    targetScale: UNIFORM_SCALE
  },
  {
    id: "decor-industrial-building-g-1",
    type: "decor",
    name: "industrial-building-g-1",
    modelPath: "industrial-models/OBJ format/building-g.obj",
    position: { x: -TILE_SIZE * 6, z: -TILE_SIZE * 10 },
    targetScale: UNIFORM_SCALE
  },
  {
    id: "decor-industrial-building-h-1",
    type: "decor",
    name: "industrial-building-h-1",
    modelPath: "industrial-models/OBJ format/building-h.obj",
    position: { x: -TILE_SIZE * 5, z: -TILE_SIZE * 10 },
    targetScale: UNIFORM_SCALE
  },
  {
    id: "decor-industrial-building-i-1",
    type: "decor",
    name: "industrial-building-i-1",
    modelPath: "industrial-models/OBJ format/building-i.obj",
    position: { x: -TILE_SIZE * 4, z: -TILE_SIZE * 10 },
    targetScale: UNIFORM_SCALE
  },
  {
    id: "decor-industrial-building-j-1",
    type: "decor",
    name: "industrial-building-j-1",
    modelPath: "industrial-models/OBJ format/building-j.obj",
    position: { x: -TILE_SIZE * 3, z: -TILE_SIZE * 10 },
    targetScale: UNIFORM_SCALE
  },
  {
    id: "decor-industrial-building-k-1",
    type: "decor",
    name: "industrial-building-k-1",
    modelPath: "industrial-models/OBJ format/building-k.obj",
    position: { x: -TILE_SIZE * 2, z: -TILE_SIZE * 10 },
    targetScale: UNIFORM_SCALE
  },
  {
    id: "decor-industrial-building-l-1",
    type: "decor",
    name: "industrial-building-l-1",
    modelPath: "industrial-models/OBJ format/building-l.obj",
    position: { x: -TILE_SIZE * 1, z: -TILE_SIZE * 10 },
    targetScale: UNIFORM_SCALE
  },
  {
    id: "decor-industrial-building-m-1",
    type: "decor",
    name: "industrial-building-m-1",
    modelPath: "industrial-models/OBJ format/building-m.obj",
    position: { x: 0, z: -TILE_SIZE * 10 },
    targetScale: UNIFORM_SCALE
  },
  {
    id: "decor-industrial-building-n-1",
    type: "decor",
    name: "industrial-building-n-1",
    modelPath: "industrial-models/OBJ format/building-n.obj",
    position: { x: TILE_SIZE * 1, z: -TILE_SIZE * 10 },
    targetScale: UNIFORM_SCALE
  },
  {
    id: "decor-industrial-building-o-1",
    type: "decor",
    name: "industrial-building-o-1",
    modelPath: "industrial-models/OBJ format/building-o.obj",
    position: { x: TILE_SIZE * 2, z: -TILE_SIZE * 10 },
    targetScale: UNIFORM_SCALE
  },
  {
    id: "decor-industrial-building-p-1",
    type: "decor",
    name: "industrial-building-p-1",
    modelPath: "industrial-models/OBJ format/building-p.obj",
    position: { x: TILE_SIZE * 3, z: -TILE_SIZE * 10 },
    targetScale: UNIFORM_SCALE
  },
  {
    id: "decor-industrial-building-q-1",
    type: "decor",
    name: "industrial-building-q-1",
    modelPath: "industrial-models/OBJ format/building-q.obj",
    position: { x: TILE_SIZE * 4, z: -TILE_SIZE * 10 },
    targetScale: UNIFORM_SCALE
  },
  {
    id: "decor-industrial-building-r-1",
    type: "decor",
    name: "industrial-building-r-1",
    modelPath: "industrial-models/OBJ format/building-r.obj",
    position: { x: TILE_SIZE * 5, z: -TILE_SIZE * 10 },
    targetScale: UNIFORM_SCALE
  },
  {
    id: "decor-industrial-building-s-1",
    type: "decor",
    name: "industrial-building-s-1",
    modelPath: "industrial-models/OBJ format/building-s.obj",
    position: { x: TILE_SIZE * 6, z: -TILE_SIZE * 10 },
    targetScale: UNIFORM_SCALE
  },
  {
    id: "decor-industrial-building-t-1",
    type: "decor",
    name: "industrial-building-t-1",
    modelPath: "industrial-models/OBJ format/building-t.obj",
    position: { x: TILE_SIZE * 7, z: -TILE_SIZE * 10 },
    targetScale: UNIFORM_SCALE
  },

  // Industrial Chimney
  {
    id: "decor-industrial-chimney-basic-1",
    type: "decor",
    name: "industrial-chimney-basic-1",
    modelPath: "industrial-models/OBJ format/chimney-basic.obj",
    position: { x: TILE_SIZE * 8, z: -TILE_SIZE * 10 },
    targetScale: UNIFORM_SCALE
  },
  {
    id: "decor-industrial-chimney-large-1",
    type: "decor",
    name: "industrial-chimney-large-1",
    modelPath: "industrial-models/OBJ format/chimney-large.obj",
    position: { x: TILE_SIZE * 9, z: -TILE_SIZE * 10 },
    targetScale: UNIFORM_SCALE
  },
  {
    id: "decor-industrial-chimney-medium-1",
    type: "decor",
    name: "industrial-chimney-medium-1",
    modelPath: "industrial-models/OBJ format/chimney-medium.obj",
    position: { x: TILE_SIZE * 10, z: -TILE_SIZE * 10 },
    targetScale: UNIFORM_SCALE
  },
  {
    id: "decor-industrial-chimney-small-1",
    type: "decor",
    name: "industrial-chimney-small-1",
    modelPath: "industrial-models/OBJ format/chimney-small.obj",
    position: { x: TILE_SIZE * 11, z: -TILE_SIZE * 10 },
    targetScale: UNIFORM_SCALE
  },
  {
    id: "decor-industrial-detail-tank-1",
    type: "decor",
    name: "industrial-detail-tank-1",
    modelPath: "industrial-models/OBJ format/detail-tank.obj",
    position: { x: TILE_SIZE * 12, z: -TILE_SIZE * 10 },
    targetScale: UNIFORM_SCALE
  },

  // Suburban Building
  {
    id: "decor-suburban-building-type-a-1",
    type: "decor",
    name: "suburban-building-type-a-1",
    modelPath: "suburban-models/OBJ format/building-type-a.obj",
    position: { x: TILE_SIZE * -12, z: -TILE_SIZE * 13 },
    targetScale: UNIFORM_SCALE
  },
  {
    id: "decor-suburban-building-type-b-1",
    type: "decor",
    name: "suburban-building-type-b-1",
    modelPath: "suburban-models/OBJ format/building-type-b.obj",
    position: { x: TILE_SIZE * -11, z: -TILE_SIZE * 13 },
    targetScale: UNIFORM_SCALE
  },
  {
    id: "decor-suburban-building-type-c-1",
    type: "decor",
    name: "suburban-building-type-c-1",
    modelPath: "suburban-models/OBJ format/building-type-c.obj",
    position: { x: TILE_SIZE * -10, z: -TILE_SIZE * 13 },
    targetScale: UNIFORM_SCALE
  },
  {
    id: "decor-suburban-building-type-d-1",
    type: "decor",
    name: "suburban-building-type-d-1",
    modelPath: "suburban-models/OBJ format/building-type-d.obj",
    position: { x: TILE_SIZE * -9, z: -TILE_SIZE * 13 },
    targetScale: UNIFORM_SCALE
  },
  {
    id: "decor-suburban-building-type-e-1",
    type: "decor",
    name: "suburban-building-type-e-1",
    modelPath: "suburban-models/OBJ format/building-type-e.obj",
    position: { x: TILE_SIZE * -8, z: -TILE_SIZE * 13 },
    targetScale: UNIFORM_SCALE
  },
  {
    id: "decor-suburban-building-type-f-1",
    type: "decor",
    name: "suburban-building-type-f-1",
    modelPath: "suburban-models/OBJ format/building-type-f.obj",
    position: { x: TILE_SIZE * -7, z: -TILE_SIZE * 13 },
    targetScale: UNIFORM_SCALE
  },
  {
    id: "decor-suburban-building-type-g-1",
    type: "decor",
    name: "suburban-building-type-g-1",
    modelPath: "suburban-models/OBJ format/building-type-g.obj",
    position: { x: TILE_SIZE * -6, z: -TILE_SIZE * 13 },
    targetScale: UNIFORM_SCALE
  },
  {
    id: "decor-suburban-building-type-h-1",
    type: "decor",
    name: "suburban-building-type-h-1",
    modelPath: "suburban-models/OBJ format/building-type-h.obj",
    position: { x: TILE_SIZE * -5, z: -TILE_SIZE * 13 },
    targetScale: UNIFORM_SCALE
  },
  {
    id: "decor-suburban-building-type-i-1",
    type: "decor",
    name: "suburban-building-type-i-1",
    modelPath: "suburban-models/OBJ format/building-type-i.obj",
    position: { x: TILE_SIZE * -4, z: -TILE_SIZE * 13 },
    targetScale: UNIFORM_SCALE
  },
  {
    id: "decor-suburban-building-type-j-1",
    type: "decor",
    name: "suburban-building-type-j-1",
    modelPath: "suburban-models/OBJ format/building-type-j.obj",
    position: { x: TILE_SIZE * -3, z: -TILE_SIZE * 13 },
    targetScale: UNIFORM_SCALE
  },
  {
    id: "decor-suburban-building-type-k-1",
    type: "decor",
    name: "suburban-building-type-k-1",
    modelPath: "suburban-models/OBJ format/building-type-k.obj",
    position: { x: TILE_SIZE * -2, z: -TILE_SIZE * 13 },
    targetScale: UNIFORM_SCALE
  },
  {
    id: "decor-suburban-building-type-l-1",
    type: "decor",
    name: "suburban-building-type-l-1",
    modelPath: "suburban-models/OBJ format/building-type-l.obj",
    position: { x: TILE_SIZE * -1, z: -TILE_SIZE * 13 },
    targetScale: UNIFORM_SCALE
  },
  {
    id: "decor-suburban-building-type-m-1",
    type: "decor",
    name: "suburban-building-type-m-1",
    modelPath: "suburban-models/OBJ format/building-type-m.obj",
    position: { x: 0, z: -TILE_SIZE * 13 },
    targetScale: UNIFORM_SCALE
  },
  {
    id: "decor-suburban-building-type-n-1",
    type: "decor",
    name: "suburban-building-type-n-1",
    modelPath: "suburban-models/OBJ format/building-type-n.obj",
    position: { x: TILE_SIZE * 1, z: -TILE_SIZE * 13 },
    targetScale: UNIFORM_SCALE
  },
  {
    id: "decor-suburban-building-type-o-1",
    type: "decor",
    name: "suburban-building-type-o-1",
    modelPath: "suburban-models/OBJ format/building-type-o.obj",
    position: { x: TILE_SIZE * 2, z: -TILE_SIZE * 13 },
    targetScale: UNIFORM_SCALE
  },
  {
    id: "decor-suburban-building-type-p-1",
    type: "decor",
    name: "suburban-building-type-p-1",
    modelPath: "suburban-models/OBJ format/building-type-p.obj",
    position: { x: TILE_SIZE * 3, z: -TILE_SIZE * 13 },
    targetScale: UNIFORM_SCALE
  },
  {
    id: "decor-suburban-building-type-q-1",
    type: "decor",
    name: "suburban-building-type-q-1",
    modelPath: "suburban-models/OBJ format/building-type-q.obj",
    position: { x: TILE_SIZE * 4, z: -TILE_SIZE * 13 },
    targetScale: UNIFORM_SCALE
  },
  {
    id: "decor-suburban-building-type-r-1",
    type: "decor",
    name: "suburban-building-type-r-1",
    modelPath: "suburban-models/OBJ format/building-type-r.obj",
    position: { x: TILE_SIZE * 5, z: -TILE_SIZE * 13 },
    targetScale: UNIFORM_SCALE
  },
  {
    id: "decor-suburban-building-type-s-1",
    type: "decor",
    name: "suburban-building-type-s-1",
    modelPath: "suburban-models/OBJ format/building-type-s.obj",
    position: { x: TILE_SIZE * 6, z: -TILE_SIZE * 13 },
    targetScale: UNIFORM_SCALE
  },
  {
    id: "decor-suburban-building-type-t-1",
    type: "decor",
    name: "suburban-building-type-t-1",
    modelPath: "suburban-models/OBJ format/building-type-t.obj",
    position: { x: TILE_SIZE * 7, z: -TILE_SIZE * 13 },
    targetScale: UNIFORM_SCALE
  },
  {
    id: "decor-suburban-building-type-u-1",
    type: "decor",
    name: "suburban-building-type-u-1",
    modelPath: "suburban-models/OBJ format/building-type-u.obj",
    position: { x: TILE_SIZE * 8, z: -TILE_SIZE * 13 },
    targetScale: UNIFORM_SCALE
  },

  // Suburban Details
  {
    id: "decor-suburban-driveway-long-1",
    type: "decor",
    name: "suburban-driveway-long-1",
    modelPath: "suburban-models/OBJ format/driveway-long.obj",
    position: { x: TILE_SIZE * -12, z: -TILE_SIZE * 14 },
    targetScale: UNIFORM_SCALE
  },
  {
    id: "decor-suburban-driveway-short-1",
    type: "decor",
    name: "suburban-driveway-short-1",
    modelPath: "suburban-models/OBJ format/driveway-short.obj",
    position: { x: TILE_SIZE * -11, z: -TILE_SIZE * 14 },
    targetScale: UNIFORM_SCALE
  },
  {
    id: "decor-suburban-fence-1x2-1",
    type: "decor",
    name: "suburban-fence-1x2-1",
    modelPath: "suburban-models/OBJ format/fence-1x2.obj",
    position: { x: TILE_SIZE * -10, z: -TILE_SIZE * 14 },
    targetScale: UNIFORM_SCALE
  },
  {
    id: "decor-suburban-fence-1x3-1",
    type: "decor",
    name: "suburban-fence-1x3-1",
    modelPath: "suburban-models/OBJ format/fence-1x3.obj",
    position: { x: TILE_SIZE * -9, z: -TILE_SIZE * 14 },
    targetScale: UNIFORM_SCALE
  },
  {
    id: "decor-suburban-fence-1x4-1",
    type: "decor",
    name: "suburban-fence-1x4-1",
    modelPath: "suburban-models/OBJ format/fence-1x4.obj",
    position: { x: TILE_SIZE * -8, z: -TILE_SIZE * 14 },
    targetScale: UNIFORM_SCALE
  },
  {
    id: "decor-suburban-fence-2x2-1",
    type: "decor",
    name: "suburban-fence-2x2-1",
    modelPath: "suburban-models/OBJ format/fence-2x2.obj",
    position: { x: TILE_SIZE * -7, z: -TILE_SIZE * 14 },
    targetScale: UNIFORM_SCALE
  },
  {
    id: "decor-suburban-fence-2x3-1",
    type: "decor",
    name: "suburban-fence-2x3-1",
    modelPath: "suburban-models/OBJ format/fence-2x3.obj",
    position: { x: TILE_SIZE * -6, z: -TILE_SIZE * 14 },
    targetScale: UNIFORM_SCALE
  },
  {
    id: "decor-suburban-fence-3x2-1",
    type: "decor",
    name: "suburban-fence-3x2-1",
    modelPath: "suburban-models/OBJ format/fence-3x2.obj",
    position: { x: TILE_SIZE * -5, z: -TILE_SIZE * 14 },
    targetScale: UNIFORM_SCALE
  },
  {
    id: "decor-suburban-fence-3x3-1",
    type: "decor",
    name: "suburban-fence-3x3-1",
    modelPath: "suburban-models/OBJ format/fence-3x3.obj",
    position: { x: TILE_SIZE * -4, z: -TILE_SIZE * 14 },
    targetScale: UNIFORM_SCALE
  },
  {
    id: "decor-suburban-fence-low-1",
    type: "decor",
    name: "suburban-fence-low-1",
    modelPath: "suburban-models/OBJ format/fence-low.obj",
    position: { x: TILE_SIZE * -3, z: -TILE_SIZE * 14 },
    targetScale: UNIFORM_SCALE
  },
  {
    id: "decor-suburban-fence-basic-1",
    type: "decor",
    name: "suburban-fence-basic-1",
    modelPath: "suburban-models/OBJ format/fence.obj",
    position: { x: TILE_SIZE * -2, z: -TILE_SIZE * 14 },
    targetScale: UNIFORM_SCALE
  },
  {
    id: "decor-suburban-path-long-1",
    type: "decor",
    name: "suburban-path-long-1",
    modelPath: "suburban-models/OBJ format/path-long.obj",
    position: { x: TILE_SIZE * -1, z: -TILE_SIZE * 14 },
    targetScale: UNIFORM_SCALE
  },
  {
    id: "decor-suburban-path-short-1",
    type: "decor",
    name: "suburban-path-short-1",
    modelPath: "suburban-models/OBJ format/path-short.obj",
    position: { x: 0, z: -TILE_SIZE * 14 },
    targetScale: UNIFORM_SCALE
  },
  {
    id: "decor-suburban-path-stones-long-1",
    type: "decor",
    name: "suburban-path-stones-long-1",
    modelPath: "suburban-models/OBJ format/path-stones-long.obj",
    position: { x: TILE_SIZE * 1, z: -TILE_SIZE * 14 },
    targetScale: UNIFORM_SCALE
  },
  {
    id: "decor-suburban-path-stones-messy-1",
    type: "decor",
    name: "suburban-path-stones-messy-1",
    modelPath: "suburban-models/OBJ format/path-stones-messy.obj",
    position: { x: TILE_SIZE * 2, z: -TILE_SIZE * 14 },
    targetScale: UNIFORM_SCALE
  },
  {
    id: "decor-suburban-path-stones-short-1",
    type: "decor",
    name: "suburban-path-stones-short-1",
    modelPath: "suburban-models/OBJ format/path-stones-short.obj",
    position: { x: TILE_SIZE * 3, z: -TILE_SIZE * 14 },
    targetScale: UNIFORM_SCALE
  },
  {
    id: "decor-suburban-planter-1",
    type: "decor",
    name: "suburban-planter-1",
    modelPath: "suburban-models/OBJ format/planter.obj",
    position: { x: TILE_SIZE * 4, z: -TILE_SIZE * 14 },
    targetScale: UNIFORM_SCALE
  },
  {
    id: "decor-suburban-tree-large-1",
    type: "decor",
    name: "suburban-tree-large-1",
    modelPath: "suburban-models/OBJ format/tree-large.obj",
    position: { x: TILE_SIZE * 5, z: -TILE_SIZE * 14 },
    targetScale: UNIFORM_SCALE
  },
  {
    id: "decor-suburban-tree-small-1",
    type: "decor",
    name: "suburban-tree-small-1",
    modelPath: "suburban-models/OBJ format/tree-small.obj",
    position: { x: TILE_SIZE * 6, z: -TILE_SIZE * 14 },
    targetScale: UNIFORM_SCALE
  },

];

export const DECORATIVE_BUILDINGS: DecorativePlacement[] = RAW_DECORATIVE_BUILDINGS.map((b) => ({
  ...b,
  isPortfolio: true,
}));

// Auto-place every tile OBJ from /public/tiles-models in a preview grid.
const TILE_LIBRARY_COUNT = 302;
const TILE_LIBRARY_COLUMNS = 20;
const TILE_LIBRARY_START = { x: -TILE_SIZE * 22, z: TILE_SIZE * 20 };
const GENERATED_ROAD_TILES: RoadPlacement[] = Array.from(
  { length: TILE_LIBRARY_COUNT },
  (_, index) => {
    const tileNumber = (index + 1).toString().padStart(3, "0");
    const col = index % TILE_LIBRARY_COLUMNS;
    const row = Math.floor(index / TILE_LIBRARY_COLUMNS);
    return {
      id: `road-tile-${tileNumber}`,
      type: "road",
      name: `roadTile_${tileNumber}`,
      modelPath: `tiles-models/roadTile_${tileNumber}.obj`,
      position: {
        x: TILE_LIBRARY_START.x + TILE_SIZE * col,
        z: TILE_LIBRARY_START.z + TILE_SIZE * row,
      },
      targetScale: TILE_SIZE
    };
  }
);

const BASE_TILE_BLOCK: RoadPlacement[] = createTileBlock({
  idPrefix: "roadTile_163",
  modelPath: "tiles-models/roadTile_163.obj",
  start: { x: -12, z: -12 },
  end: { x: 12, z: 12 },
  y: TILE_SIZE * -0.21,
  targetScale: TILE_SIZE,
});

const TILE_BLOCK1: RoadPlacement[] = createTileBlock({
  idPrefix: "roadTile_002",
  modelPath: "tiles-models/roadTile_002.obj",
  start: { x: -12, z: -12 },
  end: { x: -12, z: 6 },
  y: TILE_SIZE * -0.2,
  targetScale: TILE_SIZE,
});

const TILE_BLOCK2: RoadPlacement[] = createTileBlock({
  idPrefix: "road-straight",
  modelPath: "roads-models/OBJ format/road-straight.obj",
  start: { x: -11, z: -12 },
  end: { x: -11, z: 6 },
  y: TILE_SIZE * 0.1,
  targetScale: TILE_SIZE,
  rotation: { y: Math.PI / 2 },
});

const TILE_BLOCK3: RoadPlacement[] = createTileBlock({
  idPrefix: "road-straight",
  modelPath: "roads-models/OBJ format/road-straight.obj",
  start: { x: 12, z: 0 },
  end: { x: 6, z: 0 },
  y: TILE_SIZE * 0.1,
  targetScale: TILE_SIZE,
});

// Hand-place roads: add or move entries in ROAD_TILES as needed.
const RAW_ROAD_TILES: RoadPlacement[] = [
  // All Roads Sample
  { id: "road-bridge-pillar-wide-1", type: "road", name: "road-bridge-pillar-wide-1", modelPath: "roads-models/OBJ format/bridge-pillar-wide.obj", position: { x: TILE_SIZE * -12, z: TILE_SIZE * -15 }, targetScale: TILE_SIZE },
  { id: "road-bridge-pillar-1", type: "road", name: "road-bridge-pillar-1", modelPath: "roads-models/OBJ format/bridge-pillar.obj", position: { x: TILE_SIZE * -11, z: TILE_SIZE * -15 }, targetScale: TILE_SIZE },
  { id: "road-construction-barrier-1", type: "road", name: "road-construction-barrier-1", modelPath: "roads-models/OBJ format/construction-barrier.obj", position: { x: TILE_SIZE * -10, z: TILE_SIZE * -15 }, targetScale: TILE_SIZE },
  { id: "road-construction-cone-1", type: "road", name: "road-construction-cone-1", modelPath: "roads-models/OBJ format/construction-cone.obj", position: { x: TILE_SIZE * -9, z: TILE_SIZE * -15 }, targetScale: TILE_SIZE },
  { id: "road-construction-light-1", type: "road", name: "road-construction-light-1", modelPath: "roads-models/OBJ format/construction-light.obj", position: { x: TILE_SIZE * -8, z: TILE_SIZE * -15 }, targetScale: TILE_SIZE },

  { id: "road-light-curved-cross-1", type: "road", name: "road-light-curved-cross-1", modelPath: "roads-models/OBJ format/light-curved-cross.obj", position: { x: TILE_SIZE * -7, z: TILE_SIZE * -15 }, targetScale: TILE_SIZE },
  { id: "road-light-curved-double-1", type: "road", name: "road-light-curved-double-1", modelPath: "roads-models/OBJ format/light-curved-double.obj", position: { x: TILE_SIZE * -6, z: TILE_SIZE * -15 }, targetScale: TILE_SIZE },
  { id: "road-light-curved-1", type: "road", name: "road-light-curved-1", modelPath: "roads-models/OBJ format/light-curved.obj", position: { x: TILE_SIZE * -5, z: TILE_SIZE * -15 }, targetScale: TILE_SIZE },

  { id: "road-light-square-cross-1", type: "road", name: "road-light-square-cross-1", modelPath: "roads-models/OBJ format/light-square-cross.obj", position: { x: TILE_SIZE * -4, z: TILE_SIZE * -15 }, targetScale: TILE_SIZE },
  { id: "road-light-square-double-1", type: "road", name: "road-light-square-double-1", modelPath: "roads-models/OBJ format/light-square-double.obj", position: { x: TILE_SIZE * -3, z: TILE_SIZE * -15 }, targetScale: TILE_SIZE },
  { id: "road-light-square-1", type: "road", name: "road-light-square-1", modelPath: "roads-models/OBJ format/light-square.obj", position: { x: TILE_SIZE * -2, z: TILE_SIZE * -15 }, targetScale: TILE_SIZE },

  { id: "road-road-bend-barrier-1", type: "road", name: "road-road-bend-barrier-1", modelPath: "roads-models/OBJ format/road-bend-barrier.obj", position: { x: TILE_SIZE * -1, z: TILE_SIZE * -15 }, targetScale: TILE_SIZE },
  { id: "road-road-bend-sidewalk-1", type: "road", name: "road-road-bend-sidewalk-1", modelPath: "roads-models/OBJ format/road-bend-sidewalk.obj", position: { x: TILE_SIZE * 0, z: TILE_SIZE * -15 }, targetScale: TILE_SIZE },
  { id: "road-road-bend-square-barrier-1", type: "road", name: "road-road-bend-square-barrier-1", modelPath: "roads-models/OBJ format/road-bend-square-barrier.obj", position: { x: TILE_SIZE * 1, z: TILE_SIZE * -15 }, targetScale: TILE_SIZE },
  { id: "road-road-bend-square-1", type: "road", name: "road-road-bend-square-1", modelPath: "roads-models/OBJ format/road-bend-square.obj", position: { x: TILE_SIZE * 2, z: TILE_SIZE * -15 }, targetScale: TILE_SIZE },
  { id: "road-road-bend-1", type: "road", name: "road-road-bend-1", modelPath: "roads-models/OBJ format/road-bend.obj", position: { x: TILE_SIZE * 3, z: TILE_SIZE * -15 }, targetScale: TILE_SIZE },

  { id: "road-road-bridge-1", type: "road", name: "road-road-bridge-1", modelPath: "roads-models/OBJ format/road-bridge.obj", position: { x: TILE_SIZE * 4, z: TILE_SIZE * -15 }, targetScale: TILE_SIZE },
  { id: "road-road-crossing-1", type: "road", name: "road-road-crossing-1", modelPath: "roads-models/OBJ format/road-crossing.obj", position: { x: TILE_SIZE * 5, z: TILE_SIZE * -15 }, targetScale: TILE_SIZE },

  { id: "road-road-crossroad-barrier-1", type: "road", name: "road-road-crossroad-barrier-1", modelPath: "roads-models/OBJ format/road-crossroad-barrier.obj", position: { x: TILE_SIZE * 6, z: TILE_SIZE * -15 }, targetScale: TILE_SIZE },
  { id: "road-road-crossroad-line-1", type: "road", name: "road-road-crossroad-line-1", modelPath: "roads-models/OBJ format/road-crossroad-line.obj", position: { x: TILE_SIZE * 7, z: TILE_SIZE * -15 }, targetScale: TILE_SIZE },
  { id: "road-road-crossroad-path-1", type: "road", name: "road-road-crossroad-path-1", modelPath: "roads-models/OBJ format/road-crossroad-path.obj", position: { x: TILE_SIZE * 8, z: TILE_SIZE * -15 }, targetScale: TILE_SIZE },
  { id: "road-road-crossroad-1", type: "road", name: "road-road-crossroad-1", modelPath: "roads-models/OBJ format/road-crossroad.obj", position: { x: TILE_SIZE * 9, z: TILE_SIZE * -15 }, targetScale: TILE_SIZE },

  { id: "road-road-curve-barrier-1", type: "road", name: "road-road-curve-barrier-1", modelPath: "roads-models/OBJ format/road-curve-barrier.obj", position: { x: TILE_SIZE * 10, z: TILE_SIZE * -15 }, targetScale: TILE_SIZE },
  { id: "road-road-curve-intersection-barrier-1", type: "road", name: "road-road-curve-intersection-barrier-1", modelPath: "roads-models/OBJ format/road-curve-intersection-barrier.obj", position: { x: TILE_SIZE * 11, z: TILE_SIZE * -15 }, targetScale: TILE_SIZE },
  { id: "road-road-curve-intersection-1", type: "road", name: "road-road-curve-intersection-1", modelPath: "roads-models/OBJ format/road-curve-intersection.obj", position: { x: TILE_SIZE * 12, z: TILE_SIZE * -15 }, targetScale: TILE_SIZE },
  { id: "road-road-curve-pavement-1", type: "road", name: "road-road-curve-pavement-1", modelPath: "roads-models/OBJ format/road-curve-pavement.obj", position: { x: TILE_SIZE * 13, z: TILE_SIZE * -15 }, targetScale: TILE_SIZE },
  { id: "road-road-curve-1", type: "road", name: "road-road-curve-1", modelPath: "roads-models/OBJ format/road-curve.obj", position: { x: TILE_SIZE * 14, z: TILE_SIZE * -15 }, targetScale: TILE_SIZE },

  { id: "road-road-driveway-double-barrier-1", type: "road", name: "road-road-driveway-double-barrier-1", modelPath: "roads-models/OBJ format/road-driveway-double-barrier.obj", position: { x: TILE_SIZE * 15, z: TILE_SIZE * -15 }, targetScale: TILE_SIZE },
  { id: "road-road-driveway-double-1", type: "road", name: "road-road-driveway-double-1", modelPath: "roads-models/OBJ format/road-driveway-double.obj", position: { x: TILE_SIZE * 16, z: TILE_SIZE * -15 }, targetScale: TILE_SIZE },
  { id: "road-road-driveway-single-barrier-1", type: "road", name: "road-road-driveway-single-barrier-1", modelPath: "roads-models/OBJ format/road-driveway-single-barrier.obj", position: { x: TILE_SIZE * 17, z: TILE_SIZE * -15 }, targetScale: TILE_SIZE },
  { id: "road-road-driveway-single-1", type: "road", name: "road-road-driveway-single-1", modelPath: "roads-models/OBJ format/road-driveway-single.obj", position: { x: TILE_SIZE * 18, z: TILE_SIZE * -15 }, targetScale: TILE_SIZE },

  { id: "road-road-end-barrier-1", type: "road", name: "road-road-end-barrier-1", modelPath: "roads-models/OBJ format/road-end-barrier.obj", position: { x: TILE_SIZE * 19, z: TILE_SIZE * -15 }, targetScale: TILE_SIZE },
  { id: "road-road-end-round-barrier-1", type: "road", name: "road-road-end-round-barrier-1", modelPath: "roads-models/OBJ format/road-end-round-barrier.obj", position: { x: TILE_SIZE * 20, z: TILE_SIZE * -15 }, targetScale: TILE_SIZE },
  { id: "road-road-end-round-1", type: "road", name: "road-road-end-round-1", modelPath: "roads-models/OBJ format/road-end-round.obj", position: { x: TILE_SIZE * 21, z: TILE_SIZE * -15 }, targetScale: TILE_SIZE },
  { id: "road-road-end-1", type: "road", name: "road-road-end-1", modelPath: "roads-models/OBJ format/road-end.obj", position: { x: TILE_SIZE * 22, z: TILE_SIZE * -15 }, targetScale: TILE_SIZE },

  { id: "road-road-intersection-barrier-1", type: "road", name: "road-road-intersection-barrier-1", modelPath: "roads-models/OBJ format/road-intersection-barrier.obj", position: { x: TILE_SIZE * 23, z: TILE_SIZE * -15 }, targetScale: TILE_SIZE },
  { id: "road-road-intersection-line-1", type: "road", name: "road-road-intersection-line-1", modelPath: "roads-models/OBJ format/road-intersection-line.obj", position: { x: TILE_SIZE * 24, z: TILE_SIZE * -15 }, targetScale: TILE_SIZE },

  { id: "road-road-intersection-path-1", type: "road", name: "road-road-intersection-path-1", modelPath: "roads-models/OBJ format/road-intersection-path.obj", position: { x: TILE_SIZE * -12, z: TILE_SIZE * -16 }, targetScale: TILE_SIZE },
  { id: "road-road-intersection-1", type: "road", name: "road-road-intersection-1", modelPath: "roads-models/OBJ format/road-intersection.obj", position: { x: TILE_SIZE * -11, z: TILE_SIZE * -16 }, targetScale: TILE_SIZE },

  { id: "road-road-roundabout-barrier-1", type: "road", name: "road-road-roundabout-barrier-1", modelPath: "roads-models/OBJ format/road-roundabout-barrier.obj", position: { x: TILE_SIZE * -10, z: TILE_SIZE * -16 }, targetScale: TILE_SIZE },
  { id: "road-road-roundabout-1", type: "road", name: "road-road-roundabout-1", modelPath: "roads-models/OBJ format/road-roundabout.obj", position: { x: TILE_SIZE * -9, z: TILE_SIZE * -16 }, targetScale: TILE_SIZE },

  { id: "road-road-side-barrier-1", type: "road", name: "road-road-side-barrier-1", modelPath: "roads-models/OBJ format/road-side-barrier.obj", position: { x: TILE_SIZE * -8, z: TILE_SIZE * -16 }, targetScale: TILE_SIZE },
  { id: "road-road-side-entry-barrier-1", type: "road", name: "road-road-side-entry-barrier-1", modelPath: "roads-models/OBJ format/road-side-entry-barrier.obj", position: { x: TILE_SIZE * -7, z: TILE_SIZE * -16 }, targetScale: TILE_SIZE },
  { id: "road-road-side-entry-1", type: "road", name: "road-road-side-entry-1", modelPath: "roads-models/OBJ format/road-side-entry.obj", position: { x: TILE_SIZE * -6, z: TILE_SIZE * -16 }, targetScale: TILE_SIZE },
  { id: "road-road-side-exit-barrier-1", type: "road", name: "road-road-side-exit-barrier-1", modelPath: "roads-models/OBJ format/road-side-exit-barrier.obj", position: { x: TILE_SIZE * -5, z: TILE_SIZE * -16 }, targetScale: TILE_SIZE },
  { id: "road-road-side-exit-1", type: "road", name: "road-road-side-exit-1", modelPath: "roads-models/OBJ format/road-side-exit.obj", position: { x: TILE_SIZE * -4, z: TILE_SIZE * -16 }, targetScale: TILE_SIZE },
  { id: "road-road-side-1", type: "road", name: "road-road-side-1", modelPath: "roads-models/OBJ format/road-side.obj", position: { x: TILE_SIZE * -3, z: TILE_SIZE * -16 }, targetScale: TILE_SIZE },

  { id: "road-road-slant-barrier-1", type: "road", name: "road-road-slant-barrier-1", modelPath: "roads-models/OBJ format/road-slant-barrier.obj", position: { x: TILE_SIZE * -2, z: TILE_SIZE * -16 }, targetScale: TILE_SIZE },
  { id: "road-road-slant-curve-barrier-1", type: "road", name: "road-road-slant-curve-barrier-1", modelPath: "roads-models/OBJ format/road-slant-curve-barrier.obj", position: { x: TILE_SIZE * -1, z: TILE_SIZE * -16 }, targetScale: TILE_SIZE },
  { id: "road-road-slant-curve-1", type: "road", name: "road-road-slant-curve-1", modelPath: "roads-models/OBJ format/road-slant-curve.obj", position: { x: TILE_SIZE * 0, z: TILE_SIZE * -16 }, targetScale: TILE_SIZE },
  { id: "road-road-slant-flat-curve-1", type: "road", name: "road-road-slant-flat-curve-1", modelPath: "roads-models/OBJ format/road-slant-flat-curve.obj", position: { x: TILE_SIZE * 1, z: TILE_SIZE * -16 }, targetScale: TILE_SIZE },
  { id: "road-road-slant-flat-high-1", type: "road", name: "road-road-slant-flat-high-1", modelPath: "roads-models/OBJ format/road-slant-flat-high.obj", position: { x: TILE_SIZE * 2, z: TILE_SIZE * -16 }, targetScale: TILE_SIZE },
  { id: "road-road-slant-flat-1", type: "road", name: "road-road-slant-flat-1", modelPath: "roads-models/OBJ format/road-slant-flat.obj", position: { x: TILE_SIZE * 3, z: TILE_SIZE * -16 }, targetScale: TILE_SIZE },
  { id: "road-road-slant-high-barrier-1", type: "road", name: "road-road-slant-high-barrier-1", modelPath: "roads-models/OBJ format/road-slant-high-barrier.obj", position: { x: TILE_SIZE * 4, z: TILE_SIZE * -16 }, targetScale: TILE_SIZE },
  { id: "road-road-slant-high-1", type: "road", name: "road-road-slant-high-1", modelPath: "roads-models/OBJ format/road-slant-high.obj", position: { x: TILE_SIZE * 5, z: TILE_SIZE * -16 }, targetScale: TILE_SIZE },
  { id: "road-road-slant-1", type: "road", name: "road-road-slant-1", modelPath: "roads-models/OBJ format/road-slant.obj", position: { x: TILE_SIZE * 6, z: TILE_SIZE * -16 }, targetScale: TILE_SIZE },

  { id: "road-road-split-barrier-1", type: "road", name: "road-road-split-barrier-1", modelPath: "roads-models/OBJ format/road-split-barrier.obj", position: { x: TILE_SIZE * 7, z: TILE_SIZE * -16 }, targetScale: TILE_SIZE },
  { id: "road-road-split-1", type: "road", name: "road-road-split-1", modelPath: "roads-models/OBJ format/road-split.obj", position: { x: TILE_SIZE * 8, z: TILE_SIZE * -16 }, targetScale: TILE_SIZE },

  { id: "road-road-square-barrier-1", type: "road", name: "road-road-square-barrier-1", modelPath: "roads-models/OBJ format/road-square-barrier.obj", position: { x: TILE_SIZE * 9, z: TILE_SIZE * -16 }, targetScale: TILE_SIZE },
  { id: "road-road-square-1", type: "road", name: "road-road-square-1", modelPath: "roads-models/OBJ format/road-square.obj", position: { x: TILE_SIZE * 10, z: TILE_SIZE * -16 }, targetScale: TILE_SIZE },

  { id: "road-road-straight-barrier-end-1", type: "road", name: "road-road-straight-barrier-end-1", modelPath: "roads-models/OBJ format/road-straight-barrier-end.obj", position: { x: TILE_SIZE * 11, z: TILE_SIZE * -16 }, targetScale: TILE_SIZE },
  { id: "road-road-straight-barrier-half-1", type: "road", name: "road-road-straight-barrier-half-1", modelPath: "roads-models/OBJ format/road-straight-barrier-half.obj", position: { x: TILE_SIZE * 12, z: TILE_SIZE * -16 }, targetScale: TILE_SIZE },

  { id: "road-road-straight-barrier-1", type: "road", name: "road-road-straight-barrier-1", modelPath: "roads-models/OBJ format/road-straight-barrier.obj", position: { x: TILE_SIZE * -12, z: TILE_SIZE * -17 }, targetScale: TILE_SIZE },
  { id: "road-road-straight-half-1", type: "road", name: "road-road-straight-half-1", modelPath: "roads-models/OBJ format/road-straight-half.obj", position: { x: TILE_SIZE * -11, z: TILE_SIZE * -17 }, targetScale: TILE_SIZE },
  { id: "road-road-straight-1", type: "road", name: "road-road-straight-1", modelPath: "roads-models/OBJ format/road-straight.obj", position: { x: TILE_SIZE * -10, z: TILE_SIZE * -17 }, targetScale: TILE_SIZE },

  { id: "road-sign-highway-detailed-1", type: "road", name: "road-sign-highway-detailed-1", modelPath: "roads-models/OBJ format/sign-highway-detailed.obj", position: { x: TILE_SIZE * -9, z: TILE_SIZE * -17 }, targetScale: TILE_SIZE },
  { id: "road-sign-highway-wide-1", type: "road", name: "road-sign-highway-wide-1", modelPath: "roads-models/OBJ format/sign-highway-wide.obj", position: { x: TILE_SIZE * -8, z: TILE_SIZE * -17 }, targetScale: TILE_SIZE },
  { id: "road-sign-highway-1", type: "road", name: "road-sign-highway-1", modelPath: "roads-models/OBJ format/sign-highway.obj", position: { x: TILE_SIZE * -7, z: TILE_SIZE * -17 }, targetScale: TILE_SIZE },

  { id: "road-tile-high-1", type: "road", name: "road-tile-high-1", modelPath: "roads-models/OBJ format/tile-high.obj", position: { x: TILE_SIZE * -6, z: TILE_SIZE * -17 }, targetScale: TILE_SIZE },
  { id: "road-tile-low-1", type: "road", name: "road-tile-low-1", modelPath: "roads-models/OBJ format/tile-low.obj", position: { x: TILE_SIZE * -5, z: TILE_SIZE * -17 }, targetScale: TILE_SIZE },
  { id: "road-tile-slant-1", type: "road", name: "road-tile-slant-1", modelPath: "roads-models/OBJ format/tile-slant.obj", position: { x: TILE_SIZE * -4, z: TILE_SIZE * -17 }, targetScale: TILE_SIZE },
  { id: "road-tile-slantHigh-1", type: "road", name: "road-tile-slantHigh-1", modelPath: "roads-models/OBJ format/tile-slantHigh.obj", position: { x: TILE_SIZE * -3, z: TILE_SIZE * -17 }, targetScale: TILE_SIZE },


  { id: "road-tile-slantHigh-1", type: "road", name: "road-tile-slantHigh-1", modelPath: "tiles-models/roadTile_163.obj", position: { x: TILE_SIZE * 0.5, z: TILE_SIZE * 0.5, y: TILE_SIZE * -0.21, }, targetScale: TILE_SIZE },

  { id: "road-tile-slantHigh-1", type: "road", name: "road-tile-slantHigh-1", modelPath: "roads-models/OBJ format/road-straight.obj", position: { x: TILE_SIZE * 12.25, z: TILE_SIZE * 12.25}, targetScale: TILE_SIZE * 0.5, rotation: { y: Math.PI / 2 } },
  { id: "road-tile-slantHigh-1", type: "road", name: "road-tile-slantHigh-1", modelPath: "roads-models/OBJ format/road-straight.obj", position: { x: TILE_SIZE * 12.25, z: TILE_SIZE * 11.75}, targetScale: TILE_SIZE * 0.5, rotation: { y: Math.PI / 2 } },





  // ...BASE_TILE_BLOCK,
  ...GENERATED_ROAD_TILES,
  ...TILE_BLOCK1,
  ...TILE_BLOCK2,
  ...TILE_BLOCK3,
];
export const ROAD_TILES: RoadPlacement[] = RAW_ROAD_TILES.map((r) => ({
  ...r,
  isPortfolio: true,
}));

export const CITY_LAYOUT: CityEntity[] = [
  ...MAIN_BUILDINGS,
  ...DECORATIVE_BUILDINGS,
  ...ROAD_TILES,
];

export const MAIN_BUILDING_KEYS: BuildingKey[] = ["about", "projects", "skills", "experience", "contact"];

export const CITY_TILE_SIZE = TILE_SIZE;
