import { hexToRgb, linearToSrgb, rgbToHex, srgbToLinear } from "./conversion";
import {
  MACHADO_2009_MATRICES,
  MACHADO_2009_SEVERITY_STEP,
  type MachadoFamily,
  type Matrix3,
} from "./machado2009";
import type { Rgb } from "./types";

/*
 * Colour-vision simulation.
 *
 * A transform, not a colour format. Nothing here changes a token value: it
 * takes the colour a palette holds and returns the colour a person with a given
 * deficiency would perceive, for rendering a preview and for warning about
 * pairs that collapse into each other.
 *
 * See docs/roadmap/colour-vision-simulation.md.
 */

export type ColourVisionDeficiency =
  "protanopia" | "deuteranopia" | "tritanopia" | "achromatopsia";

export const COLOUR_VISION_DEFICIENCIES: readonly ColourVisionDeficiency[] = [
  "protanopia",
  "deuteranopia",
  "tritanopia",
  "achromatopsia",
];

/* Machado's three families. Achromatopsia is deliberately absent: the paper
   models anomalous trichromacy of one cone type and does not cover the loss of
   all colour perception, so that case is handled separately below and reported
   under its own method rather than borrowed from a paper that never claimed
   it. */
const MACHADO_FAMILIES: Partial<Record<ColourVisionDeficiency, MachadoFamily>> =
  {
    protanopia: "protan",
    deuteranopia: "deutan",
    tritanopia: "tritan",
  };

/* Rec. 709 luminance weights, the same ones WCAG relative luminance uses. */
const LUMINANCE_WEIGHTS: Rgb = [0.2126, 0.7152, 0.0722];

function clampUnit(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/**
 * The matrix for a severity between two tabulated ones.
 *
 * The published table is tabulated every 0.1. The authors say a severity in
 * between may either be recomputed from the model or interpolated from its two
 * neighbours, and that interpolating at this step is a close approximation, so
 * that is what this does. A severity that lands exactly on a step returns the
 * published matrix untouched.
 */
function machadoMatrix(family: MachadoFamily, severity: number): Matrix3 {
  const matrices = MACHADO_2009_MATRICES[family];
  const position = clampUnit(severity) / MACHADO_2009_SEVERITY_STEP;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);

  const lowerMatrix = matrices[lower]!;
  if (lower === upper) return lowerMatrix;

  const upperMatrix = matrices[upper]!;
  const weight = position - lower;
  return lowerMatrix.map(
    (value, index) => value + (upperMatrix[index]! - value) * weight,
  ) as unknown as Matrix3;
}

function applyMatrix(matrix: Matrix3, [r, g, b]: Rgb): Rgb {
  return [
    matrix[0] * r + matrix[1] * g + matrix[2] * b,
    matrix[3] * r + matrix[4] * g + matrix[5] * b,
    matrix[6] * r + matrix[7] * g + matrix[8] * b,
  ];
}

/**
 * Simulate a deficiency on an sRGB triple, each channel in 0..1.
 *
 * The matrix is applied to linear light, not to the gamma-encoded values, so
 * the input is decoded and the result re-encoded. Skipping that step is the
 * common implementation mistake with these matrices and it makes a wide range
 * of colours come out noticeably too dark.
 *
 * Severity is Machado's parameter: 1.0 is dichromacy, 0.0 is normal vision and
 * returns the input unchanged. It defaults to 1.0 because that is the only
 * value the studio currently offers.
 */
export function simulateColourVisionRgb(
  rgb: Rgb,
  deficiency: ColourVisionDeficiency,
  severity = 1,
): Rgb {
  const strength = clampUnit(severity);
  const linear = rgb.map((channel) =>
    srgbToLinear(clampUnit(channel)),
  ) as unknown as Rgb;

  if (deficiency === "achromatopsia") {
    /* Not from Machado. A luminance-preserving grey: the result has exactly the
       relative luminance of the input, which is what keeps the WCAG contrast
       ratios of a simulated pair equal to the real ones. Severity fades toward
       that grey, so 0.0 is still the identity. */
    const luminance =
      LUMINANCE_WEIGHTS[0] * linear[0] +
      LUMINANCE_WEIGHTS[1] * linear[1] +
      LUMINANCE_WEIGHTS[2] * linear[2];

    /* Written as `luminance * strength + channel * (1 - strength)` rather than
       the equivalent `channel + (luminance - channel) * strength`, because only
       this form is exact at both ends: it returns the channel untouched at 0
       and the luminance untouched at 1. The other leaves an error of about
       2e-16 at full severity, which is enough to make the three channels
       differ and the result not quite neutral. */
    return linear.map((channel) =>
      clampUnit(linearToSrgb(luminance * strength + channel * (1 - strength))),
    ) as unknown as Rgb;
  }

  const family = MACHADO_FAMILIES[deficiency]!;
  const simulated = applyMatrix(machadoMatrix(family, strength), linear);

  /* Clamped after encoding rather than before. The matrices can push a channel
     slightly outside the cube for saturated inputs — they map onto a plane the
     sRGB gamut does not fully contain — and a preview has to be a colour a
     screen can show. */
  return simulated.map((channel) =>
    clampUnit(linearToSrgb(clampUnit(channel))),
  ) as unknown as Rgb;
}

/** Simulate a deficiency on a hex colour, returning a hex colour. */
export function simulateColourVision(
  hex: string,
  deficiency: ColourVisionDeficiency,
  severity = 1,
): string {
  return rgbToHex(
    ...simulateColourVisionRgb(hexToRgb(hex), deficiency, severity),
  );
}

/* At full severity these are dichromacies; below it they are the anomalous
   trichromacies, which have different names. A report that says "deuteranopia"
   when it simulated a severity of 0.6 is describing something it did not do. */
const ANOMALOUS_NAMES: Record<ColourVisionDeficiency, string> = {
  protanopia: "Protanomaly",
  deuteranopia: "Deuteranomaly",
  tritanopia: "Tritanomaly",
  achromatopsia: "Partial achromatopsia",
};

const DICHROMAT_NAMES: Record<ColourVisionDeficiency, string> = {
  protanopia: "Protanopia",
  deuteranopia: "Deuteranopia",
  tritanopia: "Tritanopia",
  achromatopsia: "Achromatopsia",
};

export interface ColourVisionMethod {
  /** The condition actually simulated, which depends on the severity. */
  name: string;
  /** Where the numbers came from, for a report that can be checked later. */
  citation: string;
  severity: number;
}

/**
 * Name the method used, for the accessibility report.
 *
 * The report has to state this: a verdict whose method is unstated cannot be
 * checked once the formulas underneath it change.
 */
export function describeColourVisionMethod(
  deficiency: ColourVisionDeficiency,
  severity = 1,
): ColourVisionMethod {
  const strength = clampUnit(severity);
  const names = strength >= 1 ? DICHROMAT_NAMES : ANOMALOUS_NAMES;

  return {
    name: names[deficiency],
    citation:
      deficiency === "achromatopsia"
        ? "Luminance-preserving greyscale (Rec. 709 luminance weights)"
        : "Machado, Oliveira and Fernandes (2009), IEEE TVCG 15(6), pp. 1291-1298",
    severity: strength,
  };
}
