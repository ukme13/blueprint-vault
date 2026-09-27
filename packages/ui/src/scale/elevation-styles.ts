import type { ColourMode } from "../color/semantic";
import {
  isInnerShadow,
  type ElevationLevel,
  type ElevationScale,
  type ShadowLayer,
} from "./elevation";

/**
 * The shapes Simple can tune without the layer list: Neumorphic by how far
 * it stands off the page, Glow by how wide and how strong it is. Each is
 * recognised by its shape, not by its exact values, so a Glow made bigger
 * is still a Glow rather than Custom.
 *
 * Inset needs nothing here: it is a contact and a cast like Standard, only
 * inner, and the pads set both — see `isSimpleElevationLevel`.
 */

/** The Distance slider's range, in px: how far a neumorphic surface lifts. */
export const NEUMORPHIC_DISTANCE = { min: 2, max: 16 } as const;
/** The Size slider's range, in px: the glow's outer blur. */
export const GLOW_SIZE = { min: 4, max: 32 } as const;

function pair(level: ElevationLevel): [ShadowLayer, ShadowLayer] | null {
  const [first, second] = level.layers;
  if (level.layers.length !== 2 || !first || !second) return null;
  if (first.hidden || second.hidden) return null;
  return [first, second];
}

/** Two inner layers in the scale's colour, as Inset is. */
export function isInsetLevel(level: ElevationLevel): boolean {
  const layers = pair(level);
  return Boolean(
    layers?.every((layer) => isInnerShadow(layer) && !layer.colour),
  );
}

/**
 * Neumorphic's shape: a shadow down and to the right in the scale's colour,
 * and a highlight the same distance up and to the left in a colour of its
 * own, both with the same blur.
 */
export function isNeumorphicLevel(level: ElevationLevel): boolean {
  const layers = pair(level);
  if (!layers) return false;
  const [shadow, highlight] = layers;
  const distance = shadow.offsetXPx;
  return (
    !isInnerShadow(shadow) &&
    !isInnerShadow(highlight) &&
    distance > 0 &&
    shadow.offsetYPx === distance &&
    highlight.offsetXPx === -distance &&
    highlight.offsetYPx === -distance &&
    shadow.blurPx === highlight.blurPx &&
    !shadow.colour &&
    Boolean(highlight.colour)
  );
}

/** Glow's shape: two drop layers with no offset, in one colour of their own. */
export function isGlowLevel(level: ElevationLevel): boolean {
  const layers = pair(level);
  if (!layers) return false;
  const [inner, outer] = layers;
  return (
    layers.every(
      (layer) =>
        !isInnerShadow(layer) &&
        layer.offsetXPx === 0 &&
        layer.offsetYPx === 0 &&
        Boolean(layer.colour),
    ) &&
    inner.colour!.trackId === outer.colour!.trackId &&
    inner.colour!.weight === outer.colour!.weight
  );
}

function clamp(value: number, range: { min: number; max: number }): number {
  if (!Number.isFinite(value)) return range.min;
  return Math.round(Math.min(Math.max(value, range.min), range.max));
}

function unit(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Number(Math.min(Math.max(value, 0), 1).toFixed(2));
}

/** Replace one level's two layers, or return the scale as it was. */
function withPair(
  scale: ElevationScale,
  levelId: string,
  applies: (level: ElevationLevel) => boolean,
  edit: (layers: [ShadowLayer, ShadowLayer]) => [ShadowLayer, ShadowLayer],
): ElevationScale {
  const level = scale.levels.find((each) => each.id === levelId);
  const layers = level && applies(level) ? pair(level) : null;
  if (!layers) return scale;
  const next = edit(layers);
  return {
    ...scale,
    levels: scale.levels.map((each) =>
      each.id === levelId ? { ...each, layers: next } : each,
    ),
  };
}

export function neumorphicDistance(level: ElevationLevel): number {
  return level.layers[0]?.offsetXPx ?? NEUMORPHIC_DISTANCE.min;
}

/**
 * How far a neumorphic surface stands off the page: the shadow moves that
 * far down and right, the highlight that far up and left, and both blur by
 * twice it, the proportion the preset starts with. A level of another shape
 * is left alone.
 */
export function setNeumorphicElevationDistance(
  scale: ElevationScale,
  levelId: string,
  distance: number,
): ElevationScale {
  const d = clamp(distance, NEUMORPHIC_DISTANCE);
  return withPair(scale, levelId, isNeumorphicLevel, ([shadow, highlight]) => [
    { ...shadow, offsetXPx: d, offsetYPx: d, blurPx: d * 2 },
    { ...highlight, offsetXPx: -d, offsetYPx: -d, blurPx: d * 2 },
  ]);
}

/** The shadow's and the highlight's strength, for one mode. */
export function setNeumorphicElevationOpacities(
  scale: ElevationScale,
  levelId: string,
  mode: ColourMode,
  shadow: number,
  highlight: number,
): ElevationScale {
  return withPair(scale, levelId, isNeumorphicLevel, ([dark, light]) => [
    { ...dark, opacity: { ...dark.opacity, [mode]: unit(shadow) } },
    { ...light, opacity: { ...light.opacity, [mode]: unit(highlight) } },
  ]);
}

export function glowSize(level: ElevationLevel): number {
  return level.layers[1]?.blurPx ?? GLOW_SIZE.min;
}

/**
 * How far a glow reaches: the outer layer blurs by the size and spreads by
 * an eighth of it, the tight inner one blurs by a quarter — the proportions
 * the preset starts with at 16.
 */
export function setGlowElevationSize(
  scale: ElevationScale,
  levelId: string,
  size: number,
): ElevationScale {
  const s = clamp(size, GLOW_SIZE);
  return withPair(scale, levelId, isGlowLevel, ([inner, outer]) => [
    { ...inner, blurPx: Math.max(Math.round(s / 4), 1), spreadPx: 0 },
    { ...outer, blurPx: s, spreadPx: Math.round(s / 8) },
  ]);
}

export function glowIntensity(level: ElevationLevel, mode: ColourMode): number {
  return level.layers[0]?.opacity[mode] ?? 0;
}

/**
 * How strong a glow is, for one mode: the tight layer takes the value and the
 * wide one a little less, so the glow still fades outward.
 */
export function setGlowElevationIntensity(
  scale: ElevationScale,
  levelId: string,
  mode: ColourMode,
  intensity: number,
): ElevationScale {
  const value = unit(intensity);
  return withPair(scale, levelId, isGlowLevel, ([inner, outer]) => [
    { ...inner, opacity: { ...inner.opacity, [mode]: value } },
    {
      ...outer,
      opacity: { ...outer.opacity, [mode]: unit(value - 0.05) },
    },
  ]);
}
