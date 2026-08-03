import type { TypeScale } from "./types";

function formatPx(value: number): string {
  return `${Number(value.toFixed(3))}px`;
}

function tokenLines(scale: TypeScale, indentation = "  "): string[] {
  const stepLines = scale.steps.map(
    (step) =>
      `${indentation}--font-size-${step.step}: ${formatPx(step.fontSizePx)};`,
  );

  const roleLines = scale.roles.flatMap((role) => {
    const step = scale.steps.find((candidate) => candidate.step === role.step)!;
    return [
      `${indentation}--font-${role.role}-size: ${formatPx(step.fontSizePx)};`,
      `${indentation}--font-${role.role}-weight: ${role.fontWeight};`,
      `${indentation}--font-${role.role}-line-height: ${role.lineHeight};`,
      `${indentation}--font-${role.role}-letter-spacing: ${formatPx(role.letterSpacingPx)};`,
    ];
  });

  return [...stepLines, ...roleLines];
}

export function formatTypeScaleCssExport(scale: TypeScale): string {
  return [
    ":root {",
    `  --font-family-base: ${scale.fontFamily};`,
    ...tokenLines(scale),
    "}",
  ].join("\n");
}

export function formatTypeScaleTailwindExport(scale: TypeScale): string {
  return [
    "@theme {",
    `  --font-family-base: ${scale.fontFamily};`,
    ...tokenLines(scale),
    "}",
  ].join("\n");
}
