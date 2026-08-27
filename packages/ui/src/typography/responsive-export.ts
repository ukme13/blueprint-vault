import { formatLength } from "./export";
import type { ResponsiveTypographySystem } from "./responsive-types";
import type { TypeScaleUnit } from "./types";

function tokenId(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function linesForViewport(
  system: ResponsiveTypographySystem,
  viewport: "desktop" | "mobile",
  unit: TypeScaleUnit,
): string[] {
  return system.roles.flatMap((role) => {
    const value = role[viewport];
    const id = tokenId(role.id);
    return [
      `  --font-${id}-size: ${formatLength(value.fontSizePx, unit)};`,
      `  --font-${id}-line-height: ${value.lineHeight};`,
      `  --font-${id}-letter-spacing: ${formatLength(value.letterSpacingPx, unit)};`,
    ];
  });
}

export function formatResponsiveTypographyCssExport(
  system: ResponsiveTypographySystem,
  unit: TypeScaleUnit = "rem",
): string {
  const shared = system.roles.flatMap((role) => {
    const id = tokenId(role.id);
    return [
      `  --font-${id}-family: var(--font-family-${tokenId(role.fontFamilyId)});`,
      `  --font-${id}-weight: ${role.fontWeight};`,
      `  --font-${id}-transform: ${role.textTransform};`,
    ];
  });
  const fonts = system.fonts.map(
    (font) => `  --font-family-${tokenId(font.id)}: ${font.value};`,
  );

  return [
    ":root {",
    ...fonts,
    ...shared,
    ...linesForViewport(system, "mobile", unit),
    "}",
    "",
    `@media (min-width: ${system.breakpointPx}px) {`,
    "  :root {",
    ...linesForViewport(system, "desktop", unit).map((line) => `  ${line}`),
    "  }",
    "}",
  ].join("\n");
}
