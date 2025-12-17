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
  position: { x: number; z: number };
  targetScale?: number;
  rotation?: { y: number };
};

export type BuildingPlacement = BasePlacement & {
  type: "main";
  key: BuildingKey;
};

export type DecorativePlacement = BasePlacement & {
  type: "decor";
};

export type RoadPlacement = BasePlacement & {
  type: "road";
};

export type CityEntity = BuildingPlacement | DecorativePlacement | RoadPlacement;

export const TILE_SIZE = 3;
const UNIFORM_SCALE = TILE_SIZE * 3;

// Main portfolio buildings
export const MAIN_BUILDINGS: BuildingPlacement[] = [
  {
    id: "about",
    type: "main",
    key: "about",
    name: "Studio Pavilion",
    modelPath: "commerical-models/OBJ format/building-skyscraper-a.obj",
    position: { x: 0, z: 0 },
    targetScale: UNIFORM_SCALE,
  },
  {
    id: "projects",
    type: "main",
    key: "projects",
    name: "Innovation Arcade",
    modelPath: "commerical-models/OBJ format/building-skyscraper-b.obj",
    position: { x: TILE_SIZE * 1, z: 0 },
    targetScale: UNIFORM_SCALE,
  },
  {
    id: "skills",
    type: "main",
    key: "skills",
    name: "Learning Tower",
    modelPath: "commerical-models/OBJ format/building-skyscraper-c.obj",
    position: { x: TILE_SIZE * 1, z: TILE_SIZE * 1 },
    targetScale: UNIFORM_SCALE,
  },
  {
    id: "experience",
    type: "main",
    key: "experience",
    name: "Experience Exchange",
    modelPath: "commerical-models/OBJ format/building-skyscraper-d.obj",
    position: { x: -TILE_SIZE * 3, z: TILE_SIZE * 1 },
    targetScale: UNIFORM_SCALE,
  },
  {
    id: "contact",
    type: "main",
    key: "contact",
    name: "Signal Center",
    modelPath: "commerical-models/OBJ format/building-skyscraper-e.obj",
    position: { x: -TILE_SIZE * 1, z: -TILE_SIZE * 3 },
    targetScale: UNIFORM_SCALE,
  },
];

// Drop new decorative buildings here (shops, homes, etc.)
export const DECORATIVE_BUILDINGS: DecorativePlacement[] = [
  {
    id: "decor-downtown-east",
    type: "decor",
    name: "Downtown East",
    modelPath: "commerical-models/OBJ format/low-detail-building-wide-a.obj",
    position: { x: TILE_SIZE * 4, z: TILE_SIZE * 2 },
    targetScale: UNIFORM_SCALE,
  },
  {
    id: "decor-industrial-plant",
    type: "decor",
    name: "Plant Row",
    modelPath: "industrial-models/OBJ format/building-p.obj",
    position: { x: TILE_SIZE * 3, z: TILE_SIZE * 4 },
    targetScale: UNIFORM_SCALE,
  },
  {
    id: "decor-suburban-a",
    type: "decor",
    name: "Suburban A",
    modelPath: "suburban-models/OBJ format/building-type-a.obj",
    position: { x: TILE_SIZE * 2, z: -TILE_SIZE * 3 },
    targetScale: UNIFORM_SCALE,
  },
  {
    id: "decor-suburban-b",
    type: "decor",
    name: "Suburban B",
    modelPath: "suburban-models/OBJ format/building-type-b.obj",
    position: { x: -TILE_SIZE * 2, z: TILE_SIZE * 4 },
    targetScale: UNIFORM_SCALE,
  },
  {
    id: "decor-commercial-corner",
    type: "decor",
    name: "Corner Shop",
    modelPath: "commerical-models/OBJ format/building-e.obj",
    position: { x: -TILE_SIZE * 2, z: -TILE_SIZE },
    targetScale: UNIFORM_SCALE,
  },
];

// Hand-place roads: add or move entries in ROAD_TILES as needed.
export const ROAD_TILES: RoadPlacement[] = [
  // outer ring
  { id: "road-west-12-12", type: "road", name: "Road Tile", modelPath: "roads-models/OBJ format/road-straight.obj", position: { x: TILE_SIZE * -4, z: TILE_SIZE * -4 }, targetScale: TILE_SIZE * 1.8, rotation: { y: Math.PI / 2 } },
  { id: "road-west-12-8", type: "road", name: "Road Tile", modelPath: "roads-models/OBJ format/road-straight.obj", position: { x: TILE_SIZE * -4, z: TILE_SIZE * -3 }, targetScale: TILE_SIZE * 1.8, rotation: { y: Math.PI / 2 } },
  { id: "road-west-12-4", type: "road", name: "Road Tile", modelPath: "roads-models/OBJ format/road-straight.obj", position: { x: TILE_SIZE * -4, z: TILE_SIZE * -2 }, targetScale: TILE_SIZE * 1.8, rotation: { y: Math.PI / 2 } },
  { id: "road-west-12-0", type: "road", name: "Road Tile", modelPath: "roads-models/OBJ format/road-straight.obj", position: { x: TILE_SIZE * -4, z: TILE_SIZE * -1 }, targetScale: TILE_SIZE * 1.8, rotation: { y: Math.PI / 2 } },
  { id: "road-west-12-4b", type: "road", name: "Road Tile", modelPath: "roads-models/OBJ format/road-straight.obj", position: { x: TILE_SIZE * -4, z: TILE_SIZE * 0 }, targetScale: TILE_SIZE * 1.8, rotation: { y: Math.PI / 2 } },
  { id: "road-west-12-8b", type: "road", name: "Road Tile", modelPath: "roads-models/OBJ format/road-straight.obj", position: { x: TILE_SIZE * -4, z: TILE_SIZE * 1 }, targetScale: TILE_SIZE * 1.8, rotation: { y: Math.PI / 2 } },
  { id: "road-west-12-12b", type: "road", name: "Road Tile", modelPath: "roads-models/OBJ format/road-straight.obj", position: { x: TILE_SIZE * -4, z: TILE_SIZE * 2 }, targetScale: TILE_SIZE * 1.8, rotation: { y: Math.PI / 2 } },
  { id: "road-west-12-16", type: "road", name: "Road Tile", modelPath: "roads-models/OBJ format/road-straight.obj", position: { x: TILE_SIZE * -4, z: TILE_SIZE * 3 }, targetScale: TILE_SIZE * 1.8, rotation: { y: Math.PI / 2 } },
  { id: "road-west-12-20", type: "road", name: "Road Tile", modelPath: "roads-models/OBJ format/road-straight.obj", position: { x: TILE_SIZE * -4, z: TILE_SIZE * 4 }, targetScale: TILE_SIZE * 1.8, rotation: { y: Math.PI / 2 } },
];

export const CITY_LAYOUT: CityEntity[] = [
  ...MAIN_BUILDINGS,
  ...DECORATIVE_BUILDINGS,
  ...ROAD_TILES,
];

export const MAIN_BUILDING_KEYS: BuildingKey[] = ["about", "projects", "skills", "experience", "contact"];

export const CITY_TILE_SIZE = TILE_SIZE;
