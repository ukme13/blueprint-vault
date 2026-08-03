export type SemanticRole =
  | "display"
  | "heading"
  | "title"
  | "body"
  | "label"
  | "caption";

export const SEMANTIC_ROLES: SemanticRole[] = [
  "display",
  "heading",
  "title",
  "body",
  "label",
  "caption",
];

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
