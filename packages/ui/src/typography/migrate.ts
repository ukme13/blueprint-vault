import { assignDefaultRoles, generateTypeSteps } from "./scale";
import { type TypeRole, type TypeSystem } from "./system";
import { SEMANTIC_ROLES, type SemanticRole } from "./types";

/**
 * Migration into the merged model.
 *
 * One persisted shape predates it: the studio's six fixed roles with a single
 * font family.
 */

const LEGACY_FONT_ID = "base";

/**
 * Element each of the six legacy roles was already rendering as.
 *
 * Preserved exactly so a migrated project looks the same as before. This is the
 * mapping from roles.ts, which deliberately gives only `display` an h1.
 */
const LEGACY_ELEMENTS: Record<SemanticRole, string> = {
  display: "h1",
  heading: "h2",
  title: "h3",
  body: "p",
  label: "label",
  caption: "small",
};

const LEGACY_GROUPS: Record<SemanticRole, TypeRole["group"]> = {
  display: "display",
  heading: "heading",
  title: "heading",
  body: "body",
  label: "supporting",
  caption: "supporting",
};

export interface LegacyTypographyProject {
  name: string;
  fontFamily: string;
  baseFontSizePx: number;
  ratio: number;
  stepCount: number;
  roleStyles: Record<
    string,
    { fontWeight: number; lineHeight: number; letterSpacingPx: number }
  >;
}

/**
 * Migrate a main-studio project.
 *
 * Role ids keep the legacy role names, so exported token names are unchanged:
 * `--font-body-size` stays `--font-body-size`.
 *
 * Every role keeps its `step`, because these sizes were generated. Mobile
 * values start equal to desktop: the legacy model had no viewport concept, and
 * inventing smaller mobile sizes would change how a saved project renders.
 */
export function migrateLegacyProject(
  project: LegacyTypographyProject,
): TypeSystem {
  const steps = generateTypeSteps(
    project.baseFontSizePx,
    project.ratio,
    project.stepCount,
  );
  /* The same assignment the studio uses, so a migrated project keeps the exact
     step each role was already on. */
  const assignments = assignDefaultRoles(steps);

  const roles: TypeRole[] = SEMANTIC_ROLES.map((role) => {
    const style = project.roleStyles[role] ?? {
      fontWeight: 400,
      lineHeight: 1.4,
      letterSpacingPx: 0,
    };
    const assignment = assignments.find(
      (candidate) => candidate.role === role,
    )!;
    const stepNumber = assignment.step;
    const step = steps.find((candidate) => candidate.step === stepNumber);
    const value = {
      fontSizePx: step?.fontSizePx ?? project.baseFontSizePx,
      lineHeight: style.lineHeight,
      letterSpacingPx: style.letterSpacingPx,
    };

    return {
      id: role,
      name: role,
      group: LEGACY_GROUPS[role],
      element: LEGACY_ELEMENTS[role],
      fontId: LEGACY_FONT_ID,
      fontWeight: style.fontWeight,
      textTransform: "none" as const,
      step: stepNumber,
      desktop: value,
      mobile: { ...value },
    };
  });

  return {
    id: "migrated-type-scale",
    name: project.name,
    baseFontSizePx: project.baseFontSizePx,
    ratio: project.ratio,
    stepCount: project.stepCount,
    breakpointPx: 768,
    fonts: [
      {
        id: LEGACY_FONT_ID,
        name: "Base",
        families: splitFontFamily(project.fontFamily),
        source: "system",
      },
    ],
    roles,
  };
}

/** Split a CSS font-family string into an ordered stack, dropping quotes. */
export function splitFontFamily(value: string): string[] {
  return value
    .split(",")
    .map((family) => family.trim().replace(/^["']|["']$/g, ""))
    .filter((family) => family.length > 0);
}
