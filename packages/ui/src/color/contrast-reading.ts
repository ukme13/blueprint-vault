import { APCA_LC, apcaContrast } from "./apca";
import { contrastRatio } from "./accessibility";
import type { ContrastPolarity, ContrastStandard } from "./palette-view";

/**
 * How a pair does, in three steps a swatch can show without a number: it
 * fails outright, it clears some of what is asked, or it clears all of it.
 */
export type ContrastStatus = "fail" | "partial" | "pass";

/**
 * The figure on screen, and the figure judged: one and the same.
 *
 * A pair that shows "Lc 45" and "Fail" against a line of 45, or "4.5:1" and
 * "Fail" against 4.5, contradicts itself. So an Lc is judged as the whole
 * number it is shown as (APCA's own tables are whole numbers), and a WCAG 2
 * ratio is shown cut to its places, never rounded up: WCAG does not round a
 * ratio up to a line, so 4.478 reads 4.4:1, and 4.5:1 is only ever a pass.
 */
export function shownLc(lc: number): number {
  return Math.round(Math.abs(lc));
}

/** A ratio cut, not rounded, to a number of places: `4.4` for 4.478. */
export function cutRatio(ratio: number, places = 1): string {
  const scale = 10 ** places;
  /* The small add keeps a whole ratio such as 21 from falling to 20.99. */
  return (Math.floor(ratio * scale + 1e-9) / scale).toFixed(places);
}

/** `4.4:1`: a ratio as it is written, cut to its places. */
export function ratioText(ratio: number, places = 1): string {
  return `${cutRatio(ratio, places)}:1`;
}

/** The steps a swatch warns about: a pair that passes has nothing to say. */
export function isContrastWarning(
  status: ContrastStatus,
): status is "fail" | "partial" {
  return status !== "pass";
}

/** The three steps in words, for assistive tech. */
export const CONTRAST_STATUS_WORDS: Record<ContrastStatus, string> = {
  fail: "fails",
  partial: "passes in part",
  pass: "passes",
};

/**
 * Where the three steps fall.
 *
 * WCAG 2: under 3:1 nothing passes; from 3:1 up it clears large text and
 * graphics but not AAA; at 7:1 it clears AAA, and so AA with it. WCAG 3: under
 * Lc 45 nothing passes; from 45 up it clears UI or large text but not body
 * text; at 75 it clears body text, and the rest with it.
 */
export function contrastStatus(
  standard: ContrastStandard,
  value: number,
): ContrastStatus {
  const [partial, pass] =
    standard === "wcag3" ? [APCA_LC.uiComponent, APCA_LC.bodyText] : [3, 7];
  if (value >= pass) return "pass";
  return value >= partial ? "partial" : "fail";
}

/** What a swatch says about its contrast: the number, and how it is spoken. */
export interface ContrastReading {
  /** The figure on the swatch: `4.5`, or the size of the Lc, `75`. */
  label: string;
  /** For assistive tech: the same figure, named, and how it fares. */
  description: string;
  status: ContrastStatus;
}

/**
 * A shade's contrast against the comparison colour, under a standard.
 *
 * The same pairing in both, set by `polarity`: the shade as the text on the
 * comparison colour (`on`, the default) or the comparison colour as the text
 * over the shade (`under`). WCAG 2 does not care which is which. APCA does,
 * and gives the size of its Lc here with the sign left out: the swatch is a
 * number to compare down a ramp, and the sign is in the popover.
 *
 * The status is judged on the figure shown. An Lc is shown, and judged, as a
 * whole number. A WCAG 2 ratio is shown cut and judged exact, so a swatch
 * reading 7.0 is never a 6.96: that one reads 6.9.
 */
export function swatchContrast(
  standard: ContrastStandard,
  shadeHex: string,
  referenceHex: string,
  polarity: ContrastPolarity = "on",
): ContrastReading {
  if (standard === "wcag3") {
    const [text, ground] =
      polarity === "on" ? [shadeHex, referenceHex] : [referenceHex, shadeHex];
    const lc = shownLc(apcaContrast(text, ground));
    const status = contrastStatus(standard, lc);
    return {
      label: String(lc),
      description: `APCA contrast Lc ${lc}, ${CONTRAST_STATUS_WORDS[status]}`,
      status,
    };
  }
  const exact = contrastRatio(shadeHex, referenceHex);
  const ratio = cutRatio(exact);
  const status = contrastStatus(standard, exact);
  return {
    label: ratio,
    description: `contrast ${ratio} to 1, ${CONTRAST_STATUS_WORDS[status]}`,
    status,
  };
}
