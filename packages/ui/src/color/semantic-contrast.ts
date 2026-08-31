import {
  assessNonTextContrast,
  assessTextContrast,
  type NonTextContrastResult,
  type TextContrastResult,
} from "./accessibility";
import {
  COLOUR_MODES,
  resolveSemantics,
  type ColourMode,
  type ResolvedSemantic,
  type SemanticToken,
} from "./semantic";
import type { ColorTrack } from "./types";

/**
 * Contrast for the pairs the semantic layer defines, in both modes.
 *
 * The palette preview measures a fixed set of shades, chosen because they are
 * what a component puts together. That was the best answer available before
 * this layer existed. Now the layer says which colours a page is built from, so
 * the pairs come from it — and a token repointed in dark mode is measured in
 * dark mode rather than assumed to behave like its light counterpart.
 *
 * See docs/roadmap/semantic-tokens.md.
 */

/**
 * Which tokens are backgrounds, and which are drawn on them.
 *
 * A rule rather than a list, so a layer somebody has renamed or extended still
 * reports something. `surface.*` is the background; `text.*` is measured to the
 * text thresholds; everything else is a component or a border and is measured
 * to the non-text one.
 *
 * The cost of a rule is that it follows a convention: rename `surface.base` to
 * `page.background` and it stops being treated as a surface. That is visible —
 * the pair disappears from the report — rather than silently wrong, which is
 * the trade a hard-coded list cannot make.
 */
const SURFACE_PREFIX = "surface";
const TEXT_PREFIX = "text";

function group(id: string): string {
  return id.split(".")[0] ?? id;
}

export interface SemanticContrastCheck {
  mode: ColourMode;
  /** The token drawn on the surface. */
  foreground: ResolvedSemantic;
  background: ResolvedSemantic;
  /** True when the foreground is text and the text thresholds apply. */
  isText: boolean;
  text: TextContrastResult | null;
  nonText: NonTextContrastResult | null;
  ratio: number;
  /** Whether the pair clears the threshold that applies to it. */
  passes: boolean;
}

/**
 * Every foreground against every surface, in one mode.
 *
 * Every surface rather than a chosen one: text that clears the page canvas can
 * fail on a raised card, and a report that measured only the canvas would call
 * that pair fine.
 */
export function assessSemanticContrast(
  tokens: SemanticToken[],
  tracks: ColorTrack[],
  mode: ColourMode,
): SemanticContrastCheck[] {
  const resolved = resolveSemantics(tokens, mode, tracks);
  const surfaces = resolved.filter(
    (token) => group(token.id) === SURFACE_PREFIX,
  );
  const foregrounds = resolved.filter(
    (token) => group(token.id) !== SURFACE_PREFIX,
  );

  return surfaces.flatMap((background) =>
    foregrounds.map((foreground) => {
      const isText = group(foreground.id) === TEXT_PREFIX;
      const text = isText
        ? assessTextContrast(foreground.hex, background.hex)
        : null;
      const nonText = isText
        ? null
        : assessNonTextContrast(foreground.hex, background.hex);

      return {
        mode,
        foreground,
        background,
        isText,
        text,
        nonText,
        ratio: text?.ratio ?? nonText?.ratio ?? 0,
        /* Normal-text AA for text, the non-text threshold for everything else.
           A size-aware verdict needs a type scale, which the typography section
           of the report already carries; this is about the colours. */
        passes: text ? text.normalText.aa : (nonText?.passes ?? false),
      };
    }),
  );
}

export interface SemanticContrastReport {
  light: SemanticContrastCheck[];
  dark: SemanticContrastCheck[];
  /** Pairs failing in either mode. */
  failureCount: number;
}

/** Both modes, and how many pairs fail across them. */
export function assessSemanticContrastReport(
  tokens: SemanticToken[],
  tracks: ColorTrack[],
): SemanticContrastReport {
  const [light, dark] = COLOUR_MODES.map((mode) =>
    assessSemanticContrast(tokens, tracks, mode),
  );

  return {
    light: light ?? [],
    dark: dark ?? [],
    failureCount: [...(light ?? []), ...(dark ?? [])].filter(
      (check) => !check.passes,
    ).length,
  };
}
