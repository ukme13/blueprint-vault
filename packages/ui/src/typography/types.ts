export type SemanticRole =
  "display" | "heading" | "title" | "body" | "label" | "caption";

export const SEMANTIC_ROLES: SemanticRole[] = [
  "display",
  "heading",
  "title",
  "body",
  "label",
  "caption",
];

/**
 * Output unit for generated font sizes.
 *
 * The scale is always stored in px. The unit is applied at the edges — preview
 * and export — so switching units never changes the stored scale.
 */
export type TypeScaleUnit = "rem" | "px" | "pt";

export const TYPE_SCALE_UNITS: TypeScaleUnit[] = ["rem", "px", "pt"];

/**
 * Root font size that `rem` is measured against.
 *
 * This is the browser default, deliberately not the scale's own base size: a
 * scale with an 18px base should read as 1.125rem for body, not 1rem. A
 * project may pick a different root; conversion still happens at the edges,
 * and the CSS never writes `html { font-size }` — that would freeze the
 * reader's own setting. A non-default root is a contract with whoever
 * installs the file.
 */
export const ROOT_FONT_SIZE_PX = 16;

/** Smallest html root the rem field will accept. 10px is the 62.5% trick. */
export const MIN_REM_ROOT_PX = 10;

/** Largest html root the rem field will accept. */
export const MAX_REM_ROOT_PX = 24;

/** Clamp a stored or typed rem root onto the allowed integer range. */
export function clampRemRootPx(value: number): number {
  if (!Number.isFinite(value)) return ROOT_FONT_SIZE_PX;
  return Math.min(
    MAX_REM_ROOT_PX,
    Math.max(MIN_REM_ROOT_PX, Math.round(value)),
  );
}

export interface TypeStep {
  step: number;
  /**
   * Distance from the base step: 0 is base, +1 one larger, -1 one smaller.
   *
   * Roles reference this rather than `step`, because base is the midpoint of the
   * ramp and therefore moves when the step count changes. An absolute index
   * silently points at a different size after a resize; an offset does not.
   */
  offset: number;
  /** Rounded to an even number of pixels. This is the size that ships. */
  fontSizePx: number;
  /** Before rounding, so the drift from the ratio stays visible. */
  exactFontSizePx: number;
  isBase: boolean;
}

export interface RoleAssignment {
  role: SemanticRole;
  step: number;
  fontWeight: number;
  lineHeight: number;
  letterSpacingPx: number;
}

export interface TypeScaleInput {
  fontFamily: string;
  baseFontSizePx: number;
  ratio: number;
  stepCount: number;
}

export interface TypeScale {
  fontFamily: string;
  baseFontSizePx: number;
  ratio: number;
  steps: TypeStep[];
  roles: RoleAssignment[];
}

/**
 * A named modular-scale interval: the musical-interval presets Figma-style
 * ratio fields bind to.
 */
export interface ModularScalePreset {
  id: string;
  name: string;
  ratio: number;
}

export interface TypeScaleRatioPreset extends ModularScalePreset {
  description: string;
}
