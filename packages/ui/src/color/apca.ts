import { hexToRgb } from "./conversion";

/**
 * APCA, the contrast model proposed for WCAG 3: a lightness contrast, Lc.
 *
 * W3's reference implementation, APCA-W3 0.0.98G-4g (the "SAPC" model), whose
 * constants are written out below as that version has them. Unlike a WCAG 2
 * ratio it depends on which colour is the text and which the background: dark
 * text on a light ground reads as a positive Lc and light on dark as a negative
 * one, and the two are not mirror images of each other. The sign is polarity;
 * how much contrast there is, is the size of the number.
 *
 * Not the WCAG 2 thresholds in other units. A pass here is a different claim,
 * and nothing in the studio calls a pair AA because its Lc is high.
 */
const SRGB_EXPONENT = 2.4;
const RED = 0.2126729;
const GREEN = 0.7151522;
const BLUE = 0.072175;

/** Exponents for dark text on a light ground, and for light on dark. */
const NORMAL_BACKGROUND = 0.56;
const NORMAL_TEXT = 0.57;
const REVERSE_TEXT = 0.62;
const REVERSE_BACKGROUND = 0.65;

/** Below this luminance a colour is lifted, as a screen's black is not black. */
const BLACK_THRESHOLD = 0.022;
const BLACK_CLAMP = 1.414;
const SCALE = 1.14;
const OFFSET = 0.027;
/** Pairs closer than this in luminance have no contrast to speak of. */
const MIN_DELTA_Y = 0.0005;
/** Results this small are noise, and are reported as zero. */
const LOW_CLIP = 0.1;

/**
 * The Lc a reader needs for the job, from APCA's lookup for fluent reading
 * and for the smaller jobs it grades below that. Lc 75 is the least for body
 * text, 60 for large text and headlines, 45 for UI components and non-text.
 */
export const APCA_LC = {
  bodyText: 75,
  largeText: 60,
  uiComponent: 45,
} as const;

/** Screen luminance of a colour, by APCA's plain 2.4 power rather than the
 * piecewise sRGB curve WCAG 2 uses. */
function apcaLuminance(hex: string): number {
  const [red, green, blue] = hexToRgb(hex);
  return (
    RED * red ** SRGB_EXPONENT +
    GREEN * green ** SRGB_EXPONENT +
    BLUE * blue ** SRGB_EXPONENT
  );
}

function lifted(luminance: number): number {
  return luminance > BLACK_THRESHOLD
    ? luminance
    : luminance + (BLACK_THRESHOLD - luminance) ** BLACK_CLAMP;
}

/**
 * The Lc of text on a background, signed: positive for dark text on a light
 * ground, negative for light text on a dark one. Zero when the two are too
 * close to tell apart.
 */
export function apcaContrast(textHex: string, backgroundHex: string): number {
  const text = lifted(apcaLuminance(textHex));
  const background = lifted(apcaLuminance(backgroundHex));
  if (Math.abs(background - text) < MIN_DELTA_Y) return 0;

  if (background > text) {
    const sapc =
      (background ** NORMAL_BACKGROUND - text ** NORMAL_TEXT) * SCALE;
    return sapc < LOW_CLIP ? 0 : (sapc - OFFSET) * 100;
  }
  const sapc =
    (background ** REVERSE_BACKGROUND - text ** REVERSE_TEXT) * SCALE;
  return sapc > -LOW_CLIP ? 0 : (sapc + OFFSET) * 100;
}

export interface ApcaAssessment {
  /** Signed Lc, as `apcaContrast` gives it. */
  lc: number;
  /** The size of the contrast, whichever way round the pair is. */
  magnitude: number;
  bodyText: boolean;
  largeText: boolean;
  uiComponent: boolean;
}

/** What an Lc is good for, by the three tiers above. */
export function assessApca(
  textHex: string,
  backgroundHex: string,
): ApcaAssessment {
  const lc = apcaContrast(textHex, backgroundHex);
  const magnitude = Math.abs(lc);
  return {
    lc,
    magnitude,
    bodyText: magnitude >= APCA_LC.bodyText,
    largeText: magnitude >= APCA_LC.largeText,
    uiComponent: magnitude >= APCA_LC.uiComponent,
  };
}
