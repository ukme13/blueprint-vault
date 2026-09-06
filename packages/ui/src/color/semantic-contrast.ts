import {
  assessNonTextContrast,
  assessTextContrast,
  type NonTextContrastResult,
  type TextContrastResult,
} from "./accessibility";
import { composite } from "./composite";
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
/* `fg`, since the rename: the group holds every foreground, and the text
   thresholds apply to all of it — an icon at body-text size is read the same
   way. Anything else drawn on a surface is held to the non-text floor. */
const TEXT_PREFIX = "fg";

function group(id: string): string {
  return id.split(".")[0] ?? id;
}

export interface SemanticContrastCheck {
  mode: ColourMode;
  /** The token drawn on the surface. */
  foreground: ResolvedSemantic;
  background: ResolvedSemantic;
  /**
   * The two colours actually measured.
   *
   * The same as each token's `hex` while both are opaque, which is every token
   * today. A transparent one is composited first — the foreground over the
   * background it is drawn on, the background over the page ground — because
   * an alpha colour has no ratio of its own and a report that measured its raw
   * value would describe a colour nobody ever sees.
   */
  foregroundHex: string;
  backgroundHex: string;
  /**
   * Which surface each was composited over, and null when it was not.
   *
   * Carried rather than derived so a row can name it. "fg.muted fails on
   * surface.raised" is a different fact from "fg.muted fails on surface.base",
   * and with a transparency in play they are different colours as well as
   * different verdicts.
   */
  foregroundOver: ResolvedSemantic | null;
  backgroundOver: ResolvedSemantic | null;
  /** True when either side carried an alpha, so a row has to explain itself. */
  isComposited: boolean;
  /** True when the foreground is text and the text thresholds apply. */
  isText: boolean;
  text: TextContrastResult | null;
  nonText: NonTextContrastResult | null;
  ratio: number;
  /** Whether the pair clears the threshold that applies to it. */
  passes: boolean;
}

/** The page canvas for a mode: what a transparent surface sits on. */
const GROUND_ID = "surface.base";

/**
 * Every foreground against every surface, in one mode.
 *
 * Every surface rather than a chosen one: text that clears the page canvas can
 * fail on a raised card, and a report that measured only the canvas would call
 * that pair fine. With a transparency in play that stops being only a matter of
 * thresholds: the same token is a different colour on each surface, so the two
 * rows measure two colours and can honestly disagree.
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

  /* The bottom of the stack. There is nothing in the system behind it, so its
     own alpha is ignored — and compositing a colour over itself returns it, so
     the base surface needs no special case on the way through. */
  const ground =
    surfaces.find((token) => token.id === GROUND_ID) ?? surfaces[0];

  return surfaces.flatMap((background) => {
    const backgroundOver =
      background.alpha < 1 && ground && ground.id !== background.id
        ? ground
        : null;
    const backgroundHex =
      background.alpha < 1
        ? composite(background, (backgroundOver ?? background).hex)
        : background.hex;

    return foregrounds.map((foreground) => {
      /* The foreground goes over the background it is drawn on, already made
         opaque. That is the whole reason a transparent token gets a different
         verdict per surface: the same 50% black is a different colour on a
         card than on the canvas. */
      const foregroundOver = foreground.alpha < 1 ? background : null;
      const foregroundHex =
        foreground.alpha < 1
          ? composite(foreground, backgroundHex)
          : foreground.hex;

      const isText = group(foreground.id) === TEXT_PREFIX;
      const text = isText
        ? assessTextContrast(foregroundHex, backgroundHex)
        : null;
      const nonText = isText
        ? null
        : assessNonTextContrast(foregroundHex, backgroundHex);

      return {
        mode,
        foreground,
        background,
        foregroundHex,
        backgroundHex,
        foregroundOver,
        backgroundOver,
        isComposited: foreground.alpha < 1 || background.alpha < 1,
        isText,
        text,
        nonText,
        ratio: text?.ratio ?? nonText?.ratio ?? 0,
        /* Normal-text AA for text, the non-text threshold for everything else.
           A size-aware verdict needs a type scale, which the typography section
           of the report already carries; this is about the colours. */
        passes: text ? text.normalText.aa : (nonText?.passes ?? false),
      };
    });
  });
}

/** `0.125` as `12.5%`, with no trailing zeros to read past. */
function percent(alpha: number): string {
  return `${Number((alpha * 100).toFixed(2))}%`;
}

function side(
  token: ResolvedSemantic,
  hex: string,
  over: ResolvedSemantic | null,
): string {
  const primitive = `${token.trackName} ${token.weight}`;
  if (token.alpha >= 1) return primitive;

  /* The surface has to be named, not just the result. A composited hex on its
     own says what was measured and gives a reader no way back to the two
     decisions behind it — which shade, and what it was laid on. */
  const on = over
    ? `over ${over.id} (${over.trackName} ${over.weight})`
    : "with nothing behind it";
  return `${primitive} at ${percent(token.alpha)} ${on} = ${hex}`;
}

/**
 * What was measured, in words, for one pair.
 *
 * Byte-for-byte what the report has always printed while both colours are
 * opaque — `neutral 950 on neutral 50` — because a token with no alpha must
 * produce the file it produced before alpha existed. A transparent side gains
 * its percentage, the surface it was laid on and the colour that came out.
 */
export function describeSemanticContrast(check: SemanticContrastCheck): string {
  return `${side(check.foreground, check.foregroundHex, check.foregroundOver)} on ${side(check.background, check.backgroundHex, check.backgroundOver)}`;
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
