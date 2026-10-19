"use client";

import { useRef, type KeyboardEvent, type PointerEvent } from "react";
import {
  CURVE_VIEW,
  curveDrawing,
  curveToPixel,
  moveCurveHandle,
  pixelToCurve,
  snapHandleToGuide,
  type CubicBezier,
  type CurveFrame,
} from "@blueprint/ui";
import styles from "./motion-studio.module.css";

/** The drawing's own units. The SVG scales to the width of its panel. */
const FRAME: CurveFrame = { width: 280, height: 220, padding: 28 };

/** An arrow moves a handle this far; Shift moves it ten times as far. */
const NUDGE = 0.01;

/**
 * An easing curve drawn as Framer draws it: the curve between two corners, and
 * a handle on each end that is pulled to reshape it. Drag a handle, or focus it
 * and use the arrow keys.
 *
 * The x of a handle stays within 0 to 1, which is what CSS accepts; the y may
 * leave the box a little, which is how an overshoot is made.
 */
export function BezierEditor({
  curve,
  label,
  onChange,
}: {
  curve: CubicBezier;
  /** What the curve is, for a screen reader: the easing's name. */
  label: string;
  onChange: (curve: CubicBezier) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const drawing = curveDrawing(curve, FRAME);
  const baseline = curveToPixel({ x: 0, y: 0 }, FRAME).y;
  const top = curveToPixel({ x: 0, y: 1 }, FRAME).y;

  /* A pointer's place in the drawing's own units, whatever width it is shown at. */
  const toFrame = (event: PointerEvent) => {
    const box = svgRef.current!.getBoundingClientRect();
    return {
      x: ((event.clientX - box.left) / box.width) * FRAME.width,
      y: ((event.clientY - box.top) / box.height) * FRAME.height,
    };
  };

  const drag = (handle: 1 | 2) => ({
    onPointerDown: (event: PointerEvent<SVGCircleElement>) => {
      event.currentTarget.setPointerCapture(event.pointerId);
      event.currentTarget.focus();
    },
    onPointerMove: (event: PointerEvent<SVGCircleElement>) => {
      if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
      /* Shift holds the handle to its guide, so a curve can be pulled along the
         foot or the top without the other number drifting. */
      const at = pixelToCurve(toFrame(event), FRAME);
      onChange(
        moveCurveHandle(
          curve,
          handle,
          event.shiftKey ? snapHandleToGuide(handle, at) : at,
        ),
      );
    },
    onKeyDown: (event: KeyboardEvent<SVGCircleElement>) => {
      const step = event.shiftKey ? NUDGE * 10 : NUDGE;
      const delta = {
        ArrowLeft: [-step, 0],
        ArrowRight: [step, 0],
        ArrowUp: [0, step],
        ArrowDown: [0, -step],
      }[event.key];
      if (!delta) return;
      event.preventDefault();
      const at = handle === 1 ? 0 : 2;
      const next = pixelToCurve(
        curveToPixel(
          { x: curve[at]! + delta[0]!, y: curve[at + 1]! + delta[1]! },
          FRAME,
        ),
        FRAME,
      );
      onChange(moveCurveHandle(curve, handle, next));
    },
  });

  const handleProps = (handle: 1 | 2, at: { x: number; y: number }) => {
    const value = handle === 1 ? [curve[0], curve[1]] : [curve[2], curve[3]];
    return {
      "aria-label": `${label} handle ${handle}`,
      "aria-valuetext": `x ${value[0]}, y ${value[1]}`,
      className: styles.bezierHandle,
      cx: at.x,
      cy: at.y,
      r: 7,
      role: "slider",
      tabIndex: 0,
      ...drag(handle),
    };
  };

  return (
    <svg
      ref={svgRef}
      aria-label={`${label} curve`}
      className={styles.bezier}
      role="group"
      viewBox={`0 0 ${FRAME.width} ${FRAME.height}`}
    >
      {/* The box the curve runs in: no progress at the foot, all of it at the top. */}
      <line
        className={styles.bezierGuide}
        x1={FRAME.padding}
        x2={FRAME.width - FRAME.padding}
        y1={baseline}
        y2={baseline}
      />
      <line
        className={styles.bezierGuide}
        x1={FRAME.padding}
        x2={FRAME.width - FRAME.padding}
        y1={top}
        y2={top}
      />
      <line
        className={styles.bezierStem}
        x1={drawing.start.x}
        x2={drawing.handle1.x}
        y1={drawing.start.y}
        y2={drawing.handle1.y}
      />
      <line
        className={styles.bezierStem}
        x1={drawing.end.x}
        x2={drawing.handle2.x}
        y1={drawing.end.y}
        y2={drawing.handle2.y}
      />
      <path className={styles.bezierCurve} d={drawing.path} />
      <circle
        className={styles.bezierEnd}
        cx={drawing.start.x}
        cy={drawing.start.y}
        r={5}
      />
      <circle
        className={styles.bezierEnd}
        cx={drawing.end.x}
        cy={drawing.end.y}
        r={5}
      />
      <circle {...handleProps(1, drawing.handle1)} />
      <circle {...handleProps(2, drawing.handle2)} />
      <title>{`${label}: y from ${CURVE_VIEW.minY} to ${CURVE_VIEW.maxY}`}</title>
    </svg>
  );
}
