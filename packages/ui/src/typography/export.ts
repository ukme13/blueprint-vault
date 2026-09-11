import { ROOT_FONT_SIZE_PX, type TypeScale, type TypeScaleUnit } from "./types";

/** Points per pixel: 72pt per inch against 96px per inch. */
const PT_PER_PX = 0.75;

function remDivisor(remRootPx: number): number {
  return Number.isFinite(remRootPx) && remRootPx > 0
    ? remRootPx
    : ROOT_FONT_SIZE_PX;
}

/**
 * Convert a stored px length into the requested output unit.
 *
 * `rem` divides by the configured root rather than the scale's own base, so a
 * scale with an 18px base correctly yields 1.125rem for body at a 16px root.
 */
export function convertLength(
  px: number,
  unit: TypeScaleUnit,
  remRootPx: number = ROOT_FONT_SIZE_PX,
): number {
  switch (unit) {
    case "rem":
      return px / remDivisor(remRootPx);
    case "pt":
      return px * PT_PER_PX;
    case "px":
      return px;
  }
}

/** Format a stored px length for output, trimming trailing zeros. */
export function formatLength(
  px: number,
  unit: TypeScaleUnit,
  remRootPx: number = ROOT_FONT_SIZE_PX,
): string {
  return `${Number(convertLength(px, unit, remRootPx).toFixed(4))}${unit}`;
}

/**
 * Name the rem contract when the root is not the browser default.
 *
 * The file does not emit `html { font-size }`. Rem exists so the reader's
 * setting still works; writing the root would freeze it. A non-default
 * value is a note to whoever installs the tokens, not a rule for their
 * document.
 */
export function remRootContractComment(
  unit: TypeScaleUnit,
  remRootPx: number = ROOT_FONT_SIZE_PX,
): string | null {
  if (unit !== "rem" || remRootPx === ROOT_FONT_SIZE_PX) return null;
  return `/* Lengths in rem assume html { font-size: ${remRootPx}px }. */`;
}

/**
 * Convert stored tracking to em relative to the size it ships against.
 *
 * Letter-spacing that stays in px (or rem, or pt) is a fixed gap while the
 * size interpolates. `em` tracks the computed font-size, which is what the
 * optical value was for.
 */
export function letterSpacingEm(
  letterSpacingPx: number,
  fontSizePx: number,
): number {
  if (fontSizePx === 0) return 0;
  return letterSpacingPx / fontSizePx;
}

/** Format stored tracking as em, trimming trailing zeros. */
export function formatLetterSpacing(
  letterSpacingPx: number,
  fontSizePx: number,
): string {
  return `${Number(letterSpacingEm(letterSpacingPx, fontSizePx).toFixed(4))}em`;
}

function tokenLines(
  scale: TypeScale,
  unit: TypeScaleUnit,
  remRootPx: number,
  indentation = "  ",
): string[] {
  const stepLines = scale.steps.map(
    (step) =>
      `${indentation}--font-size-${step.step}: ${formatLength(step.fontSizePx, unit, remRootPx)};`,
  );

  const roleLines = scale.roles.flatMap((role) => {
    const step = scale.steps.find((candidate) => candidate.step === role.step)!;
    return [
      `${indentation}--font-${role.role}-size: ${formatLength(step.fontSizePx, unit, remRootPx)};`,
      `${indentation}--font-${role.role}-weight: ${role.fontWeight};`,
      `${indentation}--font-${role.role}-line-height: ${role.lineHeight};`,
      `${indentation}--font-${role.role}-letter-spacing: ${formatLetterSpacing(role.letterSpacingPx, step.fontSizePx)};`,
    ];
  });

  return [...stepLines, ...roleLines];
}

function typeScaleBody(
  scale: TypeScale,
  unit: TypeScaleUnit,
  open: string,
  remRootPx: number,
): string {
  const comment = remRootContractComment(unit, remRootPx);
  return [
    ...(comment ? [comment] : []),
    open,
    `  --font-family-base: ${scale.fontFamily};`,
    ...tokenLines(scale, unit, remRootPx),
    "}",
  ].join("\n");
}

export function formatTypeScaleCssExport(
  scale: TypeScale,
  unit: TypeScaleUnit = "rem",
  remRootPx: number = ROOT_FONT_SIZE_PX,
): string {
  return typeScaleBody(scale, unit, ":root {", remRootPx);
}

export function formatTypeScaleTailwindExport(
  scale: TypeScale,
  unit: TypeScaleUnit = "rem",
  remRootPx: number = ROOT_FONT_SIZE_PX,
): string {
  return typeScaleBody(scale, unit, "@theme static {", remRootPx);
}
