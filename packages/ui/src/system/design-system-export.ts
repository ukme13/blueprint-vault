import { paletteDesignTokenGroup } from "../color/export";
import {
  formatSemanticCssExport,
  formatSemanticDesignTokens,
  formatSemanticTailwindExport,
} from "../color/semantic-export";
import {
  formatPaletteCssExport,
  formatPaletteTailwindExport,
} from "../color/export";
import type { ColourFormat } from "../color/format";
import {
  formatScaleCss,
  formatScaleTailwind,
  scaleDesignTokenGroups,
  type ScaleExportInput,
} from "../scale/scale-export";
import type { SemanticToken } from "../color/semantic";

/**
 * Everything the colour side of the workspace produces, in one file.
 *
 * Colour primitives, the semantic layer over them, and the three scales. A
 * client installs one file rather than four they have to remember belong
 * together — a semantic alias without its primitive, or a shadow without the
 * spacing around it, is half a system.
 *
 * Typography is not here. It ships from its own studio with its own unit
 * choice, and folding it in would mean picking that unit on the client's
 * behalf. Named `design system` rather than `colour system` all the same,
 * because it stopped being only colour at stage 5 of the scale plan.
 *
 * See docs/roadmap/scale-studio.md.
 */

export interface DesignSystemExportInput extends ScaleExportInput {
  semantics: SemanticToken[];
  colourFormat: ColourFormat;
}

function joined(parts: string[]): string {
  return parts.filter((part) => part.trim().length > 0).join("\n\n");
}

export function formatDesignSystemCss(input: DesignSystemExportInput): string {
  const { palettes, semantics, colourFormat } = input;

  return joined([
    formatPaletteCssExport(palettes, colourFormat),
    semantics.length === 0 ? "" : formatSemanticCssExport(semantics, palettes),
    formatScaleCss(input),
  ]);
}

export function formatDesignSystemTailwind(
  input: DesignSystemExportInput,
): string {
  const { palettes, semantics, colourFormat } = input;

  return joined([
    formatPaletteTailwindExport(palettes, colourFormat),
    semantics.length === 0
      ? ""
      : formatSemanticTailwindExport(semantics, palettes),
    formatScaleTailwind(input),
  ]);
}

export function formatDesignSystemDesignTokens(
  input: DesignSystemExportInput,
): string {
  const { palettes, semantics, colourFormat } = input;

  return JSON.stringify(
    {
      palette: paletteDesignTokenGroup(palettes, colourFormat),
      ...(semantics.length === 0
        ? {}
        : {
            semantic: (
              JSON.parse(formatSemanticDesignTokens(semantics, palettes)) as {
                semantic: unknown;
              }
            ).semantic,
          }),
      ...scaleDesignTokenGroups(input),
    },
    null,
    2,
  );
}
