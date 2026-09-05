import { formatColour, type ColourFormat } from "./format";
import type { ColorTrack, ColorTrackInput } from "./types";

/**
 * The version of the retired `blueprint-palette` file.
 *
 * Nothing writes one any more — a workspace file carries every slice, and a
 * palette file quietly dropped five of them. Kept because people still have
 * these on disk, and `parseBlueprintWorkspace` checks it before importing one.
 */
export const BLUEPRINT_PROJECT_FILE_VERSION = 1;
export const BLUEPRINT_PROJECT_MIN_SHADE_COUNT = 10;

export type PaletteLightnessPattern = "linear" | "ease-in-out" | "custom";

/**
 * The palette slice of a workspace.
 *
 * No `name`. The workspace owns the one name both studios edit; this slice
 * carried a second copy of it until the two could not disagree any more, and
 * nothing outside the topbar ever read it. Pre-workspace data still carries
 * one — `readLegacyPaletteName` is what reads it, on the way in only.
 */
export interface PaletteProjectData {
  tracks: ColorTrackInput[];
  lightnessPattern: PaletteLightnessPattern;
  lightnessValues: number[];
}

/**
 * A track's name as it appears in a token.
 *
 * Exported because the semantic layer aliases these — `var(--color-primary-550)`
 * — and an alias built from a second copy of this rule would point at a
 * variable that does not exist the first time the two disagreed.
 */
export function paletteTokenName(name: string): string {
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
        `${indentation}--color-${paletteTokenName(palette.name)}-${shade.weight}: ${formatColour(shade.hex, colourFormat)};`,
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
  return ["@theme static {", ...tokenLines(palettes, colourFormat), "}"].join(
    "\n",
  );
}

/**
 * The `palette` group, as an object.
 *
 * Split out so the semantic export can put this and its own group in one
 * document. Aliases point into these names, so a file carrying only semantics
 * is a set of references to variables nothing declares.
 */
export function paletteDesignTokenGroup(
  palettes: ColorTrack[],
  colourFormat: ColourFormat,
): Record<string, unknown> {
  return {
    $type: "color",
    $description: "Colour palette exported from Blueprint",
    ...Object.fromEntries(
      palettes.map((palette) => [
        paletteTokenName(palette.name),
        Object.fromEntries(
          palette.shades.map((shade) => [
            shade.weight,
            { $value: formatColour(shade.hex, colourFormat) },
          ]),
        ),
      ]),
    ),
  };
}

export function formatPaletteDesignTokens(
  palettes: ColorTrack[],
  colourFormat: ColourFormat,
): string {
  return JSON.stringify(
    { palette: paletteDesignTokenGroup(palettes, colourFormat) },
    null,
    2,
  );
}
