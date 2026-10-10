import { CITY_LAYOUT, CITY_TILE_SIZE, type CityEntity, type DecorativePlacement } from './cityLayout';
import { mapCityPoint } from '../scene/cityTerrain';

// Preserve the original city blocks, streets and hand-authored traffic routes.
// The organic island replaces the lawn formerly drawn by 289 checker tiles.
const checkerboardFillers = new Set([
  'tiles-models/roadTile_163.obj',
  'tiles-models/roadTile_002.obj',
]);
const coordinateKey = (value = 0) => Number(value.toFixed(4)).toString();
const placementKey = (entry: CityEntity) => [
  entry.type, entry.modelPath,
  coordinateKey(entry.position.x), coordinateKey(entry.position.y), coordinateKey(entry.position.z),
  coordinateKey(entry.rotation?.y), coordinateKey(entry.targetScale),
].join('|');
const seenPlacements = new Set<string>();
const isLegacyGreenery = (entry: CityEntity) =>
  /(?:tree|hedge|grass|planter)\.obj$/i.test(entry.modelPath)
  || /tiles-models\/roadTile_(019|020)\.obj$/.test(entry.modelPath);

const originalPlacements: CityEntity[] = CITY_LAYOUT
  .filter((entry) => {
    if (entry.type === 'road' && checkerboardFillers.has(entry.modelPath)) return false;
    const key = placementKey(entry);
    // The original table repeats one house and one street segment exactly.
    if (seenPlacements.has(key)) return false;
    seenPlacements.add(key);
    return true;
  })
  .map((entry) => {
    if (entry.type === 'main') return entry;
    const model = entry.modelPath.split('/').at(-1)?.replace(/\.obj$/i, '') ?? 'detail';
    const id = [
      'city', entry.type, model,
      coordinateKey(entry.position.x), coordinateKey(entry.position.z),
      coordinateKey(entry.position.y), coordinateKey(entry.rotation?.y), coordinateKey(entry.targetScale),
    ].join('-');
    return { ...entry, id };
  });

// Replace the old model-pack foliage with the island's unified vegetation.
// Coordinates below are already deformed world positions, not layout units.
export const CITY_GREENERY = originalPlacements.filter(isLegacyGreenery).map((entry) => {
  const kind = entry.modelPath.includes('planter') ? 'shrub' as const : 'tree' as const;
  const rotation = entry.rotation?.y ?? 0;
  const size = entry.targetScale ?? 2.16;
  // Legacy tree meshes originate at a tile corner rather than their trunk.
  const offsetX = kind === 'tree' ? size * .43 : 0;
  const offsetZ = kind === 'tree' ? -size * .43 : 0;
  const originalX = entry.position.x + CITY_TILE_SIZE / 2 + Math.cos(rotation) * offsetX + Math.sin(rotation) * offsetZ;
  const originalZ = entry.position.z + CITY_TILE_SIZE / 2 - Math.sin(rotation) * offsetX + Math.cos(rotation) * offsetZ;
  return {
    ...mapCityPoint(originalX, originalZ),
    kind,
    scale: kind === 'tree' ? size / 2.6 : size / 2.16,
  };
});

// These props belong to fixed promenade/dock locations. Invert the city bend
// once so the normal loader can apply its shared mapping and tile offset.
const promenadeProp = (
  id: string, modelPath: string, worldX: number, worldZ: number,
  targetScale: number, y = 0, rotation = 0,
): DecorativePlacement => {
  let x = worldX;
  let z = worldZ;
  for (let iteration = 0; iteration < 24; iteration += 1) {
    const mapped = mapCityPoint(x, z);
    x += (worldX - mapped.x) * .75;
    z += (worldZ - mapped.z) * .75;
  }
  return {
    id, type: 'decor', name: id.replaceAll('-', ' '), modelPath,
    position: { x: x - CITY_TILE_SIZE / 2, y, z: z - CITY_TILE_SIZE / 2 },
    targetScale, rotation: { y: rotation },
  };
};

const PROMENADE_PROPS: DecorativePlacement[] = [
  // Previously unused round picnic-table parasols make two small rest stops.
  promenadeProp('garden-picnic-parasol-west', 'commerical-models/OBJ format/detail-parasol-a.obj', 13, -45.5, 2.5),
  promenadeProp('garden-picnic-parasol-east', 'commerical-models/OBJ format/detail-parasol-a.obj', 17, -46.5, 2.5, 0, .3),
  promenadeProp('north-promenade-picnic-parasol', 'commerical-models/OBJ format/detail-parasol-a.obj', 23, 51.5, 2.4, 0, -.2),
  // A compact cargo pile occupies one corner of the pier's broad end deck.
  // Its -0.445 ground height is the deck surface, not the city ground plane.
  promenadeProp('harbor-cargo-large', 'car-models/OBJ format/box.obj', -19.7, -72.05, .88, -.445),
  promenadeProp('harbor-cargo-small', 'car-models/OBJ format/box.obj', -18.65, -72.1, .68, -.445, .12),
  promenadeProp('harbor-cargo-stacked', 'car-models/OBJ format/box.obj', -19.7, -72.05, .62, .435, -.12),
];

// Roads, buildings and routes remain in the original coordinate system here.
// Their shared deformation is applied once by the renderer and traffic loop.
export const ISLAND_LAYOUT = [
  ...originalPlacements.filter(entry => !isLegacyGreenery(entry)),
  ...PROMENADE_PROPS,
];

export const WATERFRONT_GARDEN = { x: 0, z: -42 } as const;
