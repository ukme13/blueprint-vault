import { formatLength } from "./export";
import { findGoogleFont } from "./google-fonts";
import { generateTypeSteps } from "./scale";
import {
  resolveLineHeight,
  resolveRoleSizePx,
  type TypeSystem,
} from "./system";
import type { TypeScaleUnit } from "./types";

/**
 * Export for the merged model.
 *
 * Mobile values go in `:root` and desktop overrides go in a min-width block, so
 * the smallest layout is the default. The block is only emitted when a role
 * actually differs between viewports — a migrated single-viewport project should
 * not gain an empty media query it never asked for.
 */

/**
 * A font or role id, as it is spelled in a variable name.
 *
 * Exported rather than private because the documentation names the same
 * variables beside each role, and a page that built `--font-h1-size` from its
 * own `toLowerCase` would be a second spelling of this rule — agreeing until
 * somebody names a role "Body Large" and the two disagree about the hyphen.
 * A developer copying a name off the page has to get the one in their file.
 */
export function typeTokenId(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * The system with every role's size resolved.
 *
 * The one thing this file must do before writing a number. A role's stored
 * `fontSizePx` is only its own answer when somebody unlinked it by typing a
 * size; a role linked to a step keeps whatever was in the field when it was
 * last written, and the studio resolves on read and never writes back. So
 * `defaultSystem` leaves every role holding the base size and the offsets
 * decide what is drawn.
 *
 * Exported unresolved, that shipped a design system in which every text role
 * was 16px — measured on the reference workspace's own generated file,
 * `--font-h1-size`, `--font-h2-size` and `--font-display-size` all 16px beside
 * a correct `--font-size-8: 62px`. Invisible from the studio and from the
 * documentation, because both resolve before they render. Only a client
 * installing the file would have found it.
 *
 * `resolveRoleSizePx` is the same function the row builder uses, so the
 * table, the specimen and the file cannot disagree about a size.
 */
function hasViewportDifference(system: TypeSystem): boolean {
  const steps = generateTypeSteps(
    system.baseFontSizePx,
    system.ratio,
    system.stepCount,
  );
  return system.roles.some((role) => {
    const desktopPx = resolveRoleSizePx(system, steps, role, "desktop");
    const phonePx = resolveRoleSizePx(system, steps, role, "phone");
    return (
      desktopPx !== phonePx ||
      resolveLineHeight(role, desktopPx, "desktop").computedLineHeightRatio !==
        resolveLineHeight(role, phonePx, "phone").computedLineHeightRatio
    );
  });
}

function viewportLines(
  system: TypeSystem,
  deviceId: string,
  unit: TypeScaleUnit,
  indentation: string,
): string[] {
  const steps = generateTypeSteps(
    system.baseFontSizePx,
    system.ratio,
    system.stepCount,
  );
  return system.roles.flatMap((role) => {
    const fontSizePx = resolveRoleSizePx(system, steps, role, deviceId);
    const id = typeTokenId(role.id);
    const { computedLineHeightRatio } = resolveLineHeight(
      role,
      fontSizePx,
      deviceId,
    );
    return [
      `${indentation}--font-${id}-size: ${formatLength(fontSizePx, unit)};`,
      `${indentation}--font-${id}-line-height: ${computedLineHeightRatio};`,
      `${indentation}--font-${id}-letter-spacing: ${formatLength(role.letterSpacingPx, unit)};`,
    ];
  });
}

function sharedLines(system: TypeSystem, unit: TypeScaleUnit): string[] {
  const fonts = system.fonts.map(
    (font) =>
      `  --font-family-${typeTokenId(font.id)}: ${font.families
        .map((family) =>
          /^[a-zA-Z][a-zA-Z0-9-]*$/.test(family) ? family : `"${family}"`,
        )
        .join(", ")};`,
  );

  /* Step tokens are kept because the previous main-studio export emitted them.
     Dropping them would silently break anyone consuming --font-size-N. */
  const steps = generateTypeSteps(
    system.baseFontSizePx,
    system.ratio,
    system.stepCount,
  ).map(
    (step) =>
      `  --font-size-${step.step}: ${formatLength(step.fontSizePx, unit)};`,
  );

  const perRole = system.roles.flatMap((role) => {
    const id = typeTokenId(role.id);
    return [
      `  --font-${id}-family: var(--font-family-${typeTokenId(role.fontId)});`,
      `  --font-${id}-weight: ${role.fontWeight};`,
      `  --font-${id}-transform: ${role.textTransform};`,
    ];
  });

  return [...fonts, ...steps, ...perRole];
}

/**
 * Google families the system names.
 *
 * Exported tokens can name a family but cannot load it, so the consuming app
 * has to. Listing them in a comment is the only way that requirement travels
 * with the tokens.
 */
function googleFontNotice(system: TypeSystem): string[] {
  const families = [
    ...new Set(
      system.fonts
        .flatMap((font) => font.families)
        .filter((family) => findGoogleFont(family) !== undefined),
    ),
  ].sort();

  if (families.length === 0) return [];
  return [
    "/* Loads from Google Fonts. These tokens name the families but do not",
    "   load them — the consuming app must:",
    ...families.map((family) => `     - ${family}`),
    "*/",
  ];
}

function body(
  rawSystem: TypeSystem,
  unit: TypeScaleUnit,
  open: string,
): string {
  const system = rawSystem;
  const lines = [
    ...googleFontNotice(system),
    open,
    ...sharedLines(system, unit),
    ...viewportLines(system, "phone", unit, "  "),
    "}",
  ];

  if (hasViewportDifference(system)) {
    lines.push(
      "",
      `@media (min-width: ${system.breakpointPx}px) {`,
      `  ${open}`,
      ...viewportLines(system, "desktop", unit, "    "),
      "  }",
      "}",
    );
  }

  return lines.join("\n");
}

export function formatTypeSystemCssExport(
  system: TypeSystem,
  unit: TypeScaleUnit = "rem",
): string {
  return body(system, unit, ":root {");
}

export function formatTypeSystemTailwindExport(
  system: TypeSystem,
  unit: TypeScaleUnit = "rem",
): string {
  return body(system, unit, "@theme static {");
}
