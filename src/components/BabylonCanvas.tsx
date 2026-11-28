import { Engine } from "@babylonjs/core/Engines/engine";
import { useEffect, useRef, useState } from "react";
import type { BuildingKey } from "../data/cityLayout";
import { createCityScene, type SceneControls } from "../scene/createScene";
import { isMobileDevice } from "../utils/device";
import { isLowEndDevice } from "../utils/homeView";

type BabylonCanvasProps = {
  isDay: boolean;
  /** Stop rendering while something covers the whole canvas (e.g. a full-screen sheet). */
  paused?: boolean;
  onBuildingSelect: (key: BuildingKey | null) => void;
  onSceneReady?: (controls: SceneControls) => void;
  onLoadingChange?: (loading: boolean) => void;
  onAllAssetsLoaded?: () => void;
};

const BabylonCanvas = ({
  isDay,
  paused = false,
  onBuildingSelect,
  onSceneReady,
  onLoadingChange,
  onAllAssetsLoaded,
}: BabylonCanvasProps) => {
  const [sceneError, setSceneError] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const controlsRef = useRef<SceneControls | null>(null);
  const onBuildingSelectRef = useRef(onBuildingSelect);
  const onSceneReadyRef = useRef(onSceneReady);
  const onLoadingChangeRef = useRef(onLoadingChange);
  const onAllAssetsLoadedRef = useRef(onAllAssetsLoaded);
  const isDayRef = useRef(isDay);
  const pausedRef = useRef(paused);
  const syncRenderLoopRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    onBuildingSelectRef.current = onBuildingSelect;
    onSceneReadyRef.current = onSceneReady;
    onLoadingChangeRef.current = onLoadingChange;
    onAllAssetsLoadedRef.current = onAllAssetsLoaded;
    isDayRef.current = isDay;
  }, [isDay, onBuildingSelect, onLoadingChange, onSceneReady, onAllAssetsLoaded]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    onLoadingChangeRef.current?.(true);
    // No screenshots / canvas.toDataURL are taken, so preserveDrawingBuffer is
    // omitted — letting the browser swap (not copy) the WebGL backbuffer each
    // frame, which lifts the render-loop frame rate.
    let engine: Engine;
    try {
      engine = new Engine(canvas, true, { stencil: true }, isMobileDevice());
    } catch {
      setSceneError(true);
      onLoadingChangeRef.current?.(false);
      return;
    }
    // Low-end devices render at CSS-pixel resolution and skip the traffic.
    const lowDetail = isLowEndDevice();
    const maxPixelRatio = lowDetail ? 1 : isMobileDevice() ? 1.5 : 2;
    engine.setHardwareScalingLevel(1 / Math.min(window.devicePixelRatio || 1, maxPixelRatio));
    let disposed = false;
    let renderScene: (() => void) | null = null;
    let looping = false;

    // Rendering stops while the tab is hidden or the canvas is fully covered.
    const syncRenderLoop = () => {
      const shouldRun = Boolean(renderScene) && !pausedRef.current && document.visibilityState === "visible";
      if (shouldRun && !looping && renderScene) {
        // The canvas may have been hidden (simple view) and resized meanwhile.
        engine.resize();
        engine.runRenderLoop(renderScene);
        looping = true;
      } else if (!shouldRun && looping) {
        engine.stopRenderLoop();
        looping = false;
      }
    };
    syncRenderLoopRef.current = syncRenderLoop;
    document.addEventListener("visibilitychange", syncRenderLoop);

    (async () => {
      const controls = await createCityScene(engine, canvas, {
        lowDetail,
        onBuildingSelect: (key) => onBuildingSelectRef.current?.(key),
        onAllAssetsLoaded: () => {
          if (!disposed) {
            onLoadingChangeRef.current?.(false);
            onAllAssetsLoadedRef.current?.();
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
      renderScene = () => controls.scene.render();
      syncRenderLoop();
      // The labelled landmarks are in place: the island is usable while the
      // decorative props keep streaming in behind the scenes.
      controls.scene.onAfterRenderObservable.addOnce(() => {
        if (!disposed) onLoadingChangeRef.current?.(false);
      });
      // Don't steal focus from a panel that a deep link (/?panel=...) opened.
      if (document.activeElement === document.body) canvas.focus({ preventScroll: true });
    })().catch((error: unknown) => {
      if (disposed) return;
      console.error("The island could not be rendered.", error);
      setSceneError(true);
      onLoadingChangeRef.current?.(false);
    });

    const handleResize = () => {
      engine.resize();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      disposed = true;
      syncRenderLoopRef.current = null;
      document.removeEventListener("visibilitychange", syncRenderLoop);
      window.removeEventListener("resize", handleResize);
      controlsRef.current?.dispose();
      controlsRef.current = null;
      engine.dispose();
    };
  }, []);

  useEffect(() => {
    if (!controlsRef.current) return;
    controlsRef.current.setDayMode(isDay);
  }, [isDay]);

  useEffect(() => {
    pausedRef.current = paused;
    syncRenderLoopRef.current?.();
  }, [paused]);

  return <>
    <canvas ref={canvasRef} className="city-canvas" tabIndex={0} aria-label="Interactive portfolio island. Drag to orbit, scroll to zoom, or use the navigation to explore each district." />
    {sceneError && <div className="island-render-fallback" role="status"><strong>Your portfolio visit can still continue.</strong><p>The 3D view could not start on this device. Use the navigation to explore my work, experience, and story.</p></div>}
  </>;
};

export default BabylonCanvas;
