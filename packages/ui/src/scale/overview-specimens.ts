import { resolveRadius, type RadiusScale, type ResolvedRadius } from "./radius";
import {
  resolveSpacing,
  type SpacingScale,
  type SpacingToken,
} from "./spacing";

/**
 * What the Overview shows of the radius and spacing scales: which tokens, in
 * what order. Chosen here so the board and its tests read the same list.
 */

/** The corners a nested specimen wraps, outermost first. */
export const RADIUS_NESTING: readonly string[] = [
  "page",
  "container",
  "element",
  "inner",
  "none",
];

/**
 * The radius tokens to nest, outermost first, at the sizes the scale gives
 * them now. A scale that has dropped one of the corners shows the rest.
 */
export function nestedRadii(scale: RadiusScale): ResolvedRadius[] {
  const resolved = resolveRadius(scale);
  return RADIUS_NESTING.flatMap((id) => {
    const token = resolved.find((each) => each.id === id);
    return token ? [token] : [];
  });
}

/** The steps a spacing specimen shows: 4px to 64px at the default scale. */
export const SPACING_SPECIMEN_STEPS: readonly number[] = [
  1, 2, 3, 4, 6, 8, 12, 16,
];

/**
 * The spacing tokens to draw as bars, smallest first. Picked by step rather
 * than by px, so a denser scale shows the same steps at their new sizes; a
 * step the scale has pruned is left out.
 */
export function spacingSpecimen(scale: SpacingScale): SpacingToken[] {
  return resolveSpacing(scale).filter((token) =>
    SPACING_SPECIMEN_STEPS.includes(token.step),
  );
}
