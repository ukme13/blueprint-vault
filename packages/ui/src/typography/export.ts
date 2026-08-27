import { ROOT_FONT_SIZE_PX, type TypeScale, type TypeScaleUnit } from "./types";

/** Points per pixel: 72pt per inch against 96px per inch. */
const PT_PER_PX = 0.75;

/**
 * Convert a stored px length into the requested output unit.
 *
 * `rem` divides by the browser root size rather than the scale's own base, so a
 * scale with an 18px base correctly yields 1.125rem for body.
 */
export function convertLength(px: number, unit: TypeScaleUnit): number {
  switch (unit) {
    case "rem":
      return px / ROOT_FONT_SIZE_PX;
    case "pt":
      return px * PT_PER_PX;
    case "px":
      return px;
  }
}

/** Format a stored px length for output, trimming trailing zeros. */
export function formatLength(px: number, unit: TypeScaleUnit): string {
  return `${Number(convertLength(px, unit).toFixed(4))}${unit}`;
}

function tokenLines(
  scale: TypeScale,
  unit: TypeScaleUnit,
  indentation = "  ",
): string[] {
  const stepLines = scale.steps.map(
    (step) =>
      `${indentation}--font-size-${step.step}: ${formatLength(step.fontSizePx, unit)};`,
  );

  const roleLines = scale.roles.flatMap((role) => {
    const step = scale.steps.find((candidate) => candidate.step === role.step)!;
    return [
      `${indentation}--font-${role.role}-size: ${formatLength(step.fontSizePx, unit)};`,
      `${indentation}--font-${role.role}-weight: ${role.fontWeight};`,
      `${indentation}--font-${role.role}-line-height: ${role.lineHeight};`,
      `${indentation}--font-${role.role}-letter-spacing: ${formatLength(role.letterSpacingPx, unit)};`,
    ];
  });

  return [...stepLines, ...roleLines];
}

export function formatTypeScaleCssExport(
  scale: TypeScale,
  unit: TypeScaleUnit = "rem",
): string {
  return [
    ":root {",
    `  --font-family-base: ${scale.fontFamily};`,
    ...tokenLines(scale, unit),
    "}",
  ].join("\n");
}

export function formatTypeScaleTailwindExport(
  scale: TypeScale,
  unit: TypeScaleUnit = "rem",
): string {
  return [
    "@theme {",
    `  --font-family-base: ${scale.fontFamily};`,
    ...tokenLines(scale, unit),
    "}",
  ].join("\n");
}
