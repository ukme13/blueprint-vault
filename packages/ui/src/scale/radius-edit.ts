import type { HybridTokenPreset } from "../hybrid-tokenized-input";
import { MAX_RADIUS_PX, MIN_RADIUS_PX, type RadiusScale } from "./radius";

/**
 * Bind and unlink named radius uses.
 *
 * The multiplier is still the default: every named token follows it until
 * somebody types a px. Typing is a decision about that use — squarer buttons,
 * rounder cards — not a request to freeze the rest of the scale. Binding
 * snaps back to `basePx * multiplier`, which is what "Follow roundness" means.
 *
 * See docs/roadmap/scale-studio.md.
 */

export const RADIUS_LINK_PRESET_ID = "roundness";

export function radiusLinkPreset(px: number): HybridTokenPreset {
  return {
    id: RADIUS_LINK_PRESET_ID,
    name: "Follow roundness",
    value: px,
  };
}

export function unlinkRadiusToken(
  scale: RadiusScale,
  id: string,
  px: number,
): RadiusScale {
  const token = scale.tokens.find((each) => each.id === id);
  if (!token?.scales) return scale;

  const unlinkedPx = Math.min(
    MAX_RADIUS_PX,
    Math.max(
      MIN_RADIUS_PX,
      Math.round(Number.isFinite(px) ? px : token.basePx),
    ),
  );

  return {
    ...scale,
    tokens: scale.tokens.map((each) =>
      each.id === id ? { ...each, unlinkedPx } : each,
    ),
  };
}

export function bindRadiusToken(scale: RadiusScale, id: string): RadiusScale {
  const token = scale.tokens.find((each) => each.id === id);
  if (!token || token.unlinkedPx === undefined) return scale;

  return {
    ...scale,
    tokens: scale.tokens.map((each) => {
      if (each.id !== id) return each;
      return {
        id: each.id,
        name: each.name,
        description: each.description,
        basePx: each.basePx,
        scales: each.scales,
      };
    }),
  };
}
