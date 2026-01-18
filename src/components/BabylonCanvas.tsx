import { Engine } from "@babylonjs/core";
import { useEffect, useRef } from "react";
import type { BuildingKey } from "../data/cityLayout";
import { createCityScene, type SceneControls } from "../scene/createScene";

type BabylonCanvasProps = {
  isDay: boolean;
  onBuildingSelect: (key: BuildingKey | null) => void;
  onSceneReady?: (controls: SceneControls) => void;
  onLoadingChange?: (loading: boolean) => void;
};

const BabylonCanvas = ({
  isDay,
  onBuildingSelect,
  onSceneReady,
  onLoadingChange,
}: BabylonCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const controlsRef = useRef<SceneControls | null>(null);
  const onBuildingSelectRef = useRef(onBuildingSelect);
  const onSceneReadyRef = useRef(onSceneReady);
  const onLoadingChangeRef = useRef(onLoadingChange);
  const isDayRef = useRef(isDay);

  useEffect(() => {
    onBuildingSelectRef.current = onBuildingSelect;
    onSceneReadyRef.current = onSceneReady;
    onLoadingChangeRef.current = onLoadingChange;
    isDayRef.current = isDay;
  }, [isDay, onBuildingSelect, onLoadingChange, onSceneReady]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    onLoadingChangeRef.current?.(true);
    const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
    let disposed = false;

    (async () => {
      const controls = await createCityScene(engine, canvas, {
        onBuildingSelect: (key) => onBuildingSelectRef.current?.(key),
        onAssetsLoaded: () => {
          if (!disposed) {
            onLoadingChangeRef.current?.(false);
          }
        },
      });
      if (disposed) {
        controls.dispose();
        return;
      }
      controlsRef.current = controls;
      controls.setDayMode(isDayRef.current);
      onSceneReadyRef.current?.(controls);
      engine.runRenderLoop(() => {
        controls.scene.render();
      });
      canvas.focus();
    })();

    const handleResize = () => {
      engine.resize();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      disposed = true;
      window.removeEventListener("resize", handleResize);
      controlsRef.current?.dispose();
      controlsRef.current = null;
      engine.dispose();
    };
  }, []);

  useEffect(() => {
    if (!controlsRef.current) return;
    controlsRef.current.setDayMode(isDay);
    onLoadingChangeRef.current?.(true);
    const t = window.setTimeout(() => onLoadingChangeRef.current?.(false), 350);
    return () => window.clearTimeout(t);
  }, [isDay]);

  return <canvas ref={canvasRef} className="city-canvas" tabIndex={0} />;
};

export default BabylonCanvas;
