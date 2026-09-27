import type { ColourMode } from "../color/semantic";
import {
  isInnerShadow,
  type ElevationLevel,
  type ElevationScale,
  type ShadowLayer,
} from "./elevation";
import { withLevelLayers } from "./elevation-edit";
import {
  isGlowLevel,
  isInsetLevel,
  isNeumorphicLevel,
  layerPair,
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
  const isStandard = layerPair(level)?.every(
    (layer) => !isInnerShadow(layer) && !layer.colour,
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
  const pair = layerPair(level);
  return style && pair
    ? { style, values: readAdjustmentValues(style, pair, mode) }
    : null;
}

/**
 * The slider values two layers stand at, read as the given kind of shadow —
 * whether or not they are a level yet, so a preset's own layers can be read
 * for its defaults.
 */
export function readAdjustmentValues(
  style: ElevationAdjustmentStyle,
  [first, second]: readonly [ShadowLayer, ShadowLayer],
  mode: ColourMode,
): Values {
  switch (style) {
    case "standard":
      return {
        distance: second.offsetYPx,
        softness: second.blurPx,
        spread: second.spreadPx,
        opacity: second.opacity[mode],
      };
    case "inset":
      return {
        depth: first.offsetYPx,
        softness: first.blurPx,
        opacity: first.opacity[mode],
      };
    case "neumorphic":
      return {
        distance: first.offsetXPx,
        softness: first.blurPx,
        highlight: second.opacity[mode],
        shadow: first.opacity[mode],
      };
    case "glow":
      return {
        radius: second.blurPx,
        spread: second.spreadPx,
        intensity: first.opacity[mode],
      };
  }
}

/** A value held to its slider's range; a strength to two places. */
function held(
  style: ElevationAdjustmentStyle,
  key: ElevationAdjustment,
  value: number,
): number | undefined {
  const range = ELEVATION_ADJUSTMENTS[style].find((each) => each.key === key);
  if (!range || !Number.isFinite(value)) return undefined;
  const clamped = Math.min(Math.max(value, range.min), range.max);
  return range.unit === "%" ? Number(clamped.toFixed(2)) : Math.round(clamped);
}

type Pair = [ShadowLayer, ShadowLayer];
type Tuner = (pair: Pair, value: number, mode: ColourMode) => Pair;

const quarter = (value: number) => Math.max(Math.round(value / 4), 1);
const withOpacity = (layer: ShadowLayer, mode: ColourMode, value: number) => ({
  ...layer,
  opacity: { ...layer.opacity, [mode]: value },
});

/**
 * What each slider does to a level's two layers, per kind of shadow. The
 * second, finer layer follows the first in the proportions its preset
 * starts with, so tuning never turns one preset into another.
 */
const TUNERS: Record<
  ElevationAdjustmentStyle,
  Partial<Record<ElevationAdjustment, Tuner>>
> = {
  /* The cast leads; the contact follows at a quarter, the tight edge. */
  standard: {
    distance: ([contact, cast], v) => [
      { ...contact, offsetYPx: Math.round(v / 4) },
      { ...cast, offsetYPx: v },
    ],
    softness: ([contact, cast], v) => [
      { ...contact, blurPx: quarter(v) },
      { ...cast, blurPx: v },
    ],
    spread: ([contact, cast], v) => [contact, { ...cast, spreadPx: v }],
    opacity: ([contact, cast], v, mode) => [
      withOpacity(contact, mode, v),
      withOpacity(cast, mode, v),
    ],
  },
  /* The main inner layer leads; the fine edge follows at a half, a quarter
     and three quarters of its strength. */
  inset: {
    depth: ([main, edge], v) => [
      { ...main, offsetYPx: v },
      { ...edge, offsetYPx: Math.max(Math.round(v / 2), 1) },
    ],
    softness: ([main, edge], v) => [
      { ...main, blurPx: v },
      { ...edge, blurPx: quarter(v) },
    ],
    opacity: ([main, edge], v, mode) => [
      withOpacity(main, mode, v),
      withOpacity(edge, mode, Number((v * 0.75).toFixed(2))),
    ],
  },
  /* Shadow down-right and highlight up-left, moved and blurred together. */
  neumorphic: {
    distance: ([shadow, highlight], v) => [
      { ...shadow, offsetXPx: v, offsetYPx: v },
      { ...highlight, offsetXPx: -v, offsetYPx: -v },
    ],
    softness: ([shadow, highlight], v) => [
      { ...shadow, blurPx: v },
      { ...highlight, blurPx: v },
    ],
    shadow: ([shadow, highlight], v, mode) => [
      withOpacity(shadow, mode, v),
      highlight,
    ],
    highlight: ([shadow, highlight], v, mode) => [
      shadow,
      withOpacity(highlight, mode, v),
    ],
  },
  /* The wide layer leads; the tight one blurs at a quarter, and is the
     stronger by 0.05 so the glow fades outward. */
  glow: {
    radius: ([inner, outer], v) => [
      { ...inner, blurPx: quarter(v) },
      { ...outer, blurPx: v },
    ],
    spread: ([inner, outer], v) => [inner, { ...outer, spreadPx: v }],
    intensity: ([inner, outer], v, mode) => [
      withOpacity(inner, mode, v),
      withOpacity(outer, mode, Number(Math.max(v - 0.05, 0).toFixed(2))),
    ],
  },
};

/**
 * Apply sliders to one level of a given kind. A level of another kind, or
 * an unknown one, is left as it was.
 */
function tuneAs(
  style: ElevationAdjustmentStyle,
  scale: ElevationScale,
  levelId: string,
  params: Values,
  mode: ColourMode,
): ElevationScale {
  return withLevelLayers(scale, levelId, (layers) => {
    const level = { id: levelId, name: "", description: "", layers };
    let pair =
      elevationAdjustmentStyle(level) === style ? layerPair(level) : null;
    if (!pair) return null;
    for (const [key, raw] of Object.entries(params)) {
      const tuner = TUNERS[style][key as ElevationAdjustment];
      const value = held(style, key as ElevationAdjustment, raw);
      if (tuner && value !== undefined) pair = tuner(pair, value, mode);
    }
    return pair;
  });
}

/** Standard and Subtle card: Distance, Softness, Spread, Opacity. */
export function tuneStandardElevation(
  scale: ElevationScale,
  levelId: string,
  params: Values,
  mode: ColourMode,
): ElevationScale {
  return tuneAs("standard", scale, levelId, params, mode);
}

/** Inset: Depth, Softness, Opacity. */
export function tuneInsetElevation(
  scale: ElevationScale,
  levelId: string,
  params: Values,
  mode: ColourMode,
): ElevationScale {
  return tuneAs("inset", scale, levelId, params, mode);
}

/** Neumorphic: Distance, Softness, Highlight, Shadow. */
export function tuneNeumorphicElevation(
  scale: ElevationScale,
  levelId: string,
  params: Values,
  mode: ColourMode,
): ElevationScale {
  return tuneAs("neumorphic", scale, levelId, params, mode);
}

/** Glow: Radius, Spread, Intensity. */
export function tuneGlowElevation(
  scale: ElevationScale,
  levelId: string,
  params: Values,
  mode: ColourMode,
): ElevationScale {
  return tuneAs("glow", scale, levelId, params, mode);
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
  return style ? tuneAs(style, scale, levelId, { [key]: value }, mode) : scale;
}
