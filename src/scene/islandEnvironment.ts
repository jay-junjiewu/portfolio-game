import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import type { Material } from "@babylonjs/core/Materials/material";
import { PointLight } from "@babylonjs/core/Lights/pointLight";
import type { Scene } from "@babylonjs/core/scene";
import type { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import { isMobileDevice, prefersReducedMotion } from "../utils/device";
import { CITY_GREENERY, ISLAND_LAYOUT } from "../data/islandLayout";
import { CITY_TILE_SIZE } from "../data/cityLayout";
import { mapCityPoint } from "./cityTerrain";
import { createOceanMaterial } from "./ocean";
import { BEACH_CONNECTIONS, coastalGroundHeight, coastalShorePoint, isClearOfCoastalTrails } from "./districtDetails";

/** A little hand-built coastline. Its centre stays clear for the portfolio town. */
export function createIslandEnvironment(scene: Scene, shadowGenerator: ShadowGenerator) {
  const meshes: Mesh[] = [];
  const materials: StandardMaterial[] = [];
  const batches = new Map<string, { meshes: Mesh[]; castsShadow: boolean }>();
  let seed = 48271;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  const material = (name: string, hex: string, specular = 0.04) => {
    const result = new StandardMaterial(`island-${name}`, scene);
    result.diffuseColor = Color3.FromHexString(hex);
    result.specularColor = new Color3(specular, specular, specular);
    materials.push(result);
    return result;
  };
  const grass = material("meadow", "#829b6b");
  const stone = material("cliff", "#A4A291");
  const water = createOceanMaterial(scene);
  const surf = material("surf", "#CAE9D9");
  surf.emissiveColor = Color3.FromHexString("#A1D5CE").scale(0.12);
  const wood = material("wood", "#AC7958");
  const darkWood = material("dark-wood", "#705C4A");
  const trunk = material("bark", "#867359");
  const leaves = ["#4F8264", "#709A69", "#81A575", "#568C78"].map((hex, i) => material(`foliage-${i}`, hex));
  const cream = material("ivory", "#F6E6C5");
  const sailCloth = material("linen", "#F5E9CE");
  sailCloth.backFaceCulling = false;
  const terracotta = material("terracotta", "#BD6B52");
  const teal = material("painted-teal", "#497D79");
  const metal = material("dark-metal", "#425655", 0.15);
  const lamp = material("lantern-glass", "#FFE3A2");
  lamp.emissiveColor = Color3.FromHexString("#FFC779").scale(0.25);
  const pebble = material("pebbles", "#B4B7A6");
  const flowers = material("little-flowers", "#E9C990");

  const keep = (mesh: Mesh, mat: Material, castsShadow = false, batch = true) => {
    mesh.material = mat;
    mesh.isPickable = false;
    mesh.receiveShadows = true;
    meshes.push(mesh);
    if (batch) {
      const key = `${mat.uniqueId}-${castsShadow}`;
      const entry = batches.get(key) ?? { meshes: [], castsShadow };
      entry.meshes.push(mesh);
      batches.set(key, entry);
    } else if (castsShadow) {
      shadowGenerator.addShadowCaster(mesh);
    }
    return mesh;
  };
  const box = (name: string, size: Vector3, position: Vector3, mat: StandardMaterial, castsShadow = true) => {
    const mesh = MeshBuilder.CreateBox(`island-${name}`, { width: size.x, height: size.y, depth: size.z }, scene);
    mesh.position.copyFrom(position);
    return keep(mesh, mat, castsShadow);
  };
  const cylinder = (name: string, height: number, bottom: number, top: number, position: Vector3, mat: StandardMaterial, tessellation = 12) => {
    const mesh = MeshBuilder.CreateCylinder(`island-${name}`, {
      height, diameterTop: top, diameterBottom: bottom, tessellation,
    }, scene);
    mesh.position.copyFrom(position);
    return keep(mesh, mat, true);
  };
  const sphere = (name: string, position: Vector3, scale: Vector3, mat: StandardMaterial, shadow = true) => {
    const mesh = MeshBuilder.CreateSphere(`island-${name}`, { diameter: 2, segments: 5 }, scene);
    mesh.position.copyFrom(position);
    mesh.scaling.copyFrom(scale);
    return keep(mesh, mat, shadow);
  };
  const outline = (angle: number, radius = 1, y = -0.05) => {
    const point = coastalShorePoint(angle, radius);
    return new Vector3(point.x, y, point.z);
  };

  // One connected surface slopes gently into the water. Its shared vertices
  // keep the lighting smooth across the former turf and exposed-cliff bands.
  const segments = 224;
  const terrainRing = (name: string, rings: { radius: number; y: number }[], mat: StandardMaterial, variation = 0) => {
    const positions: number[] = [];
    const indices: number[] = [];
    const colors: number[] = [];
    const uvs: number[] = [];
    for (const ring of rings) {
      for (let i = 0; i <= segments; i += 1) {
        const angle = (i / segments) * Math.PI * 2;
        const point = outline(angle, ring.radius, ring.y);
        point.y = coastalGroundHeight(ring.radius);
        positions.push(point.x, point.y, point.z);
        uvs.push(point.x / 1600 + .5, .5 - point.z / 1600);
        const shade = 1 - variation * (0.5 + 0.5 * Math.sin(angle * 11 + ring.radius * 13));
        colors.push(shade, shade, shade, 1);
      }
    }
    for (let ring = 0; ring < rings.length - 1; ring += 1) {
      for (let i = 0; i < segments; i += 1) {
        const a = ring * (segments + 1) + i;
        const b = a + segments + 1;
        // Babylon's left-handed winding must face up on the horizontal rings.
        indices.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }
    const vertexData = new VertexData();
    vertexData.positions = positions;
    vertexData.indices = indices;
    vertexData.colors = colors;
    vertexData.uvs = uvs;
    const normals: number[] = [];
    VertexData.ComputeNormals(positions, indices, normals);
    // A zero-radius ring repeats its centre; its unused seam vertex still
    // needs a valid normal for stable lighting and geometry inspection.
    for (let i = 0; i < normals.length; i += 3) {
      if (Math.hypot(normals[i], normals[i + 1], normals[i + 2]) < 0.01) normals[i + 1] = 1;
    }
    // The closing angular seam duplicates positions for topology; share its
    // lighting normal as well so no visible line crosses the sloping beach.
    for (let ring = 0; ring < rings.length; ring += 1) {
      const first = ring * (segments + 1) * 3;
      const last = first + segments * 3;
      const normal = new Vector3(normals[first] + normals[last], normals[first + 1] + normals[last + 1], normals[first + 2] + normals[last + 2]).normalize();
      for (const index of [first, last]) {
        normals[index] = normal.x;
        normals[index + 1] = normal.y;
        normals[index + 2] = normal.z;
      }
    }
    vertexData.normals = normals;
    const mesh = new Mesh(`island-${name}`, scene);
    vertexData.applyToMesh(mesh);
    return keep(mesh, mat, false, false);
  };
  const groundRings = [0, .46, .8, .96, 1, ...Array.from({ length: 18 }, (_, index) => 1 + (index + 1) * .135 / 18)];
  terrainRing("lawn", groundRings.map(radius => ({ radius, y: coastalGroundHeight(radius) })), grass, .06);
  const ocean = MeshBuilder.CreateGround("island-ocean", { width: 1600, height: 1600, subdivisions: 1 }, scene);
  ocean.position.y = -1.85;
  keep(ocean, water.material, false, false);
  ocean.receiveShadows = false;

  // Foam is broken into short ribbons instead of a continuous graphic outline.
  const ribbon = (name: string, path: Vector3[], width: number, mat: StandardMaterial, batch = true) => {
    const outer = path.map((point) => new Vector3(point.x, point.y, point.z + width));
    const mesh = MeshBuilder.CreateRibbon(`island-${name}`, { pathArray: [path, outer], sideOrientation: Mesh.DOUBLESIDE }, scene);
    return keep(mesh, mat, false, batch);
  };
  for (let i = 0; i < 37; i += 1) {
    const angle = (i / 37) * Math.PI * 2;
    const length = 0.035 + random() * 0.07;
    const path = Array.from({ length: 7 }, (_, index) => outline(angle + index / 6 * length, 1.14 + random() * 0.005, -1.775));
    ribbon("shore-foam", path, 0.085, surf);
  }

  const broadleaf = (x: number, z: number, scale: number, variant: number) => {
    cylinder("tree-trunk", 2.6 * scale, 0.31 * scale, 0.21 * scale, new Vector3(x, 1.25 * scale, z), trunk, 7);
    sphere("tree-crown", new Vector3(x, 3.1 * scale, z), new Vector3(1.48 * scale, 1.8 * scale, 1.36 * scale), leaves[variant]);
    sphere("tree-crown-side", new Vector3(x + 0.85 * scale, 2.95 * scale, z + 0.22 * scale), new Vector3(1.05 * scale, 1.23 * scale, 1.1 * scale), leaves[(variant + 1) % leaves.length]);
    sphere("tree-crown-tip", new Vector3(x - 0.56 * scale, 4 * scale, z - 0.25 * scale), new Vector3(0.9 * scale, 1.25 * scale, 0.9 * scale), leaves[variant]);
  };
  const pine = (x: number, z: number, scale: number, variant: number) => {
    cylinder("pine-trunk", 3 * scale, 0.28 * scale, 0.2 * scale, new Vector3(x, 1.4 * scale, z), trunk, 7);
    for (let layer = 0; layer < 3; layer += 1) {
      cylinder("pine-foliage", (2.8 - layer * 0.2) * scale, (2.8 - layer * 0.65) * scale, 0.14 * scale,
        new Vector3(x, (2.25 + layer * 0.95) * scale, z), leaves[variant], 8);
    }
  };
  // The same tree silhouettes and palette continue from city courtyards into
  // the coast. Old tile-pack foliage is replaced at its authored positions.
  CITY_GREENERY.forEach((plant, index) => {
    if (plant.kind === "shrub") {
      sphere("city-shrub", new Vector3(plant.x, .48, plant.z), new Vector3(.9, .65, .8), leaves[index % leaves.length]);
      return;
    }
    const scale = Math.min(.85, Math.max(.45, plant.scale * .8));
    broadleaf(plant.x, plant.z, scale, index % leaves.length);
  });
  const obstacles = ISLAND_LAYOUT.filter(entry => entry.type === "road" || entry.type === "main" || entry.modelPath.includes("building") || entry.id.includes("-picnic-")).map(entry => {
    const point = mapCityPoint(entry.position.x + CITY_TILE_SIZE / 2, entry.position.z + CITY_TILE_SIZE / 2);
    return { ...point, radius: entry.type === "road" ? 4.2 : Math.max(2.8, (entry.targetScale ?? 3.6) * .65) };
  });
  const clearForPlant = (x: number, z: number, padding = 0) => !obstacles.some(obstacle => Math.hypot(x - obstacle.x, z - obstacle.z) < obstacle.radius + padding);
  const treeCount = isMobileDevice() ? 104 : 158;
  for (let i = 0; i < treeCount; i += 1) {
    const angle = i / treeCount * Math.PI * 2 + (random() - 0.5) * 0.13;
    const p = outline(angle, 0.63 + random() * 0.32, 0);
    if (!clearForPlant(p.x, p.z, .8)) continue;
    if (!isClearOfCoastalTrails(p.x, p.z, .65)) continue;
    // Leave the lighthouse headland and the marina entrance comfortably open.
    if (p.x > 44 && p.z > -22 && p.z < -5) continue;
    if (p.x > -30 && p.x < -16 && p.z < -37) continue;
    const scale = 0.7 + random() * 0.49;
    const variant = Math.floor(random() * leaves.length);
    if (random() > 0.72) pine(p.x, p.z, scale, variant);
    else broadleaf(p.x, p.z, scale, variant);
  }
  for (let i = 0; i < 108; i += 1) {
    const angle = random() * Math.PI * 2;
    const radius = 1.025 + random() * .067;
    const p = outline(angle, radius);
    const scale = .28 + random() * .6;
    p.y = coastalGroundHeight(radius) - scale * .2;
    const rock = MeshBuilder.CreateIcoSphere("island-shore-rock", { radius: 1, subdivisions: 1, flat: true }, scene);
    rock.position.copyFrom(p);
    rock.scaling.set(scale * 1.3, scale * 0.77, scale);
    rock.rotation.set(random(), random() * Math.PI, random() * 0.4);
    // Leave the beach access mouths clear, consuming the same random values
    // so the rest of the established planting and shoreline remain unchanged.
    const accessBlocked = BEACH_CONNECTIONS.some(connection => {
      const angle = Math.atan2((p.z - 2) / 58, (p.x - 2) / 64);
      const delta = Math.atan2(Math.sin(angle - connection.angle), Math.cos(angle - connection.angle));
      return Math.abs(delta) * Math.hypot(p.x - 2, p.z - 2) < connection.width / 2 + scale;
    });
    if (accessBlocked) { rock.dispose(); continue; }
    keep(rock, i % 4 === 0 ? stone : pebble, true);
  }
  for (let i = 0; i < 94; i += 1) {
    const p = outline(random() * Math.PI * 2, 0.84 + random() * 0.12, 0);
    if (!clearForPlant(p.x, p.z)) continue;
    if (!isClearOfCoastalTrails(p.x, p.z, .6)) continue;
    // The southwest gate crosses this small pocket between the city and the
    // coast trail. Leave its walking surface free of low planting as well.
    if (Math.hypot(p.x + 34.8, p.z + 37.5) < 1.6) continue;
    if (p.x > 44 && p.z > -22 && p.z < -5) continue;
    sphere("coastal-shrub", new Vector3(p.x, 0.35, p.z), new Vector3(0.55, 0.5, 0.48), leaves[i % leaves.length], false);
    if (i % 3 === 0) sphere("wildflowers", new Vector3(p.x + 0.3, 0.59, p.z), new Vector3(0.17, 0.16, 0.17), flowers, false);
  }

  // The lighthouse is a complete miniature, with a gallery, striped tower,
  // glass lantern, standing-seam roof and a little keeper's cottage.
  const lighthouseX = 53;
  const lighthouseZ = -13;
  cylinder("lighthouse-footing", 0.3, 4.4, 4.4, new Vector3(lighthouseX, 0.09, lighthouseZ), stone, 24);
  const towerHeight = 7.8;
  for (let band = 0; band < 6; band += 1) {
    const bottom = 2.3 - band * 0.125;
    cylinder("lighthouse-band", towerHeight / 6, bottom, bottom - 0.125,
      new Vector3(lighthouseX, 0.24 + (band + 0.5) * towerHeight / 6, lighthouseZ), band % 3 === 1 ? terracotta : cream, 24);
  }
  cylinder("lighthouse-gallery", 0.22, 3.25, 3.25, new Vector3(lighthouseX, 8.14, lighthouseZ), cream, 24);
  cylinder("lantern-room", 1.2, 1.72, 1.72, new Vector3(lighthouseX, 8.88, lighthouseZ), lamp, 16);
  cylinder("lantern-roof", 0.92, 2.8, 0.2, new Vector3(lighthouseX, 9.9, lighthouseZ), teal, 16);
  cylinder("lighthouse-finial", 0.6, 0.12, 0.02, new Vector3(lighthouseX, 10.62, lighthouseZ), metal, 8);
  for (let i = 0; i < 12; i += 1) {
    const a = i / 12 * Math.PI * 2;
    cylinder("gallery-post", 0.82, 0.055, 0.055, new Vector3(lighthouseX + Math.cos(a) * 1.48, 8.57, lighthouseZ + Math.sin(a) * 1.48), metal, 5);
    if (i % 2 === 0) cylinder("lantern-frame", 1.25, 0.085, 0.085, new Vector3(lighthouseX + Math.cos(a) * 0.86, 8.89, lighthouseZ + Math.sin(a) * 0.86), metal, 5);
  }
  const galleryRail = MeshBuilder.CreateTorus("island-gallery-rail", { diameter: 2.96, thickness: 0.07, tessellation: 24 }, scene);
  galleryRail.position.set(lighthouseX, 8.97, lighthouseZ);
  keep(galleryRail, metal, true);
  box("lighthouse-door", new Vector3(0.62, 1.28, 0.08), new Vector3(lighthouseX, 0.88, lighthouseZ - 1.12), teal);
  for (const y of [3.9, 6.5]) {
    box("lighthouse-window-frame", new Vector3(0.5, 0.72, 0.12), new Vector3(lighthouseX, y, lighthouseZ - 1.04 + (y - 3.9) * 0.028), cream);
    box("lighthouse-window", new Vector3(0.32, 0.5, 0.14), new Vector3(lighthouseX, y, lighthouseZ - 1.06 + (y - 3.9) * 0.028), teal);
  }
  box("keepers-house", new Vector3(3.3, 1.9, 2.6), new Vector3(lighthouseX - 3.4, 0.95, lighthouseZ + 1), cream);
  const roofSlope = Math.atan2(0.95, 1.55);
  for (const side of [-1, 1]) {
    const roofPanel = box("keepers-roof", new Vector3(3.8, 0.15, Math.hypot(0.95, 1.55)),
      new Vector3(lighthouseX - 3.4, 2.375, lighthouseZ + 1 + side * 0.775), terracotta);
    roofPanel.rotation.x = side * roofSlope;
  }
  const gables = new Mesh("island-cottage-gables", scene);
  const gableData = new VertexData();
  gableData.positions = [-1.65, 1.9, -1.3, -1.65, 2.7, 0, -1.65, 1.9, 1.3,
    1.65, 1.9, -1.3, 1.65, 2.7, 0, 1.65, 1.9, 1.3];
  gableData.indices = [0, 1, 2, 3, 5, 4];
  gableData.uvs = [0, 0, 0.5, 1, 1, 0, 0, 0, 0.5, 1, 1, 0];
  const gableNormals: number[] = [];
  VertexData.ComputeNormals(gableData.positions, gableData.indices, gableNormals);
  gableData.normals = gableNormals;
  gableData.applyToMesh(gables);
  gables.position.set(lighthouseX - 3.4, 0, lighthouseZ + 1);
  keep(gables, cream, true);
  box("keepers-door", new Vector3(0.7, 1.35, 0.08), new Vector3(lighthouseX - 3.2, 0.68, lighthouseZ - .34), teal);
  box("keepers-window", new Vector3(0.65, 0.68, 0.08), new Vector3(lighthouseX - 4.35, 1.19, lighthouseZ - .34), teal);
  box("cottage-chimney", new Vector3(0.48, 1.2, 0.5), new Vector3(lighthouseX - 2.6, 2.85, lighthouseZ + 1.4), cream);
  // The sandy approach and doorstep belong to the district's unified trail
  // surface, so their join with the coast walk has no overlapping edge pieces.
  const lighthouseLight = new PointLight("island-lighthouse-lamp", new Vector3(lighthouseX, 8.9, lighthouseZ), scene);
  lighthouseLight.diffuse = Color3.FromHexString("#FFD99B");
  lighthouseLight.range = 24;
  lighthouseLight.intensity = 0;

  // A timber boardwalk sits just above the water on the southwestern shore.
  const pierX = -23;
  const pierStart = -48;
  const pierEnd = -71.8;
  // The boardwalk starts above the lawn, descends across the beach, then
  // reaches beyond the tideline. All outer berths sit over open water.
  const deckHeight = (z: number) => z >= -55 ? .07 : z <= -60.5 ? -.455 : .07 - (-55 - z) / 5.5 * .525;
  box("pier-inland-walk", new Vector3(2.8, .24, 7.55), new Vector3(pierX, -.05, -51.225), wood);
  const gangway = box("pier-gangway", new Vector3(2.8, .24, Math.hypot(5.5, .525)), new Vector3(pierX, (.07 - .455) / 2 - .12, -57.75), wood);
  gangway.rotation.x = -Math.atan2(.525, 5.5);
  box("pier-deck", new Vector3(2.8, .24, 12.1), new Vector3(pierX, -.575, -66.55), wood);
  box("pier-end", new Vector3(8, .25, 2.65), new Vector3(pierX + 1.4, -.58, pierEnd), wood);
  for (let z = pierStart; z >= pierEnd; z -= .43) {
    const seam = box("deck-board-seam", new Vector3(2.7, .012, .033), new Vector3(pierX, deckHeight(z) + .006, z), darkWood, false);
    if (z < -55 && z > -60.5) seam.rotation.x = gangway.rotation.x;
  }
  for (let z = pierStart; z >= pierEnd; z -= 2.05) {
    for (const side of [-1, 1]) {
      const top = deckHeight(z) + .94;
      cylinder("pier-piling", top + 1.97, .21, .21, new Vector3(pierX + side * 1.37, (top - 1.97) / 2, z), darkWood, 8);
      sphere("piling-cap", new Vector3(pierX + side * 1.37, top, z), new Vector3(.16, .09, .16), cream, false);
    }
  }
  box("pier-access", new Vector3(2.8, 0.5, 2), new Vector3(pierX, -0.23, pierStart + 0.8), wood);
  const lantern = (x: number, y: number, z: number) => {
    cylinder("lantern-post", 2.25, 0.11, 0.11, new Vector3(x, y + 1.125, z), metal, 8);
    box("lantern", new Vector3(0.36, 0.46, 0.36), new Vector3(x, y + 2.34, z), lamp, false);
    cylinder("lantern-cap", 0.18, 0.59, 0.05, new Vector3(x, y + 2.66, z), metal, 4);
  };
  lantern(pierX - 1.25, deckHeight(pierStart - 1.7), pierStart - 1.7);
  lantern(pierX + 1.25, -.455, pierEnd + 1.7);

  const boats: { meshes: Mesh[]; y: number[]; phase: number }[] = [];
  const boat = (x: number, z: number, angle: number, scale: number, hullMaterial: StandardMaterial) => {
    const pieces: Mesh[] = [];
    const waterlineY = -1.85 + .39 * scale * .55;
    const attach = (mesh: Mesh, local: Vector3) => {
      mesh.position.set(x + (local.x * Math.cos(angle) + local.z * Math.sin(angle)) * scale,
        waterlineY + local.y * scale, z + (local.z * Math.cos(angle) - local.x * Math.sin(angle)) * scale);
      mesh.rotation.y += angle;
      mesh.scaling.scaleInPlace(scale);
      mesh.isPickable = false;
      meshes.push(mesh);
      pieces.push(mesh);
      return mesh;
    };
    const hull = MeshBuilder.CreateSphere("island-sailboat-hull", { diameter: 2, segments: 6 }, scene);
    hull.scaling.set(0.74, 0.39, 1.8);
    hull.material = hullMaterial;
    attach(hull, Vector3.Zero());
    const deck = MeshBuilder.CreateBox("island-sailboat-deck", { width: 1.04, depth: 2.4, height: 0.12 }, scene);
    deck.material = cream;
    attach(deck, new Vector3(0, 0.27, 0));
    const mast = MeshBuilder.CreateCylinder("island-sailboat-mast", { height: 4.5, diameter: 0.055, tessellation: 6 }, scene);
    mast.material = darkWood;
    attach(mast, new Vector3(0, 2.5, 0));
    const sailData = new VertexData();
    sailData.positions = [0, 0.75, 0.12, 0, 4.5, 0.12, 0, 0.75, 1.65, 0, 1.1, -0.12, 0, 4, -0.12, 0, 1.1, -1.22];
    sailData.indices = [0, 1, 2, 3, 5, 4];
    const normals: number[] = [];
    VertexData.ComputeNormals(sailData.positions, sailData.indices, normals);
    sailData.normals = normals;
    const sails = new Mesh("island-linen-sails", scene);
    sailData.applyToMesh(sails);
    sails.material = sailCloth;
    attach(sails, Vector3.Zero());
    boats.push({ meshes: pieces, y: pieces.map((mesh) => mesh.position.y), phase: random() * Math.PI * 2 });
  };
  boat(-18.6, -68.5, .12, .9, teal);
  boat(-26.4, -67, -.2, .68, terracotta);
  boat(-29.5, -72.6, .25, 1.1, cream);
  // A few sails give the surrounding water life while keeping the harbor clear.
  boat(-77, -20, -.85, 1.05, terracotta);
  boat(66, 56, 1.05, .95, teal);
  boat(20, -81, -.35, 1.2, cream);

  // Gentle, horizontal glints suggest moving water without a costly reflection pass.
  const waveMaterial = material("water-glints", "#C8E7DF");
  waveMaterial.alpha = 0.38;
  waveMaterial.disableLighting = true;
  waveMaterial.emissiveColor = Color3.FromHexString("#B8DAD2");
  const waves: { mesh: Mesh; x: number; phase: number }[] = [];
  for (let i = 0; i < 44; i += 1) {
    const angle = random() * Math.PI * 2;
    const p = outline(angle, 1.25 + random() * 0.85, -1.77);
    const length = 0.8 + random() * 3.4;
    const path = [new Vector3(0, 0, 0), new Vector3(length * 0.5, 0, -0.08), new Vector3(length, 0, 0)];
    const wave = ribbon("water-glint", path, 0.04 + random() * 0.05, waveMaterial, false);
    wave.position.copyFrom(p);
    waves.push({ mesh: wave, x: p.x, phase: random() * Math.PI * 2 });
  }

  // Static details share a handful of draw calls, even with a lush tree line.
  for (const { meshes: pieces, castsShadow } of batches.values()) {
    if (pieces.length === 1) {
      if (castsShadow) shadowGenerator.addShadowCaster(pieces[0]);
      continue;
    }
    const merged = Mesh.MergeMeshes(pieces, true, true, undefined, false, false);
    if (!merged) continue;
    merged.name = `island-batched-${merged.material?.name ?? "detail"}`;
    merged.isPickable = false;
    merged.receiveShadows = true;
    meshes.push(merged);
    if (castsShadow) shadowGenerator.addShadowCaster(merged);
  }

  let time = 0;
  const observer = scene.onBeforeRenderObservable.add(() => {
    if (prefersReducedMotion()) return;
    time += Math.min(scene.getEngine().getDeltaTime(), 60) * 0.001;
    for (const wave of waves) {
      wave.mesh.position.x = wave.x + Math.sin(time * 0.32 + wave.phase) * 0.55;
      wave.mesh.visibility = 0.42 + (Math.sin(time * 0.65 + wave.phase) + 1) * 0.28;
    }
    for (const sailboat of boats) {
      sailboat.meshes.forEach((mesh, index) => { mesh.position.y = sailboat.y[index] + Math.sin(time * 1.15 + sailboat.phase) * 0.075; });
    }
  });

  return {
    setDayMode(day: boolean) {
      water.setDayMode(day);
      surf.diffuseColor = Color3.FromHexString(day ? "#CAE9D9" : "#668E95");
      lamp.emissiveColor = Color3.FromHexString("#FFC779").scale(day ? 0.25 : 1.65);
      lighthouseLight.intensity = day ? 0 : 2.2;
      waveMaterial.emissiveColor = Color3.FromHexString(day ? "#B8DAD2" : "#73929B");
      waveMaterial.alpha = day ? 0.38 : 0.19;
    },
    dispose() {
      if (observer) scene.onBeforeRenderObservable.remove(observer);
      lighthouseLight.dispose();
      meshes.forEach((mesh) => { if (!mesh.isDisposed()) mesh.dispose(); });
      materials.forEach((mat) => mat.dispose());
      water.dispose();
    },
  };
}
