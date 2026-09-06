import { hexToRgb, normalizeHex, rgbToHex } from "./conversion";

/**
 * Laying a translucent colour over an opaque one.
 *
 * A colour with an alpha has no contrast ratio of its own. WCAG measures two
 * opaque colours, and a 50% black is a different colour on cream and on white —
 * so anything that measures a transparent token has to work out what the eye
 * actually receives first. That is this function, and it is the only route:
 * reading an alpha colour's raw hex and calling the answer a ratio reports a
 * colour nobody ever sees.
 *
 * See docs/roadmap/semantic-table-editor.md.
 */

/** A colour and how much of it there is. `alpha` runs 0 to 1, 1 being opaque. */
export interface AlphaColour {
  hex: string;
  alpha: number;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(1, Math.max(0, value));
}

/**
 * An alpha as a percentage: `0.125` becomes `12.5%`.
 *
 * One spelling, used by the CSS export, the Tailwind export and the report's
 * own wording, so a token written as 12% in one is never 0.12 in another.
 * Trailing zeros are dropped because they read as precision nobody set.
 */
export function alphaPercent(alpha: number): string {
  return `${Number((clamp01(alpha) * 100).toFixed(2))}%`;
}

/**
 * An alpha as the two hex digits a colour carries it in, and `""` for opaque.
 *
 * Empty rather than `ff`, so an opaque colour is the six-digit value it has
 * always been and every generated file stays byte-for-byte what it was.
 */
export function alphaHex(alpha: number): string {
  if (alpha >= 1) return "";
  return Math.round(clamp01(alpha) * 255)
    .toString(16)
    .padStart(2, "0");
}

/**
 * Source-over, in sRGB, on the values as they are written.
 *
 * The space is the one the browser paints in, which is the only space whose
 * answer is true of the screen. Two others were considered and are wrong here:
 *
 * - Linear sRGB is the physically correct blend and is not what happens. 50%
 *   black on white comes out `#bcbcbc` linear and `#808080` gamma-encoded, and
 *   a report that said the first would be describing a page no browser renders.
 * - OKLab is the space this palette *generates* in, and interpolating there
 *   would be right for a gradient. Compositing is not interpolation: it is what
 *   the compositor does to two painted layers, and the compositor works on the
 *   encoded values.
 *
 * Measured rather than assumed, in Chromium 151.0.7922.34: a canvas in the
 * default `srgb` colour space, white filled, then `rgba(0,0,0,0.5)` over it,
 * reads back `127,127,127`, and at `0.12` reads back `224` — both the plain
 * gamma-encoded mix. This rounds where the compositor truncates, so a channel
 * can land one step of 255 apart from it; a ratio moves in the fourth decimal.
 */
export function composite(foreground: AlphaColour, surface: string): string {
  const alpha = clamp01(foreground.alpha);
  if (alpha >= 1) return normalizeHex(foreground.hex);
  if (alpha <= 0) return normalizeHex(surface);

  const front = hexToRgb(foreground.hex);
  const back = hexToRgb(surface);

  return rgbToHex(
    front[0] * alpha + back[0] * (1 - alpha),
    front[1] * alpha + back[1] * (1 - alpha),
    front[2] * alpha + back[2] * (1 - alpha),
  );
}
