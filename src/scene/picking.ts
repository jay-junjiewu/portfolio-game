import {
  AbstractMesh,
  Color3,
  PointerEventTypes,
  Scene,
} from "@babylonjs/core";
import type { PointerInfo } from "@babylonjs/core";
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
  let lastSelectionAt = 0;
  const isCoarsePointer =
    typeof window !== "undefined" &&
    (window.matchMedia?.("(pointer: coarse)").matches ?? false);
  const supportsPointerEvents = typeof window !== "undefined" && "PointerEvent" in window;
  const tapDistancePx = isCoarsePointer ? 48 : 24;
  const tapDistanceSq = tapDistancePx * tapDistancePx;
  const activeTouchPointers = new Set<number>();
  let touchStartId: number | null = null;
  let touchStartClientX = 0;
  let touchStartClientY = 0;
  let touchMoved = false;
  let touchStartBuilding: LoadedBuilding | null = null;

  const getCanvasPosition = (clientX: number, clientY: number) => {
    const canvas = scene.getEngine().getRenderingCanvas();
    if (!canvas) {
      return { x: scene.pointerX, y: scene.pointerY };
    }
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  };

  const pickAtPointer = (pointerInfo?: PointerInfo, event?: PointerEvent) => {
    const pickedMesh = pointerInfo?.pickInfo?.pickedMesh ?? null;
    if (pickedMesh) {
      return findBuildingFromMesh(pickedMesh, buildingMap);
    }
    const { x, y } = event
      ? getCanvasPosition(event.clientX, event.clientY)
      : { x: scene.pointerX, y: scene.pointerY };
    const pickInfo = scene.pick(x, y, (mesh) => !!mesh.isPickable);
    if (!pickInfo || !pickInfo.pickedMesh) {
      return null;
    }
    return findBuildingFromMesh(pickInfo.pickedMesh, buildingMap);
  };

  const isTouchPointer = (event: PointerEvent) =>
    event.pointerType === "touch" || event.pointerType === "pen";

  const selectBuilding = (building: LoadedBuilding | null, clickCount = 1) => {
    if (building && building.entry.type === "main") {
      callbacks.onSelect(building.entry.key);
      if (clickCount === 2) {
        callbacks.onFocusRequest?.(building);
      }
      lastSelectionAt = Date.now();
    } else {
      callbacks.onSelect(null);
    }
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
    const event = pointerInfo.event as PointerEvent;
    const isTouch = isTouchPointer(event);
    switch (pointerInfo.type) {
      case PointerEventTypes.POINTERDOWN: {
        if (!isTouch) {
          break;
        }
        activeTouchPointers.add(event.pointerId);
        if (activeTouchPointers.size === 1) {
          touchStartId = event.pointerId;
          touchStartClientX = event.clientX;
          touchStartClientY = event.clientY;
          touchMoved = false;
          touchStartBuilding = pickAtPointer(pointerInfo, event);
        } else {
          touchMoved = true;
          touchStartBuilding = null;
        }
        break;
      }
      case PointerEventTypes.POINTERMOVE: {
        if (isTouch) {
          if (event.pointerId !== touchStartId) {
            return;
          }
          const dx = event.clientX - touchStartClientX;
          const dy = event.clientY - touchStartClientY;
          if (dx * dx + dy * dy > tapDistanceSq) {
            touchMoved = true;
            touchStartBuilding = null;
          }
          return;
        }
        const building = pickAtPointer();
        handleHoverChange(building);
        break;
      }
      case PointerEventTypes.POINTERUP: {
        if (isTouch) {
          const isPrimaryTouch = event.pointerId === touchStartId;
          activeTouchPointers.delete(event.pointerId);
          if (isPrimaryTouch) {
            const shouldTap = !touchMoved && activeTouchPointers.size === 0;
            const building = touchStartBuilding ?? pickAtPointer(pointerInfo, event);
            touchStartId = null;
            touchMoved = false;
            touchStartBuilding = null;
            if (shouldTap) {
              handleHoverChange(building);
              selectBuilding(building);
            }
          }
          if (activeTouchPointers.size === 0) {
            touchStartId = null;
            touchMoved = false;
            touchStartBuilding = null;
          }
          return;
        }
        if (event.pointerType === "mouse" && event.button !== 0) {
          return;
        }
        const building = pickAtPointer(pointerInfo, event);
        const clickCount = event.detail && event.detail > 0 ? event.detail : 1;
        selectBuilding(building, clickCount);
        break;
      }
      case PointerEventTypes.POINTERCANCEL: {
        if (!isTouch) {
          break;
        }
        activeTouchPointers.delete(event.pointerId);
        if (activeTouchPointers.size === 0) {
          touchStartId = null;
          touchMoved = false;
          touchStartBuilding = null;
        }
        break;
      }
      default:
        break;
    }
  });

  const inputElement = scene.getEngine().getInputElement();
  let fallbackTouchId: number | null = null;
  let fallbackTouchStartX = 0;
  let fallbackTouchStartY = 0;
  let fallbackTouchMoved = false;
  const fallbackIgnoreMs = 200;

  const resetFallbackTouch = () => {
    fallbackTouchId = null;
    fallbackTouchMoved = false;
  };

  const handleTouchStart = (event: TouchEvent) => {
    if (event.touches.length !== 1) {
      resetFallbackTouch();
      fallbackTouchMoved = true;
      return;
    }
    const touch = event.touches[0];
    fallbackTouchId = touch.identifier;
    fallbackTouchStartX = touch.clientX;
    fallbackTouchStartY = touch.clientY;
    fallbackTouchMoved = false;
  };

  const handleTouchMove = (event: TouchEvent) => {
    if (fallbackTouchId === null || fallbackTouchMoved) {
      return;
    }
    const touch = Array.from(event.touches).find((entry) => entry.identifier === fallbackTouchId);
    if (!touch) {
      return;
    }
    const dx = touch.clientX - fallbackTouchStartX;
    const dy = touch.clientY - fallbackTouchStartY;
    if (dx * dx + dy * dy > tapDistanceSq) {
      fallbackTouchMoved = true;
    }
  };

  const handleTouchEnd = (event: TouchEvent) => {
    if (fallbackTouchId === null) {
      return;
    }
    if (fallbackTouchMoved) {
      resetFallbackTouch();
      return;
    }
    if (Date.now() - lastSelectionAt < fallbackIgnoreMs) {
      resetFallbackTouch();
      return;
    }
    const touch = Array.from(event.changedTouches).find(
      (entry) => entry.identifier === fallbackTouchId
    );
    if (!touch) {
      resetFallbackTouch();
      return;
    }
    const { x, y } = getCanvasPosition(touch.clientX, touch.clientY);
    const pickInfo = scene.pick(x, y, (mesh) => !!mesh.isPickable);
    const building = pickInfo?.pickedMesh
      ? findBuildingFromMesh(pickInfo.pickedMesh, buildingMap)
      : null;
    selectBuilding(building);
    resetFallbackTouch();
  };

  const handleTouchCancel = () => {
    resetFallbackTouch();
  };

  if (inputElement && !supportsPointerEvents) {
    inputElement.addEventListener("touchstart", handleTouchStart, { passive: true });
    inputElement.addEventListener("touchmove", handleTouchMove, { passive: true });
    inputElement.addEventListener("touchend", handleTouchEnd, { passive: true });
    inputElement.addEventListener("touchcancel", handleTouchCancel, { passive: true });
  }

  return () => {
    applyOutline(hovered, false);
    scene.onPointerObservable.remove(observer);
    if (inputElement && !supportsPointerEvents) {
      inputElement.removeEventListener("touchstart", handleTouchStart);
      inputElement.removeEventListener("touchmove", handleTouchMove);
      inputElement.removeEventListener("touchend", handleTouchEnd);
      inputElement.removeEventListener("touchcancel", handleTouchCancel);
    }
  };
};
