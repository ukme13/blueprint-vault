import { normalizeHex } from "./conversion";
import { formatColour, type ColourFormat } from "./format";
import {
  isValidLightnessSequence,
  MAX_SHADE_COUNT,
  normalizeTrackAdjustments,
  normalizeTrackName,
} from "./palette";
import type { ColorTrack, ColorTrackInput } from "./types";

export const BLUEPRINT_PROJECT_FILE_VERSION = 1;
export const BLUEPRINT_PROJECT_MIN_SHADE_COUNT = 10;

export type PaletteLightnessPattern = "linear" | "ease-in-out" | "custom";

export interface PaletteProjectData {
  name: string;
  tracks: ColorTrackInput[];
  lightnessPattern: PaletteLightnessPattern;
  lightnessValues: number[];
}

export interface BlueprintPaletteProjectFile {
  kind: "blueprint-palette";
  version: typeof BLUEPRINT_PROJECT_FILE_VERSION;
  project: PaletteProjectData;
}

function tokenName(name: string): string {
  return name.trim().replace(/\s+/g, "-").toLowerCase();
}

function tokenLines(
  palettes: ColorTrack[],
  colourFormat: ColourFormat,
  indentation = "  ",
): string[] {
  return palettes.flatMap((palette) =>
    palette.shades.map(
      (shade) =>
        `${indentation}--color-${tokenName(palette.name)}-${shade.weight}: ${formatColour(shade.hex, colourFormat)};`,
    ),
  );
}

export function formatPaletteCssExport(
  palettes: ColorTrack[],
  colourFormat: ColourFormat,
): string {
  return [":root {", ...tokenLines(palettes, colourFormat), "}"].join("\n");
}

export function formatPaletteTailwindExport(
  palettes: ColorTrack[],
  colourFormat: ColourFormat,
): string {
  return ["@theme {", ...tokenLines(palettes, colourFormat), "}"].join("\n");
}

export function formatPaletteDesignTokens(
  palettes: ColorTrack[],
  colourFormat: ColourFormat,
): string {
  return JSON.stringify(
    {
      palette: {
        $type: "color",
        $description: "Colour palette exported from Blueprint",
        ...Object.fromEntries(
          palettes.map((palette) => [
            tokenName(palette.name),
            Object.fromEntries(
              palette.shades.map((shade) => [
                shade.weight,
                { $value: formatColour(shade.hex, colourFormat) },
              ]),
            ),
          ]),
        ),
      },
    },
    null,
    2,
  );
}

export function formatBlueprintPaletteProject(
  project: PaletteProjectData,
): string {
  const file: BlueprintPaletteProjectFile = {
    kind: "blueprint-palette",
    version: BLUEPRINT_PROJECT_FILE_VERSION,
    project,
  };
  return JSON.stringify(file, null, 2);
}

function isLightnessPattern(value: unknown): value is PaletteLightnessPattern {
  return value === "linear" || value === "ease-in-out" || value === "custom";
}

export function parseBlueprintPaletteProject(
  source: string,
): PaletteProjectData {
  const parsed: unknown = JSON.parse(source);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new TypeError("This is not a Blueprint palette project file.");
  }
  if (
    !("kind" in parsed) ||
    parsed.kind !== "blueprint-palette" ||
    !("version" in parsed) ||
    parsed.version !== BLUEPRINT_PROJECT_FILE_VERSION ||
    !("project" in parsed) ||
    !parsed.project ||
    typeof parsed.project !== "object" ||
    Array.isArray(parsed.project)
  ) {
    throw new TypeError("This Blueprint project file is not supported.");
  }

  const project = parsed.project;
  if (
    !("name" in project) ||
    typeof project.name !== "string" ||
    !project.name.trim() ||
    !("tracks" in project) ||
    !Array.isArray(project.tracks) ||
    project.tracks.length === 0 ||
    !("lightnessPattern" in project) ||
    !isLightnessPattern(project.lightnessPattern) ||
    !("lightnessValues" in project) ||
    !Array.isArray(project.lightnessValues) ||
    project.lightnessValues.length < BLUEPRINT_PROJECT_MIN_SHADE_COUNT ||
    project.lightnessValues.length > MAX_SHADE_COUNT ||
    !project.lightnessValues.every(
      (value): value is number => typeof value === "number",
    ) ||
    !isValidLightnessSequence(project.lightnessValues)
  ) {
    throw new TypeError("The Blueprint project data is incomplete or invalid.");
  }

  const tracks = project.tracks.map((track): ColorTrackInput => {
    if (
      !track ||
      typeof track !== "object" ||
      Array.isArray(track) ||
      !("id" in track) ||
      typeof track.id !== "string" ||
      !track.id.trim() ||
      !("name" in track) ||
      typeof track.name !== "string" ||
      !normalizeTrackName(track.name) ||
      !("seedHex" in track) ||
      typeof track.seedHex !== "string"
    ) {
      throw new TypeError("A colour track in this project is invalid.");
    }

    return {
      id: track.id,
      name: normalizeTrackName(track.name),
      seedHex: normalizeHex(track.seedHex),
      adjustments: normalizeTrackAdjustments(
        "adjustments" in track && track.adjustments
          ? (track.adjustments as ColorTrackInput["adjustments"])
          : undefined,
      ),
    };
  });

  if (new Set(tracks.map((track) => track.id)).size !== tracks.length) {
    throw new TypeError("Colour track IDs must be unique.");
  }

  return {
    name: project.name.trim(),
    tracks,
    lightnessPattern: project.lightnessPattern,
    lightnessValues: [...project.lightnessValues],
  };
}
