import type { SemanticRole } from "@blueprint/ui";

export const MIN_STEP_COUNT = 3;
export const MAX_STEP_COUNT = 24;

export interface RoleStyle {
  fontWeight: number;
  lineHeight: number;
  letterSpacingPx: number;
}

export type RoleStyleMap = Record<SemanticRole, RoleStyle>;

export type TypographySection = "editor" | "preview";
