import {
  layoutVariableName,
  parseLayoutRawPx,
  type LayoutToken,
} from "./layout-tokens";
import { resolveRadius, type RadiusScale } from "./radius";

/**
 * What each component radius falls back to when a scope does not set it.
 *
 * The Uses rows always set a value, so this is for a page that has not got
 * one: a use that was deleted, or CSS written before the use existed. It is
 * the base radius the control used before it had its own.
 */
export const COMPONENT_RADIUS_FALLBACKS: Readonly<Record<string, string>> = {
  "radius-button": "element",
  "radius-input": "element",
  "radius-chip": "inner",
  "radius-surface": "container",
};

/**
 * A component's corner as CSS, with its fallback: `radius-button` becomes
 * `var(--radius-button, var(--radius-element))`.
 *
 * The fallback sits in the `var()` and not in a root declaration on purpose.
 * A custom property declared on `:root` as `var(--radius-element)` resolves
 * there, and a preview that sets its own element radius would inherit the
 * root's px instead.
 */
export function componentRadiusCss(id: string): string {
  const fallback = COMPONENT_RADIUS_FALLBACKS[id];
  const own = `var(${layoutVariableName(id)}`;
  return fallback ? `${own}, var(--radius-${fallback}))` : `${own})`;
}

/**
 * The px a radius use resolves to on one frame: a typed px as written, or
 * the base radius it points at, at the current roundness. `undefined` for a
 * cell that names no radius.
 */
export function layoutRadiusPx(
  cell: string | undefined,
  scale: RadiusScale,
): number | undefined {
  if (!cell) return undefined;
  const px = parseLayoutRawPx(cell);
  if (px !== undefined) return Math.round(px);
  return resolveRadius(scale).find((token) => token.id === cell)?.px;
}

export type RadiusSampleShape = "button" | "input" | "chip" | "card" | "box";

const SAMPLE_SHAPES: Readonly<Record<string, RadiusSampleShape>> = {
  "radius-button": "button",
  "radius-input": "input",
  "radius-chip": "chip",
  "radius-surface": "card",
};

export interface RadiusSample {
  id: string;
  name: string;
  shape: RadiusSampleShape;
  px: number;
}

/**
 * One sample per radius use on one frame, for the studio to draw at real
 * size. A use the studio has no component for is drawn as a plain box, so
 * a custom use still shows its corner.
 */
export function radiusUseSamples(
  tokens: readonly LayoutToken[],
  deviceId: string,
  scale: RadiusScale,
): RadiusSample[] {
  return tokens
    .filter((token) => token.kind === "radius")
    .map((token) => ({
      id: token.id,
      name: token.name,
      shape: SAMPLE_SHAPES[token.id] ?? "box",
      px: layoutRadiusPx(token.byDevice[deviceId], scale) ?? 0,
    }));
}
