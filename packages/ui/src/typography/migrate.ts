import type { ResponsiveTypographySystem } from "./responsive-types";
import { assignDefaultRoles, generateTypeSteps } from "./scale";
import {
  defaultElementForRole,
  defaultGroupForRole,
  type TypeRole,
  type TypeSystem,
} from "./system";
import { SEMANTIC_ROLES, type SemanticRole } from "./types";

/**
 * Migrations into the merged model.
 *
 * Two persisted shapes exist and both must survive: the main studio's six fixed
 * roles with one font, and the Ferre studio's authored roles with several.
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

/**
 * Migrate a Ferre system.
 *
 * Its sizes were authored rather than generated, so every role gets
 * `step: null` — the ratio must not start moving values a person set by hand.
 */
export function migrateFerreSystem(
  system: ResponsiveTypographySystem,
): TypeSystem {
  const roles: TypeRole[] = system.roles.map((role) => ({
    id: role.id,
    name: role.name,
    group: defaultGroupForRole(role.id),
    element: defaultElementForRole(role.id),
    fontId: role.fontFamilyId,
    fontWeight: role.fontWeight,
    textTransform: role.textTransform,
    step: null,
    desktop: { ...role.desktop },
    mobile: { ...role.mobile },
  }));

  const bodyRole =
    roles.find((role) => role.id === "body") ??
    roles.find((role) => role.group === "body");

  return {
    id: system.id,
    name: system.name,
    // Authored systems have no ratio. Record the body size as the base so the
    // scale controls have a sensible starting point if one is generated later.
    baseFontSizePx: bodyRole?.desktop.fontSizePx ?? 16,
    ratio: 1.25,
    stepCount: Math.max(roles.length, 1),
    breakpointPx: system.breakpointPx,
    fonts: system.fonts.map((font) => ({
      id: font.id,
      name: font.name,
      families: splitFontFamily(font.value),
      source: "system" as const,
    })),
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
