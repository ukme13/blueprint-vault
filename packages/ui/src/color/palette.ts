import { hexToRgb, normalizeHex, oklchToHex, rgbToOklch } from "./conversion";
import { BLUEPRINT_20_PRESET } from "./presets";
import type {
  ColorTrack,
  ColorTrackInput,
  DistributionMode,
  PalettePreset,
  ShadeItem,
  TrackAdjustments,
} from "./types";

const MIN_WEIGHT = 50;
const MIN_PRESET_WEIGHT = 25;
const MAX_WEIGHT = 950;
const WEIGHT_INTERVAL = 25;
export const MAX_SHADE_COUNT = (MAX_WEIGHT - MIN_WEIGHT) / WEIGHT_INTERVAL + 1;
export const MIN_LIGHTNESS_GAP = 0.5;

export function createEmptyTrackAdjustments(): TrackAdjustments {
  return { anchors: {}, manualOverrides: {} };
}

function normalizeAdjustmentRecord(
  values: Record<number, string> | undefined,
): Record<number, string> {
  return Object.fromEntries(
    Object.entries(values ?? {}).map(([weight, hex]) => {
      const numericWeight = Number(weight);
      if (!Number.isInteger(numericWeight)) {
        throw new TypeError(`Invalid shade weight: "${weight}".`);
      }
      return [numericWeight, normalizeHex(hex)];
    }),
  );
}

export function normalizeTrackAdjustments(
  adjustments?: TrackAdjustments,
): TrackAdjustments {
  return {
    anchors: normalizeAdjustmentRecord(adjustments?.anchors),
    manualOverrides: normalizeAdjustmentRecord(adjustments?.manualOverrides),
  };
}

function interpolateHue(start: number, end: number, progress: number): number {
  const difference = ((end - start + 540) % 360) - 180;
  return (start + difference * progress + 360) % 360;
}

function shadeFromHex(
  shade: ShadeItem,
  hex: string,
  anchorType: ShadeItem["anchorType"],
  isOverridden = false,
): ShadeItem {
  const normalizedHex = normalizeHex(hex);
  const [L, C, H] = rgbToOklch(...hexToRgb(normalizedHex));
  return {
    ...shade,
    L,
    C,
    H,
    hex: normalizedHex,
    isAnchor: anchorType !== null,
    anchorType,
    isOverridden,
  };
}

function applyTrackAdjustments(
  shades: ShadeItem[],
  adjustments: TrackAdjustments,
): ShadeItem[] {
  const adjusted = shades.map((shade) => ({ ...shade }));
  const sourceIndex = adjusted.findIndex(
    (shade) => shade.anchorType === "source",
  );

  const customAnchorIndexes = Object.entries(adjustments.anchors).flatMap(
    ([weight, hex]) => {
      const index = adjusted.findIndex(
        (shade) => shade.weight === Number(weight),
      );
      if (index < 0 || index === sourceIndex) return [];
      adjusted[index] = shadeFromHex(adjusted[index]!, hex, "custom");
      return [index];
    },
  );

  const anchorIndexes =
    customAnchorIndexes.length > 0
      ? [
          ...new Set([
            0,
            sourceIndex,
            ...customAnchorIndexes,
            adjusted.length - 1,
          ]),
        ]
          .filter((index) => index >= 0)
          .sort((first, second) => first - second)
      : [sourceIndex];

  for (let point = 0; point < anchorIndexes.length - 1; point++) {
    const startIndex = anchorIndexes[point]!;
    const endIndex = anchorIndexes[point + 1]!;
    const start = adjusted[startIndex]!;
    const end = adjusted[endIndex]!;

    for (let index = startIndex + 1; index < endIndex; index++) {
      if (adjusted[index]!.anchorType) continue;
      const progress = (index - startIndex) / (endIndex - startIndex);
      const L = start.L + (end.L - start.L) * progress;
      const C = start.C + (end.C - start.C) * progress;
      const H = interpolateHue(start.H, end.H, progress);
      adjusted[index] = {
        ...adjusted[index]!,
        L,
        C,
        H,
        hex: oklchToHex(L, C, H),
      };
    }
  }

  Object.entries(adjustments.manualOverrides).forEach(([weight, hex]) => {
    const index = adjusted.findIndex(
      (shade) => shade.weight === Number(weight),
    );
    if (index < 0) return;
    adjusted[index] = shadeFromHex(
      adjusted[index]!,
      hex,
      adjusted[index]!.anchorType,
      true,
    );
  });

  return adjusted;
}

function assertShadeCount(numShades: number): void {
  if (
    !Number.isInteger(numShades) ||
    numShades < 1 ||
    numShades > MAX_SHADE_COUNT
  ) {
    throw new RangeError(
      `Shade count must be an integer from 1 to ${MAX_SHADE_COUNT}.`,
    );
  }
}

function assertPercentage(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    throw new RangeError(`${label} must be between 0 and 100.`);
  }
}

function assertPresetWeights(weights: number[], shadeCount: number): void {
  if (weights.length !== shadeCount) {
    throw new RangeError(
      "Preset weights and lightness values must have the same length.",
    );
  }

  if (
    new Set(weights).size !== weights.length ||
    weights.some(
      (weight) =>
        !Number.isInteger(weight) ||
        weight < MIN_PRESET_WEIGHT ||
        weight > MAX_WEIGHT ||
        weight % WEIGHT_INTERVAL !== 0,
    )
  ) {
    throw new RangeError(
      "Preset weights must be unique 25-interval values from 25 to 950.",
    );
  }
}

export function normalizeTrackName(name: string): string {
  const normalized = name
    .trim()
    .replace(/[^a-zA-Z0-9-_]/g, "")
    .toLowerCase();

  return normalized === "danger" ? "error" : normalized;
}

export function generateStableWeights(numShades: number): number[] {
  assertShadeCount(numShades);

  if (numShades === 1) return [MIN_WEIGHT];

  const weights = Array.from({ length: numShades }, (_, index) => {
    const progress = index / (numShades - 1);
    const rawWeight = MIN_WEIGHT + (MAX_WEIGHT - MIN_WEIGHT) * progress;
    return Math.round(rawWeight / WEIGHT_INTERVAL) * WEIGHT_INTERVAL;
  });

  for (let index = 1; index < weights.length; index++) {
    if (weights[index]! <= weights[index - 1]!) {
      weights[index] = weights[index - 1]! + WEIGHT_INTERVAL;
    }
  }

  if (weights.at(-1)! > MAX_WEIGHT) {
    weights[weights.length - 1] = MAX_WEIGHT;

    for (let index = weights.length - 2; index >= 0; index--) {
      if (weights[index]! >= weights[index + 1]!) {
        weights[index] = Math.max(
          MIN_WEIGHT,
          weights[index + 1]! - WEIGHT_INTERVAL,
        );
      }
    }
  }

  return weights;
}

export function applyEasing(progress: number, mode: DistributionMode): number {
  switch (mode) {
    case "ease-in-out":
      return (1 - Math.cos(progress * Math.PI)) / 2;
    case "ease-in":
      return progress * progress;
    case "ease-out":
      return 1 - (1 - progress) * (1 - progress);
    case "linear":
    case "custom":
    default:
      return progress;
  }
}

export function generateLightnessArray(
  numShades: number,
  maxLightness: number,
  minLightness: number,
  mode: DistributionMode,
): number[] {
  assertShadeCount(numShades);
  assertPercentage(maxLightness, "Maximum lightness");
  assertPercentage(minLightness, "Minimum lightness");

  if (maxLightness < minLightness) {
    throw new RangeError(
      "Maximum lightness must be greater than or equal to minimum lightness.",
    );
  }

  return Array.from({ length: numShades }, (_, index) => {
    const progress = numShades === 1 ? 0 : index / (numShades - 1);
    const easedProgress = applyEasing(progress, mode);
    return maxLightness - (maxLightness - minLightness) * easedProgress;
  });
}

export function resizeLightnessArray(
  values: number[],
  nextShadeCount: number,
): number[] {
  if (!isValidLightnessSequence(values)) {
    throw new RangeError(
      "Lightness values must be a strictly descending sequence.",
    );
  }

  assertShadeCount(nextShadeCount);

  if (nextShadeCount === values.length) {
    return [...values];
  }

  if (nextShadeCount === 1) {
    return [values[0]!];
  }

  return Array.from({ length: nextShadeCount }, (_, index) => {
    const sourcePosition = (index / (nextShadeCount - 1)) * (values.length - 1);
    const lowerIndex = Math.floor(sourcePosition);
    const upperIndex = Math.ceil(sourcePosition);
    const progress = sourcePosition - lowerIndex;
    const lowerValue = values[lowerIndex]!;
    const upperValue = values[upperIndex]!;

    return lowerValue + (upperValue - lowerValue) * progress;
  });
}

export function isValidLightnessSequence(
  values: number[],
  expectedLength?: number,
): boolean {
  if (expectedLength !== undefined && values.length !== expectedLength) {
    return false;
  }

  return values.every(
    (value, index) =>
      Number.isFinite(value) &&
      value >= 0 &&
      value <= 100 &&
      (index === 0 || value < values[index - 1]!),
  );
}

export function clampLightnessValue(
  values: number[],
  index: number,
  nextValue: number,
  minimumGap = MIN_LIGHTNESS_GAP,
): number {
  if (!isValidLightnessSequence(values)) {
    throw new RangeError(
      "Lightness values must be a strictly descending sequence.",
    );
  }
  if (!Number.isInteger(index) || index < 0 || index >= values.length) {
    throw new RangeError("Lightness index is outside the sequence.");
  }
  if (!Number.isFinite(nextValue)) {
    throw new TypeError("Lightness value must be a finite number.");
  }
  if (!Number.isFinite(minimumGap) || minimumGap <= 0) {
    throw new RangeError("Minimum lightness gap must be greater than zero.");
  }

  const upperBound = index === 0 ? 100 : values[index - 1]! - minimumGap;
  const lowerBound =
    index === values.length - 1 ? 0 : values[index + 1]! + minimumGap;

  if (lowerBound > upperBound) {
    throw new RangeError("Neighbouring shades do not have enough space.");
  }

  return Math.min(upperBound, Math.max(lowerBound, nextValue));
}

export function generatePalette(
  track: ColorTrackInput,
  lightnessArray: number[],
  weights: number[] = generateStableWeights(lightnessArray.length),
): ColorTrack {
  assertShadeCount(lightnessArray.length);
  lightnessArray.forEach((value) => assertPercentage(value, "Lightness value"));
  assertPresetWeights(weights, lightnessArray.length);

  const seedHex = normalizeHex(track.seedHex);
  const adjustments = normalizeTrackAdjustments(track.adjustments);
  const [seedLightness, seedChroma, seedHue] = rgbToOklch(...hexToRgb(seedHex));
  const seedLightnessPercent = seedLightness * 100;

  let anchorIndex = 0;
  let closestDistance = Number.POSITIVE_INFINITY;

  lightnessArray.forEach((lightness, index) => {
    const distance = Math.abs(lightness - seedLightnessPercent);
    if (distance < closestDistance) {
      closestDistance = distance;
      anchorIndex = index;
    }
  });

  const shades: ShadeItem[] = weights.map((weight, index) => {
    const isAnchor = index === anchorIndex;
    const targetLightness = lightnessArray[index]! / 100;

    if (isAnchor) {
      return {
        weight,
        L: seedLightness,
        C: seedChroma,
        H: seedHue,
        hex: seedHex,
        isAnchor: true,
        isOverridden: false,
        anchorType: "source",
      };
    }

    let chroma = seedChroma;

    if (index < anchorIndex) {
      const factor = anchorIndex > 0 ? index / anchorIndex : 0;
      chroma = 0.01 + factor * (seedChroma - 0.01);
    } else {
      const denominator = weights.length - 1 - anchorIndex;
      const factor = denominator > 0 ? (index - anchorIndex) / denominator : 0;
      chroma = seedChroma - factor * (seedChroma - 0.025);
    }

    return {
      weight,
      L: targetLightness,
      C: chroma,
      H: seedHue,
      hex: oklchToHex(targetLightness, chroma, seedHue),
      isAnchor: false,
      isOverridden: false,
      anchorType: null,
    };
  });

  return {
    ...track,
    name: normalizeTrackName(track.name),
    seedHex,
    adjustments,
    shades: applyTrackAdjustments(shades, adjustments),
  };
}

export function generatePaletteFromPreset(
  track: ColorTrackInput,
  preset: PalettePreset,
): ColorTrack {
  return generatePalette(track, preset.lightnessValues, preset.weights);
}

/**
 * Every track of a project, generated.
 *
 * The weight scale is the Blueprint 20 when the shade count matches it and a
 * stable generated one otherwise, which is the rule both studios need and
 * neither should be restating.
 */
export function generatePalettes(project: {
  tracks: ColorTrackInput[];
  lightnessValues: number[];
}): ColorTrack[] {
  const shadeCount = project.lightnessValues.length;
  if (shadeCount === 0) return [];
  const weights =
    shadeCount === BLUEPRINT_20_PRESET.weights.length
      ? [...BLUEPRINT_20_PRESET.weights]
      : generateStableWeights(shadeCount);
  return project.tracks.map((track) =>
    generatePalette(track, project.lightnessValues, weights),
  );
}

/** One shade by track and weight, or null when the palette no longer has it. */
export function findShade(
  tracks: ColorTrack[],
  trackId: string,
  weight: number,
): ShadeItem | null {
  const track = tracks.find((candidate) => candidate.id === trackId);
  return track?.shades.find((shade) => shade.weight === weight) ?? null;
}

export function formatPaletteCss(palettes: ColorTrack[]): string {
  let css = "/* 🎨 OKLCH Color System - Stable 25-Interval Tokens */\n\n";

  palettes.forEach((palette) => {
    css += `/* Palette: ${palette.name.toUpperCase()} */\n`;
    palette.shades.forEach((shade) => {
      css += `--color-${palette.name}-${shade.weight}: oklch(${shade.L.toFixed(3)} ${shade.C.toFixed(3)} ${shade.H.toFixed(1)}); /* ${shade.hex} */\n`;
    });
    css += "\n";
  });

  return css;
}
