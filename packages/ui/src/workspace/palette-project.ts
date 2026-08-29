import { normalizeHex } from "../color/conversion";
import {
  BLUEPRINT_PROJECT_MIN_SHADE_COUNT,
  type PaletteLightnessPattern,
  type PaletteProjectData,
} from "../color/export";
import {
  generateLightnessArray,
  isValidLightnessSequence,
  MAX_SHADE_COUNT,
  normalizeTrackName,
} from "../color/palette";
import { BLUEPRINT_20_PRESET } from "../color/presets";
import type { ColorTrackInput, TrackAdjustments } from "../color/types";

/*
 * Reading a palette out of storage, as opposed to out of a file.
 *
 * parseBlueprintPaletteProject is the file reader and is deliberately strict —
 * it throws, because a file someone chose is either the thing they meant or a
 * mistake worth reporting. This is the other half: what is already in a
 * browser is not a choice anyone is making now, so it is salvaged field by
 * field and only rejected when there is nothing recognisable left.
 */

function readAdjustmentRecord(value: unknown): Record<number, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  return Object.fromEntries(
    Object.entries(value).flatMap(([weight, hex]) => {
      const numericWeight = Number(weight);
      if (!Number.isInteger(numericWeight) || typeof hex !== "string") {
        return [];
      }

      try {
        return [[numericWeight, normalizeHex(hex)]];
      } catch {
        return [];
      }
    }),
  );
}

function readTrackAdjustments(value: unknown): TrackAdjustments {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { anchors: {}, manualOverrides: {} };
  }

  return {
    anchors: readAdjustmentRecord(
      "anchors" in value ? value.anchors : undefined,
    ),
    manualOverrides: readAdjustmentRecord(
      "manualOverrides" in value ? value.manualOverrides : undefined,
    ),
  };
}

function isLightnessPattern(value: unknown): value is PaletteLightnessPattern {
  return value === "linear" || value === "ease-in-out" || value === "custom";
}

/** The lightness ramp a project falls back to when its own is unusable. */
export function defaultLightnessValues(
  pattern: PaletteLightnessPattern = "custom",
  shadeCount = BLUEPRINT_20_PRESET.weights.length,
  maxLightness = BLUEPRINT_20_PRESET.lightnessValues[0]!,
  minLightness = BLUEPRINT_20_PRESET.lightnessValues.at(-1)!,
): number[] {
  if (
    pattern === "custom" &&
    shadeCount === BLUEPRINT_20_PRESET.weights.length
  ) {
    return [...BLUEPRINT_20_PRESET.lightnessValues];
  }

  return generateLightnessArray(
    shadeCount,
    maxLightness,
    minLightness,
    pattern,
  );
}

/**
 * Read a stored palette project, salvaging what is readable.
 *
 * Returns null only when nothing usable is left — no name, or no track that
 * survives validation. A project with one good track and three broken ones
 * keeps the good one.
 */
export function readPaletteProjectData(
  value: unknown,
): PaletteProjectData | null {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("name" in value) ||
    typeof value.name !== "string" ||
    !("tracks" in value) ||
    !Array.isArray(value.tracks)
  ) {
    return null;
  }

  const tracks = value.tracks.flatMap((track): ColorTrackInput[] => {
    if (
      !track ||
      typeof track !== "object" ||
      !("id" in track) ||
      typeof track.id !== "string" ||
      !("name" in track) ||
      typeof track.name !== "string" ||
      !("seedHex" in track) ||
      typeof track.seedHex !== "string"
    ) {
      return [];
    }

    try {
      return [
        {
          id: track.id,
          name: normalizeTrackName(track.name),
          seedHex: normalizeHex(track.seedHex),
          adjustments: readTrackAdjustments(
            "adjustments" in track ? track.adjustments : undefined,
          ),
        },
      ];
    } catch {
      return [];
    }
  });

  if (tracks.length === 0) return null;

  let lightnessPattern: PaletteLightnessPattern = "custom";
  let lightnessValues = defaultLightnessValues();

  if (
    "lightnessValues" in value &&
    Array.isArray(value.lightnessValues) &&
    value.lightnessValues.every(
      (entry): entry is number => typeof entry === "number",
    ) &&
    value.lightnessValues.length >= BLUEPRINT_PROJECT_MIN_SHADE_COUNT &&
    value.lightnessValues.length <= MAX_SHADE_COUNT &&
    isValidLightnessSequence(value.lightnessValues)
  ) {
    lightnessValues = [...value.lightnessValues];

    if (
      "lightnessPattern" in value &&
      isLightnessPattern(value.lightnessPattern)
    ) {
      lightnessPattern = value.lightnessPattern;
    }
  }

  return { name: value.name, tracks, lightnessPattern, lightnessValues };
}
