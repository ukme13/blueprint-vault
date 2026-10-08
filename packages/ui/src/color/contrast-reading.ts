import { APCA_LC, apcaContrast } from "./apca";
import { contrastRatio } from "./accessibility";
import type { ContrastStandard } from "./palette-view";

/**
 * How a pair does, in three steps a swatch can show without a number: it
 * fails outright, it clears some of what is asked, or it clears all of it.
 */
export type ContrastStatus = "fail" | "partial" | "pass";

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
 * The same pairing in both: the shade as the text and the comparison colour as
 * the ground, which is how the detail popover first shows it. WCAG 2 does not
 * care which is which. APCA does, and gives the size of its Lc here with the
 * sign left out: the swatch is a number to compare down a ramp, and the
 * polarity is in the popover, where the pair can be turned round.
 *
 * The status is judged on the exact figure, not the one shown: WCAG does not
 * round, so a swatch reading 7.0 can be a 6.96 and short of 7.
 */
export function swatchContrast(
  standard: ContrastStandard,
  shadeHex: string,
  referenceHex: string,
): ContrastReading {
  if (standard === "wcag3") {
    const exact = Math.abs(apcaContrast(shadeHex, referenceHex));
    const lc = Math.round(exact);
    const status = contrastStatus(standard, exact);
    return {
      label: String(lc),
      description: `APCA contrast Lc ${lc}, ${CONTRAST_STATUS_WORDS[status]}`,
      status,
    };
  }
  const exact = contrastRatio(shadeHex, referenceHex);
  const ratio = exact.toFixed(1);
  const status = contrastStatus(standard, exact);
  return {
    label: ratio,
    description: `contrast ${ratio} to 1, ${CONTRAST_STATUS_WORDS[status]}`,
    status,
  };
}
