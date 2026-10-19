import { easingToken } from "./easing";
import { MAX_DURATION_MS, normalizeCurve } from "./normalize";
import type { CubicBezier, EasingToken, MotionScale } from "./types";

/*
 * Changing a motion scale, and the shapes the studio draws it with. Pure: a
 * scale in, a scale out, so what the inspector does is what a test says.
 */

/** How fast the stage plays: 1x is as set, 0.5x takes twice as long. */
export const MOTION_SPEEDS = [1, 0.5, 0.25] as const;
export type MotionSpeed = (typeof MOTION_SPEEDS)[number];

/** A duration as it is played at a speed, in whole milliseconds. */
export function playedMs(ms: number, speed: MotionSpeed): number {
  return Math.round(ms / speed);
}

/** The curves a person reaches for, by the names they know them by. */
export const EASING_PRESETS: readonly EasingToken[] = [
  easingToken("ease-in-out", "Ease In Out", [0.42, 0, 0.58, 1]),
  easingToken("ease-out", "Ease Out", [0, 0, 0.58, 1]),
  easingToken("ease-in", "Ease In", [0.42, 0, 1, 1]),
  easingToken("standard", "Standard", [0.2, 0, 0, 1]),
  easingToken("emphasized", "Emphasized", [0.05, 0.7, 0.1, 1]),
];

/** The preset a curve is, or null for one that is its own. */
export function matchEasingPreset(curve: CubicBezier): EasingToken | null {
  return (
    EASING_PRESETS.find((preset) =>
      preset.curve.every((value, at) => value === curve[at]),
    ) ?? null
  );
}

/** A duration changed, held to what a duration can be. Others are as they were. */
export function setDurationMs(
  scale: MotionScale,
  id: string,
  ms: number,
): MotionScale {
  if (!Number.isFinite(ms)) return scale;
  const next = Math.round(Math.min(MAX_DURATION_MS, Math.max(0, ms)));
  return {
    ...scale,
    durations: scale.durations.map((token) =>
      token.id === id ? { ...token, ms: next } : token,
    ),
  };
}

/** An easing given a new curve, which is held to what CSS accepts. */
export function setEasingCurve(
  scale: MotionScale,
  id: string,
  curve: CubicBezier,
): MotionScale {
  const held = normalizeCurve(curve);
  if (!held) return scale;
  return {
    ...scale,
    easings: scale.easings.map((token) =>
      token.id === id ? easingToken(token.id, token.name, held) : token,
    ),
  };
}

/** `0.2, 0, 0, 1`: the four numbers as they are typed. */
export function formatCurveText(curve: CubicBezier): string {
  return curve.map((value) => String(Number(value.toFixed(3)))).join(", ");
}

/**
 * Four numbers from what was typed: commas or spaces, with or without the
 * `cubic-bezier(` around them. Null when it is not four numbers, so a half-typed
 * value is left to be finished.
 */
export function parseCurveText(text: string): CubicBezier | null {
  const numbers = text.match(/-?\d*\.?\d+/g)?.map(Number);
  if (!numbers || numbers.length !== 4) return null;
  return normalizeCurve(numbers);
}

/* The drawing. A curve is drawn in a box whose y runs from MIN_Y to MAX_Y, so
   an overshoot has room above and below the 0 to 1 the curve itself spans. */
export const CURVE_VIEW = { minY: -0.5, maxY: 1.5 } as const;

export interface CurveFrame {
  width: number;
  height: number;
  /** Room kept round the drawing so a handle at the edge is not cut off. */
  padding: number;
}

export interface Point {
  x: number;
  y: number;
}

/** A curve value (x 0..1, y within the view) as a pixel in the frame. */
export function curveToPixel(point: Point, frame: CurveFrame): Point {
  const innerWidth = frame.width - frame.padding * 2;
  const innerHeight = frame.height - frame.padding * 2;
  const span = CURVE_VIEW.maxY - CURVE_VIEW.minY;
  return {
    x: round(frame.padding + point.x * innerWidth),
    y: round(
      frame.padding + ((CURVE_VIEW.maxY - point.y) / span) * innerHeight,
    ),
  };
}

/** A pixel in the frame as a curve value, held to the view, to two places. */
export function pixelToCurve(pixel: Point, frame: CurveFrame): Point {
  const innerWidth = frame.width - frame.padding * 2;
  const innerHeight = frame.height - frame.padding * 2;
  const span = CURVE_VIEW.maxY - CURVE_VIEW.minY;
  const x = (pixel.x - frame.padding) / innerWidth;
  const y = CURVE_VIEW.maxY - ((pixel.y - frame.padding) / innerHeight) * span;
  const round = (value: number) => Math.round(value * 100) / 100;
  return {
    x: round(Math.min(1, Math.max(0, x))),
    y: round(Math.min(CURVE_VIEW.maxY, Math.max(CURVE_VIEW.minY, y))),
  };
}

export interface CurveDrawing {
  /** The SVG path of the curve, corner to corner. */
  path: string;
  start: Point;
  end: Point;
  /** The two handles, and the lines that join them to the corners. */
  handle1: Point;
  handle2: Point;
}

/** Everything the editor draws, as pixels in the frame. */
export function curveDrawing(
  curve: CubicBezier,
  frame: CurveFrame,
): CurveDrawing {
  const start = curveToPixel({ x: 0, y: 0 }, frame);
  const end = curveToPixel({ x: 1, y: 1 }, frame);
  const handle1 = curveToPixel({ x: curve[0], y: curve[1] }, frame);
  const handle2 = curveToPixel({ x: curve[2], y: curve[3] }, frame);
  const at = (point: Point) => `${round(point.x)} ${round(point.y)}`;
  return {
    path: `M ${at(start)} C ${at(handle1)}, ${at(handle2)}, ${at(end)}`,
    start,
    end,
    handle1,
    handle2,
  };
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/** A curve with one of its two handles moved to a curve value. */
export function moveCurveHandle(
  curve: CubicBezier,
  handle: 1 | 2,
  to: Point,
): CubicBezier {
  return handle === 1
    ? [to.x, to.y, curve[2], curve[3]]
    : [curve[0], curve[1], to.x, to.y];
}
