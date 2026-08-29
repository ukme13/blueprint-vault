import { hexToRgb, normalizeHex, rgbToOklch } from "./conversion";

export const WCAG_CONTRAST = {
  normalTextAA: 4.5,
  normalTextAAA: 7,
  largeTextAA: 3,
  largeTextAAA: 4.5,
  nonText: 3,
  /* WCAG large text: 18pt, or 14pt when bold. Converted at the 4/3 ratio the
     guideline itself uses, which is why these are 24 and 18.66 rather than
     round pixel numbers. */
  largeTextPx: 24,
  largeTextBoldPx: 18.66,
  boldFontWeight: 700,
  focusIndicator: 3,
} as const;

export type AccessibilityStatus = "pass" | "partial" | "fail";
export type SimilarityLevel = "very-similar" | "similar" | "distinct";

export interface TextContrastResult {
  ratio: number;
  normalText: {
    aa: boolean;
    aaa: boolean;
  };
  largeText: {
    aa: boolean;
    aaa: boolean;
  };
  status: AccessibilityStatus;
  summary: string;
}

export interface NonTextContrastResult {
  ratio: number;
  passes: boolean;
  status: "pass" | "fail";
  summary: string;
}

export interface TextColourRecommendation {
  colour: string;
  ratio: number;
  alternative: string;
  alternativeRatio: number;
}

export interface ColourSimilarityResult {
  difference: number;
  level: SimilarityLevel;
  isTooSimilar: boolean;
  summary: string;
}

export interface FocusContrastResult {
  adjacentContrast: number;
  changeContrast: number | null;
  passesAdjacentContrast: boolean;
  passesChangeContrast: boolean | null;
  status: "pass" | "fail";
  summary: string;
}

function channelToLinear(channel: number): number {
  return channel <= 0.04045
    ? channel / 12.92
    : Math.pow((channel + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(hex: string): number {
  const [red, green, blue] = hexToRgb(hex);

  return (
    0.2126 * channelToLinear(red) +
    0.7152 * channelToLinear(green) +
    0.0722 * channelToLinear(blue)
  );
}

export function contrastRatio(first: string, second: string): number {
  const firstLuminance = relativeLuminance(first);
  const secondLuminance = relativeLuminance(second);
  const lighter = Math.max(firstLuminance, secondLuminance);
  const darker = Math.min(firstLuminance, secondLuminance);

  return (lighter + 0.05) / (darker + 0.05);
}

function adjustmentDirection(
  foreground: string,
  background: string,
): "lighter" | "darker" {
  return relativeLuminance(foreground) > relativeLuminance(background)
    ? "lighter"
    : "darker";
}

export function assessTextContrast(
  foreground: string,
  background: string,
): TextContrastResult {
  const ratio = contrastRatio(foreground, background);
  const normalAA = ratio >= WCAG_CONTRAST.normalTextAA;
  const normalAAA = ratio >= WCAG_CONTRAST.normalTextAAA;
  const largeAA = ratio >= WCAG_CONTRAST.largeTextAA;
  const largeAAA = ratio >= WCAG_CONTRAST.largeTextAAA;

  let status: AccessibilityStatus;
  let summary: string;

  if (normalAAA) {
    status = "pass";
    summary = "Passes AAA for normal text.";
  } else if (normalAA) {
    status = "pass";
    summary = "Passes AA for normal text.";
  } else if (largeAA) {
    status = "partial";
    summary = "Passes AA only for large text.";
  } else {
    status = "fail";
    summary = `Fails; use a ${adjustmentDirection(foreground, background)} foreground.`;
  }

  return {
    ratio,
    normalText: { aa: normalAA, aaa: normalAAA },
    largeText: { aa: largeAA, aaa: largeAAA },
    status,
    summary,
  };
}

export interface SizedTextContrastResult extends TextContrastResult {
  /** Whether WCAG counts text at this size and weight as large. */
  isLargeText: boolean;
  /** The threshold that actually applies, AA. */
  requiredAA: number;
}

/** Whether WCAG counts text at this size and weight as large. */
export function isLargeText(fontSizePx: number, fontWeight: number): boolean {
  return fontWeight >= WCAG_CONTRAST.boldFontWeight
    ? fontSizePx >= WCAG_CONTRAST.largeTextBoldPx
    : fontSizePx >= WCAG_CONTRAST.largeTextPx;
}

/**
 * The contrast verdict for text at a known size and weight.
 *
 * assessTextContrast reports normal and large separately and leaves the
 * choosing to the caller, which is right when the size is unknown. Once a type
 * scale has generated one, the size is known and only one of those two answers
 * is the truth — the same pair of colours passes at a heading and fails at a
 * caption, and a reader is not helped by being told both.
 */
export function assessTextContrastAtSize(
  foreground: string,
  background: string,
  fontSizePx: number,
  fontWeight: number,
): SizedTextContrastResult {
  const base = assessTextContrast(foreground, background);
  const large = isLargeText(fontSizePx, fontWeight);
  const level = large ? base.largeText : base.normalText;
  const requiredAA = large
    ? WCAG_CONTRAST.largeTextAA
    : WCAG_CONTRAST.normalTextAA;

  const size = large ? "large" : "normal";
  let status: AccessibilityStatus;
  let summary: string;

  if (level.aaa) {
    status = "pass";
    summary = `Passes AAA at ${fontSizePx}px ${fontWeight}, which WCAG counts as ${size} text.`;
  } else if (level.aa) {
    status = "pass";
    summary = `Passes AA at ${fontSizePx}px ${fontWeight}, which WCAG counts as ${size} text.`;
  } else {
    status = "fail";
    summary = `Fails at ${fontSizePx}px ${fontWeight}: ${size} text needs ${requiredAA}:1 and this pair is ${base.ratio.toFixed(2)}:1.`;
  }

  return { ...base, isLargeText: large, requiredAA, status, summary };
}

export function assessNonTextContrast(
  indicator: string,
  adjacentColour: string,
): NonTextContrastResult {
  const ratio = contrastRatio(indicator, adjacentColour);
  const passes = ratio >= WCAG_CONTRAST.nonText;

  return {
    ratio,
    passes,
    status: passes ? "pass" : "fail",
    summary: passes
      ? "Passes the 3:1 requirement for controls and graphical objects."
      : "Fails the 3:1 requirement; increase the border or control contrast.",
  };
}

export function recommendTextColour(
  background: string,
  lightColour = "#ffffff",
  darkColour = "#000000",
): TextColourRecommendation {
  const normalizedLight = normalizeHex(lightColour);
  const normalizedDark = normalizeHex(darkColour);
  const lightRatio = contrastRatio(normalizedLight, background);
  const darkRatio = contrastRatio(normalizedDark, background);

  return lightRatio >= darkRatio
    ? {
        colour: normalizedLight,
        ratio: lightRatio,
        alternative: normalizedDark,
        alternativeRatio: darkRatio,
      }
    : {
        colour: normalizedDark,
        ratio: darkRatio,
        alternative: normalizedLight,
        alternativeRatio: lightRatio,
      };
}

export function assessColourSimilarity(
  first: string,
  second: string,
): ColourSimilarityResult {
  const [firstLightness, firstChroma, firstHue] = rgbToOklch(
    ...hexToRgb(first),
  );
  const [secondLightness, secondChroma, secondHue] = rgbToOklch(
    ...hexToRgb(second),
  );
  const firstHueRadians = firstHue * (Math.PI / 180);
  const secondHueRadians = secondHue * (Math.PI / 180);
  const firstA = firstChroma * Math.cos(firstHueRadians);
  const firstB = firstChroma * Math.sin(firstHueRadians);
  const secondA = secondChroma * Math.cos(secondHueRadians);
  const secondB = secondChroma * Math.sin(secondHueRadians);
  const difference = Math.sqrt(
    (firstLightness - secondLightness) ** 2 +
      (firstA - secondA) ** 2 +
      (firstB - secondB) ** 2,
  );

  if (difference < 0.05) {
    return {
      difference,
      level: "very-similar",
      isTooSimilar: true,
      summary:
        "Very similar; users may not distinguish these colours reliably.",
    };
  }

  if (difference < 0.1) {
    return {
      difference,
      level: "similar",
      isTooSimilar: true,
      summary: "Similar; add another cue when the colours communicate meaning.",
    };
  }

  return {
    difference,
    level: "distinct",
    isTooSimilar: false,
    summary: "Perceptually distinct in OKLab space.",
  };
}

export function assessFocusContrast(
  indicator: string,
  adjacentColour: string,
  unfocusedColour?: string,
): FocusContrastResult {
  const adjacentContrast = contrastRatio(indicator, adjacentColour);
  const changeContrast = unfocusedColour
    ? contrastRatio(indicator, unfocusedColour)
    : null;
  const passesAdjacentContrast =
    adjacentContrast >= WCAG_CONTRAST.focusIndicator;
  const passesChangeContrast =
    changeContrast === null
      ? null
      : changeContrast >= WCAG_CONTRAST.focusIndicator;
  const passes = passesAdjacentContrast && passesChangeContrast !== false;

  return {
    adjacentContrast,
    changeContrast,
    passesAdjacentContrast,
    passesChangeContrast,
    status: passes ? "pass" : "fail",
    summary: passes
      ? "Focus colour passes 3:1; also verify the indicator area and thickness."
      : "Focus indicator needs at least 3:1 contrast with adjacent and unfocused colours.",
  };
}
