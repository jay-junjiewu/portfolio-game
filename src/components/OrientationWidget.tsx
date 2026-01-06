import { ArcRotateCamera, Vector3 } from "@babylonjs/core";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import type { SceneControls } from "../scene/createScene";

type AxisPoint = { x: number; y: number; z: number };
type AxisPoints = {
  x: { pos: AxisPoint; neg: AxisPoint };
  y: { pos: AxisPoint; neg: AxisPoint };
  z: { pos: AxisPoint; neg: AxisPoint };
};

type OrientationWidgetProps = {
  controls: SceneControls | null;
};

const WIDGET_SIZE = 96;
const CENTER = WIDGET_SIZE / 2;
const AXIS_SCALE = WIDGET_SIZE * 0.34;

const serializePoints = (points: AxisPoints) =>
  [
    points.x.pos.x,
    points.x.pos.y,
    points.x.neg.x,
    points.x.neg.y,
    points.y.pos.x,
    points.y.pos.y,
    points.y.neg.x,
    points.y.neg.y,
    points.z.pos.x,
    points.z.pos.y,
    points.z.neg.x,
    points.z.neg.y,
  ]
    .map((value) => value.toFixed(1))
    .join("|");

const OrientationWidget = ({ controls }: OrientationWidgetProps) => {
  const [axisPoints, setAxisPoints] = useState<AxisPoints | null>(null);
  const lastKeyRef = useRef<string>("");

  useEffect(() => {
    if (!controls) return;
    let animationFrame = 0;

    const update = () => {
      const camera = controls.scene.activeCamera;
      if (!(camera instanceof ArcRotateCamera)) {
        animationFrame = window.requestAnimationFrame(update);
        return;
      }

      const viewMatrix = camera.getViewMatrix();
      const axisX = Vector3.TransformNormal(new Vector3(1, 0, 0), viewMatrix);
      const axisY = Vector3.TransformNormal(new Vector3(0, 1, 0), viewMatrix);
      const axisZ = Vector3.TransformNormal(new Vector3(0, 0, 1), viewMatrix);

      const project = (axis: Vector3): AxisPoint => ({
        x: CENTER + axis.x * AXIS_SCALE,
        y: CENTER - axis.y * AXIS_SCALE,
        z: axis.z,
      });

      const nextPoints: AxisPoints = {
        x: { pos: project(axisX), neg: project(axisX.scale(-1)) },
        y: { pos: project(axisY), neg: project(axisY.scale(-1)) },
        z: { pos: project(axisZ), neg: project(axisZ.scale(-1)) },
      };

      const key = serializePoints(nextPoints);
      if (key !== lastKeyRef.current) {
        lastKeyRef.current = key;
        setAxisPoints(nextPoints);
      }

      animationFrame = window.requestAnimationFrame(update);
    };

    animationFrame = window.requestAnimationFrame(update);

    return () => window.cancelAnimationFrame(animationFrame);
  }, [controls]);

  const handleAxisClick = useCallback(
    (axis: "x" | "y" | "z", direction: 1 | -1) => {
      if (!controls) return;
      const camera = controls.scene.activeCamera;
      if (!(camera instanceof ArcRotateCamera)) return;

      const halfPi = Math.PI / 2;
      let alpha = camera.alpha;
      let beta = halfPi;

      if (axis === "x") {
        alpha = direction === 1 ? halfPi : -halfPi;
      } else if (axis === "z") {
        alpha = direction === 1 ? 0 : Math.PI;
      } else {
        beta = direction === 1 ? 0.22 : Math.PI - 0.22;
      }

      controls.setCameraOrbit(alpha, beta);
    },
    [controls]
  );

  if (!controls || !axisPoints) return null;

  const axisButtonStyle = (point: AxisPoint): CSSProperties => ({
    left: `${point.x}px`,
    top: `${point.y}px`,
    zIndex: point.z > 0 ? 2 : 1,
  });

  return (
    <div className="orientation-widget" aria-label="View orientation controls">
      <svg viewBox={`0 0 ${WIDGET_SIZE} ${WIDGET_SIZE}`} aria-hidden="true">
        <line
          x1={CENTER}
          y1={CENTER}
          x2={axisPoints.x.neg.x}
          y2={axisPoints.x.neg.y}
          className="axis-line x neg"
        />
        <line
          x1={CENTER}
          y1={CENTER}
          x2={axisPoints.x.pos.x}
          y2={axisPoints.x.pos.y}
          className="axis-line x pos"
        />
        <line
          x1={CENTER}
          y1={CENTER}
          x2={axisPoints.y.neg.x}
          y2={axisPoints.y.neg.y}
          className="axis-line y neg"
        />
        <line
          x1={CENTER}
          y1={CENTER}
          x2={axisPoints.y.pos.x}
          y2={axisPoints.y.pos.y}
          className="axis-line y pos"
        />
        <line
          x1={CENTER}
          y1={CENTER}
          x2={axisPoints.z.neg.x}
          y2={axisPoints.z.neg.y}
          className="axis-line z neg"
        />
        <line
          x1={CENTER}
          y1={CENTER}
          x2={axisPoints.z.pos.x}
          y2={axisPoints.z.pos.y}
          className="axis-line z pos"
        />
      </svg>

      <button
        type="button"
        className="orientation-button axis-x pos"
        style={axisButtonStyle(axisPoints.x.pos)}
        onClick={() => handleAxisClick("x", 1)}
        aria-label="Align view to +X"
        title="Align to +X"
      >
        X
      </button>
      <button
        type="button"
        className="orientation-button axis-x neg"
        style={axisButtonStyle(axisPoints.x.neg)}
        onClick={() => handleAxisClick("x", -1)}
        aria-label="Align view to -X"
        title="Align to -X"
      />

      <button
        type="button"
        className="orientation-button axis-y pos"
        style={axisButtonStyle(axisPoints.y.pos)}
        onClick={() => handleAxisClick("y", 1)}
        aria-label="Align view to +Y"
        title="Align to +Y"
      >
        Y
      </button>
      <button
        type="button"
        className="orientation-button axis-y neg"
        style={axisButtonStyle(axisPoints.y.neg)}
        onClick={() => handleAxisClick("y", -1)}
        aria-label="Align view to -Y"
        title="Align to -Y"
      />

      <button
        type="button"
        className="orientation-button axis-z pos"
        style={axisButtonStyle(axisPoints.z.pos)}
        onClick={() => handleAxisClick("z", 1)}
        aria-label="Align view to +Z"
        title="Align to +Z"
      >
        Z
      </button>
      <button
        type="button"
        className="orientation-button axis-z neg"
        style={axisButtonStyle(axisPoints.z.neg)}
        onClick={() => handleAxisClick("z", -1)}
        aria-label="Align view to -Z"
        title="Align to -Z"
      />
    </div>
  );
};

export default OrientationWidget;
