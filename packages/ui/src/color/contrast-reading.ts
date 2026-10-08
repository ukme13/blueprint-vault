import { apcaContrast } from "./apca";
import { contrastRatio } from "./accessibility";
import type { ContrastStandard } from "./palette-view";

/** What a swatch says about its contrast: the number, and how it is spoken. */
export interface ContrastReading {
  /** The figure on the swatch: `4.5`, or the size of the Lc, `75`. */
  label: string;
  /** For assistive tech: the same figure, named. */
  description: string;
}

/**
 * A shade's contrast against the comparison colour, under a standard.
 *
 * The same pairing in both: the shade as the text and the comparison colour as
 * the ground, which is how the detail popover first shows it. WCAG 2 does not
 * care which is which. APCA does, and gives the size of its Lc here with the
 * sign left out: the swatch is a number to compare down a ramp, and the
 * polarity is in the popover, where the pair can be turned round.
 */
export function swatchContrast(
  standard: ContrastStandard,
  shadeHex: string,
  referenceHex: string,
): ContrastReading {
  if (standard === "wcag3") {
    const lc = Math.round(Math.abs(apcaContrast(shadeHex, referenceHex)));
    return { label: String(lc), description: `APCA contrast Lc ${lc}` };
  }
  const ratio = contrastRatio(shadeHex, referenceHex).toFixed(1);
  return { label: ratio, description: `contrast ${ratio} to 1` };
}
