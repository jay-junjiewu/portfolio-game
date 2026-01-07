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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    onLoadingChange?.(true);
    const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
    let disposed = false;

    (async () => {
      const controls = await createCityScene(engine, canvas, {
        onBuildingSelect,
      });
      if (disposed) {
        controls.dispose();
        return;
      }
      controlsRef.current = controls;
      controls.setDayMode(isDay);
      onSceneReady?.(controls);
      engine.runRenderLoop(() => {
        controls.scene.render();
      });
      canvas.focus();
      onLoadingChange?.(false);
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
  }, [onBuildingSelect, onSceneReady, onLoadingChange]);

  useEffect(() => {
    if (!controlsRef.current) return;
    controlsRef.current.setDayMode(isDay);
    onLoadingChange?.(true);
    const t = window.setTimeout(() => onLoadingChange?.(false), 350);
    return () => window.clearTimeout(t);
  }, [isDay, onLoadingChange]);

  return <canvas ref={canvasRef} className="city-canvas" tabIndex={0} />;
};

export default BabylonCanvas;
