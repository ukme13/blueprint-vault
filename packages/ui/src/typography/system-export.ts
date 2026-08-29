import { formatLength } from "./export";
import { findGoogleFont } from "./google-fonts";
import { generateTypeSteps } from "./scale";
import type { TypeRole, TypeSystem } from "./system";
import type { TypeScaleUnit } from "./types";

/**
 * Export for the merged model.
 *
 * Mobile values go in `:root` and desktop overrides go in a min-width block, so
 * the smallest layout is the default. The block is only emitted when a role
 * actually differs between viewports — a migrated single-viewport project should
 * not gain an empty media query it never asked for.
 */

function tokenId(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function hasViewportDifference(system: TypeSystem): boolean {
  return system.roles.some(
    (role) =>
      role.desktop.fontSizePx !== role.mobile.fontSizePx ||
      role.desktop.lineHeight !== role.mobile.lineHeight ||
      role.desktop.letterSpacingPx !== role.mobile.letterSpacingPx,
  );
}

function viewportLines(
  roles: TypeRole[],
  viewport: "desktop" | "mobile",
  unit: TypeScaleUnit,
  indentation: string,
): string[] {
  return roles.flatMap((role) => {
    const value = role[viewport];
    const id = tokenId(role.id);
    return [
      `${indentation}--font-${id}-size: ${formatLength(value.fontSizePx, unit)};`,
      `${indentation}--font-${id}-line-height: ${value.lineHeight};`,
      `${indentation}--font-${id}-letter-spacing: ${formatLength(value.letterSpacingPx, unit)};`,
    ];
  });
}

function sharedLines(system: TypeSystem, unit: TypeScaleUnit): string[] {
  const fonts = system.fonts.map(
    (font) =>
      `  --font-family-${tokenId(font.id)}: ${font.families
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
    const id = tokenId(role.id);
    return [
      `  --font-${id}-family: var(--font-family-${tokenId(role.fontId)});`,
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

function body(system: TypeSystem, unit: TypeScaleUnit, open: string): string {
  const lines = [
    ...googleFontNotice(system),
    open,
    ...sharedLines(system, unit),
    ...viewportLines(system.roles, "mobile", unit, "  "),
    "}",
  ];

  if (hasViewportDifference(system)) {
    lines.push(
      "",
      `@media (min-width: ${system.breakpointPx}px) {`,
      `  ${open}`,
      ...viewportLines(system.roles, "desktop", unit, "    "),
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
  return body(system, unit, "@theme {");
}
