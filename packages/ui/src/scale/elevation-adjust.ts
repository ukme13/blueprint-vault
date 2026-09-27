import type { ColourMode } from "../color/semantic";
import {
  isInnerShadow,
  type ElevationLevel,
  type ElevationScale,
  type ShadowLayer,
} from "./elevation";
import {
  isGlowLevel,
  isInsetLevel,
  isNeumorphicLevel,
} from "./elevation-styles";

/**
 * Simple's adjustments: a few named sliders per kind of shadow, each moving
 * the level's layers together in the proportions its preset starts with, so
 * no preset is left without controls and none turns into another.
 *
 * Strength is per mode — a dark page swallows a shadow — so the sliders
 * that set an opacity take the mode being tuned; the others set geometry,
 * which both modes share.
 */

export type ElevationAdjustmentStyle =
  "standard" | "inset" | "neumorphic" | "glow";

export type ElevationAdjustment =
  | "distance"
  | "softness"
  | "spread"
  | "opacity"
  | "depth"
  | "highlight"
  | "shadow"
  | "radius"
  | "intensity";

export interface ElevationAdjustmentRange {
  key: ElevationAdjustment;
  min: number;
  max: number;
  step: number;
  /** "px" for geometry; "%" for a strength held as 0–1. */
  unit: "px" | "%";
}

const px = (key: ElevationAdjustment, min: number, max: number) =>
  ({ key, min, max, step: 1, unit: "px" }) as const;
const percent = (key: ElevationAdjustment) =>
  ({ key, min: 0, max: 1, step: 0.01, unit: "%" }) as const;

/** The sliders each kind of shadow gets, in the order they are shown. */
export const ELEVATION_ADJUSTMENTS: Record<
  ElevationAdjustmentStyle,
  readonly ElevationAdjustmentRange[]
> = {
  standard: [
    px("distance", 0, 32),
    px("softness", 1, 48),
    px("spread", -8, 16),
    percent("opacity"),
  ],
  inset: [px("depth", 1, 24), px("softness", 1, 32), percent("opacity")],
  neumorphic: [
    px("distance", 2, 20),
    px("softness", 2, 36),
    percent("highlight"),
    percent("shadow"),
  ],
  glow: [px("radius", 4, 48), px("spread", 0, 24), percent("intensity")],
};

/** The kind of shadow a level is, for its sliders, or null for a custom one. */
export function elevationAdjustmentStyle(
  level: ElevationLevel,
): ElevationAdjustmentStyle | null {
  if (isInsetLevel(level)) return "inset";
  if (isNeumorphicLevel(level)) return "neumorphic";
  if (isGlowLevel(level)) return "glow";
  const [contact, cast] = level.layers;
  const isStandard =
    level.layers.length === 2 &&
    [contact!, cast!].every(
      (layer) => !isInnerShadow(layer) && !layer.hidden && !layer.colour,
    );
  return isStandard ? "standard" : null;
}

type Values = Partial<Record<ElevationAdjustment, number>>;

/**
 * A level's slider values, for one mode. Each is read off the layer that
 * leads it: the cast for Standard, the main inner layer for Inset, the
 * shadow and highlight for Neumorphic, the wide layer for Glow's radius and
 * spread and the tight one for its intensity.
 */
export function readLevelAdjustmentValues(
  level: ElevationLevel,
  mode: ColourMode,
): { style: ElevationAdjustmentStyle; values: Values } | null {
  const style = elevationAdjustmentStyle(level);
  const [first, second] = level.layers;
  if (!style || !first || !second) return null;
  switch (style) {
    case "standard":
      return {
        style,
        values: {
          distance: second.offsetYPx,
          softness: second.blurPx,
          spread: second.spreadPx,
          opacity: second.opacity[mode],
        },
      };
    case "inset":
      return {
        style,
        values: {
          depth: first.offsetYPx,
          softness: first.blurPx,
          opacity: first.opacity[mode],
        },
      };
    case "neumorphic":
      return {
        style,
        values: {
          distance: first.offsetXPx,
          softness: first.blurPx,
          highlight: second.opacity[mode],
          shadow: first.opacity[mode],
        },
      };
    case "glow":
      return {
        style,
        values: {
          radius: second.blurPx,
          spread: second.spreadPx,
          intensity: first.opacity[mode],
        },
      };
  }
}

/** A value held to its slider's range; a strength to two places. */
function held(
  style: ElevationAdjustmentStyle,
  key: ElevationAdjustment,
  value: number | undefined,
): number | undefined {
  const range = ELEVATION_ADJUSTMENTS[style].find((each) => each.key === key);
  if (value === undefined || !range || !Number.isFinite(value))
    return undefined;
  const clamped = Math.min(Math.max(value, range.min), range.max);
  return range.unit === "%" ? Number(clamped.toFixed(2)) : Math.round(clamped);
}

const fainter = (value: number, by: number) =>
  Number(Math.max(value - by, 0).toFixed(2));
const withOpacity = (layer: ShadowLayer, mode: ColourMode, value: number) => ({
  ...layer,
  opacity: { ...layer.opacity, [mode]: value },
});

/** Replace one level's two layers, if it is of this style. */
function tune(
  scale: ElevationScale,
  levelId: string,
  style: ElevationAdjustmentStyle,
  edit: (layers: [ShadowLayer, ShadowLayer]) => [ShadowLayer, ShadowLayer],
): ElevationScale {
  const level = scale.levels.find((each) => each.id === levelId);
  if (!level || elevationAdjustmentStyle(level) !== style) return scale;
  const next = edit([level.layers[0]!, level.layers[1]!]);
  return {
    ...scale,
    levels: scale.levels.map((each) =>
      each.id === levelId ? { ...each, layers: next } : each,
    ),
  };
}

/**
 * Standard and Subtle card: Distance and Softness move the cast, and the
 * contact follows at a quarter, so it stays the tight edge; Spread is the
 * cast's; Opacity sets both for the mode.
 */
export function tuneStandardElevation(
  scale: ElevationScale,
  levelId: string,
  params: Values,
  mode: ColourMode,
): ElevationScale {
  const distance = held("standard", "distance", params.distance);
  const softness = held("standard", "softness", params.softness);
  const spread = held("standard", "spread", params.spread);
  const opacity = held("standard", "opacity", params.opacity);
  return tune(scale, levelId, "standard", ([contact, cast]) => {
    let [a, b] = [contact, cast];
    if (distance !== undefined) {
      a = { ...a, offsetYPx: Math.round(distance / 4) };
      b = { ...b, offsetYPx: distance };
    }
    if (softness !== undefined) {
      a = { ...a, blurPx: Math.max(Math.round(softness / 4), 1) };
      b = { ...b, blurPx: softness };
    }
    if (spread !== undefined) b = { ...b, spreadPx: spread };
    if (opacity !== undefined) {
      a = withOpacity(a, mode, opacity);
      b = withOpacity(b, mode, opacity);
    }
    return [a, b];
  });
}

/**
 * Inset: Depth and Softness move the main inner layer, the fine edge
 * following at a half and a quarter; Opacity sets the main one for the
 * mode, the edge three quarters of it.
 */
export function tuneInsetElevation(
  scale: ElevationScale,
  levelId: string,
  params: Values,
  mode: ColourMode,
): ElevationScale {
  const depth = held("inset", "depth", params.depth);
  const softness = held("inset", "softness", params.softness);
  const opacity = held("inset", "opacity", params.opacity);
  return tune(scale, levelId, "inset", ([main, edge]) => {
    let [a, b] = [main, edge];
    if (depth !== undefined) {
      a = { ...a, offsetYPx: depth };
      b = { ...b, offsetYPx: Math.max(Math.round(depth / 2), 1) };
    }
    if (softness !== undefined) {
      a = { ...a, blurPx: softness };
      b = { ...b, blurPx: Math.max(Math.round(softness / 4), 1) };
    }
    if (opacity !== undefined) {
      a = withOpacity(a, mode, opacity);
      b = withOpacity(b, mode, Number((opacity * 0.75).toFixed(2)));
    }
    return [a, b];
  });
}

/**
 * Neumorphic: Distance moves the shadow down-right and the highlight
 * up-left together; Softness blurs both; Highlight and Shadow set each
 * one's strength for the mode.
 */
export function tuneNeumorphicElevation(
  scale: ElevationScale,
  levelId: string,
  params: Values,
  mode: ColourMode,
): ElevationScale {
  const distance = held("neumorphic", "distance", params.distance);
  const softness = held("neumorphic", "softness", params.softness);
  const highlight = held("neumorphic", "highlight", params.highlight);
  const shadow = held("neumorphic", "shadow", params.shadow);
  return tune(scale, levelId, "neumorphic", ([dark, light]) => {
    let [a, b] = [dark, light];
    if (distance !== undefined) {
      a = { ...a, offsetXPx: distance, offsetYPx: distance };
      b = { ...b, offsetXPx: -distance, offsetYPx: -distance };
    }
    if (softness !== undefined) {
      a = { ...a, blurPx: softness };
      b = { ...b, blurPx: softness };
    }
    if (shadow !== undefined) a = withOpacity(a, mode, shadow);
    if (highlight !== undefined) b = withOpacity(b, mode, highlight);
    return [a, b];
  });
}

/**
 * Glow: Radius blurs the wide layer, the tight one following at a quarter;
 * Spread is the wide layer's; Intensity sets the tight one for the mode and
 * the wide one a little fainter, so the glow fades outward.
 */
export function tuneGlowElevation(
  scale: ElevationScale,
  levelId: string,
  params: Values,
  mode: ColourMode,
): ElevationScale {
  const radius = held("glow", "radius", params.radius);
  const spread = held("glow", "spread", params.spread);
  const intensity = held("glow", "intensity", params.intensity);
  return tune(scale, levelId, "glow", ([inner, outer]) => {
    let [a, b] = [inner, outer];
    if (radius !== undefined) {
      a = { ...a, blurPx: Math.max(Math.round(radius / 4), 1) };
      b = { ...b, blurPx: radius };
    }
    if (spread !== undefined) b = { ...b, spreadPx: spread };
    if (intensity !== undefined) {
      a = withOpacity(a, mode, intensity);
      b = withOpacity(b, mode, fainter(intensity, 0.05));
    }
    return [a, b];
  });
}

/** One slider's change, sent to the tuning for the level's kind of shadow. */
export function tuneElevationLevel(
  scale: ElevationScale,
  levelId: string,
  key: ElevationAdjustment,
  value: number,
  mode: ColourMode,
): ElevationScale {
  const level = scale.levels.find((each) => each.id === levelId);
  const style = level ? elevationAdjustmentStyle(level) : null;
  const params = { [key]: value };
  switch (style) {
    case "standard":
      return tuneStandardElevation(scale, levelId, params, mode);
    case "inset":
      return tuneInsetElevation(scale, levelId, params, mode);
    case "neumorphic":
      return tuneNeumorphicElevation(scale, levelId, params, mode);
    case "glow":
      return tuneGlowElevation(scale, levelId, params, mode);
    default:
      return scale;
  }
}
