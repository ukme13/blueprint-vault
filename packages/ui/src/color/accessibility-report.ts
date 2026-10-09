import type { AccessibilityStatus } from "./accessibility";
import { APCA_LC, apcaContrast } from "./apca";
import {
  apcaTextStatus,
  apcaTier,
  pairLc,
  type ApcaTier,
} from "./accessibility-standard";
import type { ContrastStandard } from "./palette-view";
import type {
  NonTextCheck,
  TextCheck,
  TextColourCheck,
} from "./preview-assessment";

/**
 * What a row of the accessibility report says, by standard.
 *
 * The report was WCAG 2 only, with its words worked out where it was drawn.
 * Choosing a standard changes the figure, the badge, the verdict and the
 * sentence on every row, so they are worked out here once, from the same
 * checks, and the component only renders them.
 */
export interface RowReading {
  /** The tier or grade: `AAA`, `Large AA`, `Body`, `Fail`. */
  badge: string;
  /** The figure: `7.4:1` or `Lc 87`. */
  figure: string;
  status: AccessibilityStatus;
  summary: string;
}

const TIER_SUMMARY: Record<ApcaTier, string> = {
  Body: `Reaches Lc ${APCA_LC.bodyText}, enough for body text.`,
  Large: `Reaches Lc ${APCA_LC.largeText}, enough for large text and headings but not body text.`,
  UI: `Reaches Lc ${APCA_LC.uiComponent}, enough for UI components but not for reading.`,
  Fail: `Under Lc ${APCA_LC.uiComponent}; increase the contrast.`,
};

/** `Lc 87`, the size of the Lc to a whole number. */
export function lcLabel(lc: number): string {
  return `Lc ${Math.round(Math.abs(lc))}`;
}

/** A text sample: its foreground as the text on its background. */
export function readTextCheck(
  standard: ContrastStandard,
  check: TextCheck,
): RowReading {
  if (standard === "wcag2") {
    const { result } = check;
    return {
      badge: result.normalText.aaa
        ? "AAA"
        : result.normalText.aa
          ? "AA"
          : result.largeText.aa
            ? "Large AA"
            : "Fail",
      figure: `${result.ratio.toFixed(1)}:1`,
      status: result.status,
      summary: result.summary,
    };
  }
  const lc = pairLc(check);
  const tier = apcaTier(lc);
  return {
    badge: tier,
    figure: lcLabel(lc),
    status: apcaTextStatus(lc),
    summary: TIER_SUMMARY[tier],
  };
}

/** A boundary: a pass or fail where it counts, advisory where it does not. */
export function readBoundary(
  standard: ContrastStandard,
  check: NonTextCheck,
): RowReading {
  const lc = pairLc(check);
  const passes =
    standard === "wcag2"
      ? check.result.passes
      : Math.abs(lc) >= APCA_LC.uiComponent;
  const figure =
    standard === "wcag2" ? `${check.result.ratio.toFixed(1)}:1` : lcLabel(lc);

  if (!check.countsTowardWarnings) {
    return {
      badge: "Advisory",
      figure,
      status: "partial",
      summary:
        "Optional design check; increase contrast only when this boundary communicates meaning.",
    };
  }
  return {
    badge: passes ? "Pass" : "Fail",
    figure,
    status: passes ? "pass" : "fail",
    summary:
      standard === "wcag2"
        ? check.result.summary
        : passes
          ? `Passes Lc ${APCA_LC.uiComponent} for controls and graphical objects.`
          : `Fails Lc ${APCA_LC.uiComponent}; increase the border or control contrast.`,
  };
}

/** The keyboard focus colour on the text colour beside it. */
export function readFocus(
  standard: ContrastStandard,
  ring: string,
  against: string,
  wcag2: { adjacentContrast: number; status: "pass" | "fail"; summary: string },
): RowReading {
  if (standard === "wcag2") {
    return {
      badge: wcag2.status === "pass" ? "Pass" : "Fail",
      figure: `${wcag2.adjacentContrast.toFixed(1)}:1`,
      status: wcag2.status,
      summary: wcag2.summary,
    };
  }
  const lc = apcaContrast(ring, against);
  const passes = Math.abs(lc) >= APCA_LC.uiComponent;
  return {
    badge: passes ? "Pass" : "Fail",
    figure: lcLabel(lc),
    status: passes ? "pass" : "fail",
    summary: passes
      ? `The focus colour reaches Lc ${APCA_LC.uiComponent} against the text beside it.`
      : `The focus colour is under Lc ${APCA_LC.uiComponent} against the text beside it.`,
  };
}

/** Which of white and dark text a fill takes, and by how much. */
export interface TextChoiceReading {
  /** The colour recommended and the one passed over. */
  colour: string;
  isWhite: boolean;
  figure: string;
  detail: string;
}

/**
 * White or dark text on a fill, under a standard.
 *
 * WCAG 2 keeps the recommendation the assessment already made, since it
 * compares ratios. For WCAG 3 the two are compared by Lc instead, so a fill
 * where white has the better ratio but dark has the better Lc recommends dark:
 * APCA reads light text on a mid-tone as weaker than the ratio does.
 */
export function readTextChoice(
  standard: ContrastStandard,
  check: TextColourCheck,
): TextChoiceReading {
  const { recommendation } = check;
  const white = "#ffffff";
  const dark =
    recommendation.colour === white
      ? recommendation.alternative
      : recommendation.colour;

  if (standard === "wcag2") {
    const isWhite = recommendation.colour === white;
    const whiteRatio = isWhite
      ? recommendation.ratio
      : recommendation.alternativeRatio;
    const darkRatio = isWhite
      ? recommendation.alternativeRatio
      : recommendation.ratio;
    return {
      colour: recommendation.colour,
      isWhite,
      figure: `${recommendation.ratio.toFixed(1)}:1`,
      detail: `White ${whiteRatio.toFixed(1)}:1 · Dark ${darkRatio.toFixed(1)}:1`,
    };
  }

  const whiteLc = Math.abs(apcaContrast(white, check.background));
  const darkLc = Math.abs(apcaContrast(dark, check.background));
  const isWhite = whiteLc >= darkLc;
  return {
    colour: isWhite ? white : dark,
    isWhite,
    figure: lcLabel(isWhite ? whiteLc : darkLc),
    detail: `White ${lcLabel(whiteLc)} · Dark ${lcLabel(darkLc)}`,
  };
}
