import {
  isInnerShadow,
  type ElevationLevel,
  type ShadowLayer,
} from "./elevation";

/**
 * The shapes of the presets Simple tunes by name — Inset, Neumorphic, Glow —
 * recognised by shape rather than exact values, so a Glow made bigger is
 * still a Glow rather than Custom. Their sliders are in elevation-adjust.
 */

/** A level's two layers, both shown, or null for any other count. */
export function layerPair(
  level: ElevationLevel,
): [ShadowLayer, ShadowLayer] | null {
  const [first, second] = level.layers;
  if (level.layers.length !== 2 || !first || !second) return null;
  if (first.hidden || second.hidden) return null;
  return [first, second];
}

/** Two inner layers in the scale's colour, as Inset is. */
export function isInsetLevel(level: ElevationLevel): boolean {
  const layers = layerPair(level);
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
  const layers = layerPair(level);
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
  const layers = layerPair(level);
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
