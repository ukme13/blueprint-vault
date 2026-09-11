import { formatLength } from "./export";
import { ROOT_FONT_SIZE_PX, type TypeScaleUnit } from "./types";

function cssNumber(value: number): string {
  return `${Number(value.toFixed(4))}`;
}

/**
 * A CSS `clamp()` that interpolates `fromValue` at `fromWidthPx` to `toValue`
 * at `toWidthPx`.
 *
 * Progress is `(100vw - fromWidth) / span`, which is unitless, so the same
 * expression works for lengths (px / rem / pt) and for unitless line-height.
 * Bounds are the smaller and larger of the two values: CSS `clamp()` requires
 * min ≤ max, and a negative slope (type that shrinks as the viewport grows)
 * still interpolates correctly.
 *
 * Equal values, or equal widths, fall back to the starting value. Viewport
 * widths stay in px whatever `format` emits for the value.
 */
export function fluidClamp(
  fromWidthPx: number,
  fromValue: number,
  toWidthPx: number,
  toValue: number,
  format: (value: number) => string,
): string {
  if (fromWidthPx === toWidthPx || fromValue === toValue) {
    return format(fromValue);
  }
  const lo = Math.min(fromValue, toValue);
  const hi = Math.max(fromValue, toValue);
  const span = toWidthPx - fromWidthPx;
  const delta = toValue - fromValue;
  const op = delta >= 0 ? "+" : "-";
  const preferred = `calc(${format(fromValue)} ${op} ${format(Math.abs(delta))} * (100vw - ${fromWidthPx}px) / ${span}px)`;
  return `clamp(${format(lo)}, ${preferred}, ${format(hi)})`;
}

export function fluidLengthClamp(
  fromWidthPx: number,
  fromPx: number,
  toWidthPx: number,
  toPx: number,
  unit: TypeScaleUnit,
  remRootPx: number = ROOT_FONT_SIZE_PX,
): string {
  return fluidClamp(fromWidthPx, fromPx, toWidthPx, toPx, (value) =>
    formatLength(value, unit, remRootPx),
  );
}

export function fluidUnitlessClamp(
  fromWidthPx: number,
  fromValue: number,
  toWidthPx: number,
  toValue: number,
): string {
  return fluidClamp(fromWidthPx, fromValue, toWidthPx, toValue, cssNumber);
}

function cssEm(value: number): string {
  return `${cssNumber(value)}em`;
}

/** Interpolate tracking already converted to em. Viewport span stays px. */
export function fluidEmClamp(
  fromWidthPx: number,
  fromEm: number,
  toWidthPx: number,
  toEm: number,
): string {
  return fluidClamp(fromWidthPx, fromEm, toWidthPx, toEm, cssEm);
}
