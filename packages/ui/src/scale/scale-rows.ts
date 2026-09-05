import type { ColorTrack } from "../color/types";
import {
  resolveElevation,
  type ElevationScale,
  type ResolvedElevation,
} from "./elevation";
import { resolveRadius, type RadiusScale, type ResolvedRadius } from "./radius";
import {
  resolveSpacing,
  type SpacingScale,
  type SpacingToken,
} from "./spacing";

/**
 * Spacing, radius and elevation as rows something can render.
 *
 * Thinner than its colour and typography siblings, and deliberately so: the
 * three resolvers already are the export's naming rule. `resolveSpacing`,
 * `resolveRadius` and `resolveElevation` are what `scale-export.ts` calls to
 * write the file, so a page calling the same functions cannot print a variable
 * the file does not contain. There is no second spelling to keep in step,
 * which is the whole reason the colour and type row builders exist.
 *
 * What is here is the two things a documentation page needs and an export does
 * not. Elevation resolves once per mode, so a page showing both has to ask
 * twice and pair the answers; and the shade a shadow is drawn from is inside
 * the resolution, where a reader cannot see it. A page that showed a shadow
 * without saying which colour it came from would be describing a literal.
 *
 * See docs/roadmap/scale-studio.md.
 */

/** The scale's rule, for a page that has to state it before listing it. */
export interface SpacingScaleSummary {
  baseUnitPx: number;
  /** The multiples, in order. Data rather than a formula. */
  steps: number[];
  tokens: SpacingToken[];
  /** The largest step, which is what a section gap reaches for. */
  maxPx: number;
}

export function spacingScaleSummary(scale: SpacingScale): SpacingScaleSummary {
  const tokens = resolveSpacing(scale);
  return {
    baseUnitPx: scale.baseUnitPx,
    steps: [...scale.steps],
    tokens,
    maxPx: tokens.reduce((largest, token) => Math.max(largest, token.px), 0),
  };
}

export interface RadiusScaleSummary {
  multiplier: number;
  tokens: ResolvedRadius[];
}

export function radiusScaleSummary(scale: RadiusScale): RadiusScaleSummary {
  return { multiplier: scale.multiplier, tokens: resolveRadius(scale) };
}

/**
 * One elevation level, resolved in both modes, with its colour named.
 *
 * Both modes on one row because the pair is the thing being described: the
 * colour is one reference and only the strength moves, and a page showing one
 * mode at a time would make somebody flip back and forth to see that. It is
 * the same argument the semantic rows make about light and dark.
 */
export interface ElevationRow {
  id: string;
  name: string;
  description: string;
  variable: string;
  light: ResolvedElevation;
  dark: ResolvedElevation;
  /** How many shadows are stacked to make the level. */
  layerCount: number;
  /** The alpha of the first layer in each mode, which is what differs. */
  opacity: { light: number; dark: number };
}

export interface ElevationRows {
  rows: ElevationRow[];
  /**
   * The shade every shadow is drawn from, named rather than resolved away.
   *
   * `--color-<track>-<weight>` is not what the export writes for a shadow — a
   * `box-shadow` cannot carry a `var()` for one channel of an `rgba`, so the
   * exported value is a literal. That makes saying where the literal came from
   * the page's job: a reader looking at `rgba(17, 17, 17, 0.2)` has no way
   * back to the palette otherwise.
   */
  colour: { trackId: string; weight: number; hex: string };
}

export function elevationRows(
  scale: ElevationScale,
  palettes: ColorTrack[],
): ElevationRows {
  const light = resolveElevation(scale, palettes, "light");
  const dark = resolveElevation(scale, palettes, "dark");

  const rows = light.map((level, index) => {
    /* Paired by index rather than by id. Both come from the same `levels`
       array in the same order, so index is the identity; a find by id would
       be the same answer with a way to return undefined. */
    const darkLevel = dark[index]!;
    return {
      id: level.id,
      name: level.name,
      description: level.description,
      variable: level.variable,
      light: level,
      dark: darkLevel,
      layerCount: level.layers.length,
      opacity: {
        light: level.layers[0]?.alpha ?? 0,
        dark: darkLevel.layers[0]?.alpha ?? 0,
      },
    };
  });

  /* Read off a resolved layer rather than re-resolved here, so the hex on the
     page is the hex in the shadow beside it even if the reference no longer
     points at a shade the palette has. */
  const first = light[0]?.layers[0];
  const hex = first
    ? `#${first.rgb.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`
    : "#000000";

  return {
    rows,
    colour: {
      trackId: scale.colour.trackId,
      weight: scale.colour.weight,
      hex,
    },
  };
}
