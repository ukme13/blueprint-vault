import type { CubicBezier, EasingToken } from "./types";

/** A number as CSS would be written by hand: `1`, not `1.0`; `0.05`, not `.05`. */
function cssNumber(value: number): string {
  return String(Number(value.toFixed(3)));
}

/** `cubic-bezier(0.2, 0, 0, 1)` from the four numbers. */
export function cubicBezierCss(curve: CubicBezier): string {
  return `cubic-bezier(${curve.map(cssNumber).join(", ")})`;
}

/** An easing from its numbers, with the CSS derived from them. */
export function easingToken(
  id: string,
  name: string,
  curve: CubicBezier,
): EasingToken {
  return { id, name, curve, css: cubicBezierCss(curve) };
}
