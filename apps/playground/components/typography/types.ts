import type { PreviewTemplateId, SemanticRole } from "@blueprint/ui";

export const MIN_STEP_COUNT = 3;
export const MAX_STEP_COUNT = 24;

export interface RoleStyle {
  fontWeight: number;
  lineHeight: number;
  letterSpacingPx: number;
}

export type RoleStyleMap = Record<SemanticRole, RoleStyle>;

export type TypographySection = "editor" | "specimen" | "preview";

/** How a view tab is stored on the project. Editor does not change it. */
export function storedTemplateForSection(
  section: TypographySection,
): PreviewTemplateId | null {
  if (section === "specimen") return "specimen";
  if (section === "preview") return "article";
  return null;
}
