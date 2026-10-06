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
import {
  formatLayoutCss,
  formatLayoutTailwind,
  layoutDesignTokenGroup,
  type LayoutToken,
} from "../scale/layout-tokens";
import type { PreviewDevice } from "../typography/preview-devices";
import type { TypeSystem } from "../typography/system";
import {
  formatTypeSystemCssExport,
  formatTypeSystemTailwindExport,
  typographyDesignTokenGroup,
} from "../typography/system-export";
import type { TypeScaleUnit } from "../typography/types";

/**
 * Everything the workspace produces, in one file.
 *
 * Colour primitives, the semantic layer over them, the three scales, the
 * layout uses that point into those scales per preview frame, and the type
 * system. A client installs one file rather than five they have to remember
 * belong together — a semantic alias without its primitive, or a radius use
 * without the radius it names, is half a system.
 *
 * Typography used to ship only from its own studio, because its unit (rem,
 * px or pt) was a choice this file would have made on the client's behalf.
 * The unit is now part of the input, chosen in the one export dialog every
 * studio opens. Uses and typography are optional: a caller that leaves them
 * out gets the colour and scale file it always did.
 *
 * See docs/roadmap/scale-studio.md.
 */

export interface DesignSystemExportInput extends ScaleExportInput {
  semantics: SemanticToken[];
  colourFormat: ColourFormat;
  /** Layout uses, written per preview frame. Needs `previewDevices`. */
  layout?: readonly LayoutToken[];
  previewDevices?: readonly PreviewDevice[];
  /** The type system and the unit to write it in. */
  typography?: {
    system: TypeSystem;
    unit: TypeScaleUnit;
    remRootPx: number;
  } | null;
}

function layoutPart(
  input: DesignSystemExportInput,
  format: typeof formatLayoutCss,
): string {
  return input.layout && input.previewDevices
    ? format(input.layout, input.previewDevices)
    : "";
}

function typographyPart(
  input: DesignSystemExportInput,
  format: typeof formatTypeSystemCssExport,
): string {
  const { typography } = input;
  return typography
    ? format(
        typography.system,
        typography.unit,
        input.previewDevices,
        typography.remRootPx,
      )
    : "";
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
    layoutPart(input, formatLayoutCss),
    typographyPart(input, formatTypeSystemCssExport),
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
    layoutPart(input, formatLayoutTailwind),
    typographyPart(input, formatTypeSystemTailwindExport),
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
      ...(input.layout && input.previewDevices
        ? { layout: layoutDesignTokenGroup(input.layout, input.previewDevices) }
        : {}),
      ...(input.typography
        ? {
            typography: typographyDesignTokenGroup(
              input.typography.system,
              input.typography.unit,
              input.previewDevices,
              input.typography.remRootPx,
            ),
          }
        : {}),
    },
    null,
    2,
  );
}
