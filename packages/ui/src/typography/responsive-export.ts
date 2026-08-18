import type { ResponsiveTypographySystem } from "./responsive-types";

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
): string[] {
  return system.roles.flatMap((role) => {
    const value = role[viewport];
    const id = tokenId(role.id);
    return [
      `  --font-${id}-size: ${value.fontSizePx}px;`,
      `  --font-${id}-line-height: ${value.lineHeight};`,
      `  --font-${id}-letter-spacing: ${value.letterSpacingPx}px;`,
    ];
  });
}

export function formatResponsiveTypographyCssExport(
  system: ResponsiveTypographySystem,
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
    ...linesForViewport(system, "mobile"),
    "}",
    "",
    `@media (min-width: ${system.breakpointPx}px) {`,
    "  :root {",
    ...linesForViewport(system, "desktop").map((line) => `  ${line}`),
    "  }",
    "}",
  ].join("\n");
}
