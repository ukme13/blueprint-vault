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
 * scale with an 18px base should read as 1.125rem for body, not 1rem.
 */
export const ROOT_FONT_SIZE_PX = 16;

export interface TypeStep {
  step: number;
  fontSizePx: number;
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

export interface TypeScaleRatioPreset {
  id: string;
  name: string;
  ratio: number;
  description: string;
}
