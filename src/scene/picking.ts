import {
  AbstractMesh,
  Color3,
  PointerEventTypes,
  Scene,
} from "@babylonjs/core";
import type { BuildingKey } from "../data/cityLayout";
import type { LoadedBuilding } from "./loadBuilding";

const HOVER_COLOR = Color3.FromHexString("#ffdf9f");

const collectMeshes = (building: LoadedBuilding) =>
  building.meshes.filter((mesh) => mesh.isPickable);

const applyOutline = (building: LoadedBuilding | null, enabled: boolean) => {
  if (!building) return;
  collectMeshes(building).forEach((mesh) => {
    mesh.renderOutline = enabled;
    mesh.outlineColor = HOVER_COLOR;
    mesh.outlineWidth = 0.04;
  });
};

const findBuildingFromMesh = (
  mesh: AbstractMesh | null,
  lookup: Map<string, LoadedBuilding>
): LoadedBuilding | null => {
  if (!mesh) return null;
  const entryId = mesh.metadata?.cityEntryId;
  if (entryId && lookup.has(entryId)) {
    return lookup.get(entryId) ?? null;
  }
  return mesh.parent instanceof AbstractMesh
    ? findBuildingFromMesh(mesh.parent, lookup)
    : null;
};

export type PickingCallbacks = {
  onSelect: (key: BuildingKey | null) => void;
  onHover?: (key: BuildingKey | null) => void;
  onFocusRequest?: (building: LoadedBuilding) => void;
};

export const setupPicking = (
  scene: Scene,
  buildings: LoadedBuilding[],
  callbacks: PickingCallbacks
) => {
  const buildingMap = new Map<string, LoadedBuilding>();
  buildings.forEach((b) => buildingMap.set(b.entry.id, b));

  let hovered: LoadedBuilding | null = null;

  const pickAtPointer = () => {
    const pickInfo = scene.pick(scene.pointerX, scene.pointerY, (mesh) => !!mesh.isPickable);
    if (!pickInfo || !pickInfo.pickedMesh) {
      return null;
    }
    return findBuildingFromMesh(pickInfo.pickedMesh, buildingMap);
  };

  const handleHoverChange = (next: LoadedBuilding | null) => {
    if (hovered?.entry.id === next?.entry.id) {
      return;
    }

    applyOutline(hovered, false);
    hovered = next && next.entry.type === "main" ? next : null;
    applyOutline(hovered, true);

    callbacks.onHover?.(hovered?.entry.type === "main" ? hovered.entry.key : null);
  };

  const observer = scene.onPointerObservable.add((pointerInfo) => {
    switch (pointerInfo.type) {
      case PointerEventTypes.POINTERMOVE: {
        const building = pickAtPointer();
        handleHoverChange(building);
        break;
      }
      case PointerEventTypes.POINTERUP: {
        const event = pointerInfo.event as PointerEvent;
        if (event.pointerType === "mouse" && event.button !== 0) {
          return;
        }
        const building = pickAtPointer();
        if (building && building.entry.type === "main") {
          callbacks.onSelect(building.entry.key);
          if (event.detail === 2) {
            callbacks.onFocusRequest?.(building);
          }
        } else {
          callbacks.onSelect(null);
        }
        break;
      }
      default:
        break;
    }
  });

  return () => {
    applyOutline(hovered, false);
    scene.onPointerObservable.remove(observer);
  };
};
