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
 * Reading a palette that is already in a browser, or in an older file.
 *
 * What is already stored is not a choice anyone is making now, so it is
 * salvaged field by field and only rejected when there is nothing
 * recognisable left. That is the opposite of `parseBlueprintWorkspace`, which
 * throws: a file someone deliberately chose is either the thing they meant or
 * a mistake worth reporting.
 *
 * Both go through here. The strict palette-file parser this used to be paired
 * with was deleted with the format it wrote — the workspace file replaced it,
 * and the legacy import path had already moved onto this reader.
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
 * The name a pre-workspace palette carried.
 *
 * The slice has no name of its own — the workspace owns the one name. This
 * reads the copy that older data still holds, so a migration or an imported
 * `blueprint-palette` file can name the workspace it becomes rather than
 * landing on the default. Input only; nothing writes this field any more.
 *
 * Returns null for a blank name as well as a missing one, since a workspace
 * called "" is a topbar someone has to guess at.
 */
export function readLegacyPaletteName(value: unknown): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  if (!("name" in value) || typeof value.name !== "string") return null;
  return value.name.trim() || null;
}

/**
 * Read a stored palette project, salvaging what is readable.
 *
 * Returns null only when nothing usable is left — no tracks at all, or no
 * track that survives validation. A project with one good track and three
 * broken ones keeps the good one.
 *
 * A readable name used to be required here too, back when the slice had one.
 * Tracks are the palette; a name never was, and rejecting a blob over a field
 * this type no longer has would discard someone's colours to enforce nothing.
 */
export function readPaletteProjectData(
  value: unknown,
): PaletteProjectData | null {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
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

  return { tracks, lightnessPattern, lightnessValues };
}
