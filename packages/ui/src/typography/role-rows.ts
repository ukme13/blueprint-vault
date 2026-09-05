import { findGoogleFont } from "./google-fonts";
import { generateTypeSteps } from "./scale";
import { typeTokenId } from "./system-export";
import {
  elementForRole,
  familiesToCss,
  resolveLineHeight,
  resolveRoleSizePx,
  type RoleElement,
  type TypeFont,
  type TypeRole,
  type TypeSystem,
} from "./system";
import type { TypeStep } from "./types";

/**
 * A type system as rows something can render.
 *
 * The sibling of `color/token-rows.ts`, and here for the same reason. The
 * studio's role table and the documentation's typography page describe one
 * system and would otherwise each decide what a row is: which size a role
 * actually ends up at, what element it renders as, which variables a developer
 * installs it under. Three rules, and three chances for the two pages to
 * disagree about a system they are both describing.
 *
 * Every name on a row comes from `typeTokenId`, which is the function
 * `system-export.ts` uses to write the file. A page that built
 * `--font-h1-size` from its own `toLowerCase` would agree with the export
 * until somebody named a role "Body Large", and then a developer would copy a
 * variable off the page that resolves to nothing.
 *
 * See docs/roadmap/foundations-handover.md.
 */

/**
 * A role's size, resolved rather than stored.
 *
 * The stored `fontSizePx` is only a role's own answer when somebody unlinked
 * it by typing a size. A role linked to a step keeps whatever was in the field
 * when it was last written, and the studio resolves on read and never writes
 * back — so in the reference workspace every role is stored at 16 with a
 * different step offset. Anything that prints the stored number shows eight
 * roles at one size and calls it a scale.
 *
 * Each viewport is resolved against its own value rather than desktop's being
 * copied into both. For a linked role that changes nothing, because both
 * viewports share the offset; for a role somebody authored at two sizes it is
 * the difference between keeping their mobile size and silently replacing it
 * with the desktop one. The studio's own version of this loop copied desktop
 * across, which was invisible there because it only ever renders desktop, and
 * became a regression the moment the export started calling it.
 */
export function resolveSystemRoles(system: TypeSystem): TypeRole[] {
  const steps = generateTypeSteps(
    system.baseFontSizePx,
    system.ratio,
    system.stepCount,
  );
  return system.roles.map((role) => ({
    ...role,
    desktop: {
      ...role.desktop,
      fontSizePx: resolveRoleSizePx(system, steps, role, "desktop"),
    },
    mobile: {
      ...role.mobile,
      fontSizePx: resolveRoleSizePx(system, steps, role, "mobile"),
    },
  }));
}

/** The variables the export emits for one role. */
export interface TypeRoleVariables {
  family: string;
  size: string;
  lineHeight: string;
  letterSpacing: string;
  weight: string;
  transform: string;
}

export function typeRoleVariables(roleId: string): TypeRoleVariables {
  const id = typeTokenId(roleId);
  return {
    family: `--font-${id}-family`,
    size: `--font-${id}-size`,
    lineHeight: `--font-${id}-line-height`,
    letterSpacing: `--font-${id}-letter-spacing`,
    weight: `--font-${id}-weight`,
    transform: `--font-${id}-transform`,
  };
}

/** The variable a font entry's stack is emitted under. */
export function typeFontVariable(fontId: string): string {
  return `--font-family-${typeTokenId(fontId)}`;
}

/**
 * Where a font's primary family comes from, as a page has to say it.
 *
 * `google` can be loaded and rendered. `system` is whatever the reader happens
 * to have installed, which may be nothing. `local` is a file somebody uploaded
 * to the studio, and the file is not in the workspace — the project stores
 * names only, by the uploaded-fonts rule that a missing file is a normal state
 * rather than an error. A page renders what it can and says which is which,
 * because a specimen silently drawn in a fallback is a specimen that lies.
 */
export type TypeFontAvailability = "google" | "system" | "local";

export interface TypeFontRow {
  id: string;
  name: string;
  families: string[];
  /** The stack as the browser will read it, quoted where CSS needs it. */
  stack: string;
  /** The variable the export emits this stack under. */
  variable: string;
  /** The first family, which is the one a specimen is judged on. */
  primary: string;
  availability: TypeFontAvailability;
  /** Google families in the stack, in order, for a stylesheet request. */
  googleFamilies: string[];
}

export function typeFontRows(system: TypeSystem): TypeFontRow[] {
  return system.fonts.map((font) => ({
    id: font.id,
    name: font.name,
    families: font.families,
    stack: familiesToCss(font.families),
    variable: typeFontVariable(font.id),
    primary: font.families[0] ?? "",
    availability: fontAvailability(font),
    googleFamilies: font.families.filter(
      (family) => findGoogleFont(family) !== undefined,
    ),
  }));
}

function fontAvailability(font: TypeFont): TypeFontAvailability {
  const primary = font.families[0];
  if (primary && findGoogleFont(primary)) return "google";
  /* The slot's own record, not a guess from the name. A local file and a
     system family are indistinguishable from the family string alone, and the
     difference is exactly what the page has to tell a reader. */
  return font.sources.primary === "local" ? "local" : "system";
}

/** One role, resolved, as a table row and a specimen both read it. */
export interface TypeRoleRow {
  id: string;
  name: string;
  groupId: string;
  groupLabel: string;
  /** The HTML element the role renders as. */
  element: RoleElement;
  /** The font entry's name, e.g. "Main". */
  fontName: string;
  /** The stack as the browser will read it. */
  fontStack: string;
  fontSizePx: number;
  /**
   * The size before rounding, when rounding moved it.
   *
   * Null when the role is hand-set or the exact value already landed on a
   * whole even pixel. A page showing "25" beside every "24" would be noise;
   * showing it only where the ratio was overruled is the point — the scale is
   * a guide once it has been rounded, and the drift should never be a
   * surprise.
   */
  exactFontSizePx: number | null;
  /** Unitless, as the export writes it. */
  lineHeight: number;
  lineHeightPx: number;
  fontWeight: number;
  letterSpacingPx: number;
  textTransform: string;
  /** Distance from base, or null when the size is hand-set. */
  stepOffset: number | null;
  variables: TypeRoleVariables;
}

export interface TypeRoleRowGroup {
  id: string;
  label: string;
  rows: TypeRoleRow[];
}

/**
 * Every role, grouped the way the system groups them.
 *
 * Group order is the system's own, and a role's place inside its group is
 * where somebody put it — the same rule `groupSemanticTokens` follows next
 * door, and the same rule the export writes. A group with no roles is dropped;
 * an empty heading on a documentation page describes nothing.
 */
export function typeRoleRowGroups(
  system: TypeSystem,
  viewport: "desktop" | "mobile" = "desktop",
): TypeRoleRowGroup[] {
  const resolved = resolveSystemRoles(system);
  const steps = generateTypeSteps(
    system.baseFontSizePx,
    system.ratio,
    system.stepCount,
  );
  const fonts = new Map(typeFontRows(system).map((font) => [font.id, font]));

  return system.groups
    .map((group) => ({
      id: group.id,
      label: group.label,
      rows: resolved
        .filter((role) => role.groupId === group.id)
        .map((role) => roleRow(system, role, steps, fonts, viewport)),
    }))
    .filter((group) => group.rows.length > 0);
}

function roleRow(
  system: TypeSystem,
  role: TypeRole,
  steps: TypeStep[],
  fonts: Map<string, TypeFontRow>,
  viewport: "desktop" | "mobile",
): TypeRoleRow {
  const value = role[viewport];
  const font = fonts.get(role.fontId);
  const { computedLineHeightRatio, computedLineHeightPx } = resolveLineHeight(
    role,
    viewport,
  );

  return {
    id: role.id,
    name: role.name,
    groupId: role.groupId,
    groupLabel:
      system.groups.find((group) => group.id === role.groupId)?.label ??
      role.groupId,
    element: elementForRole(system, role),
    fontName: font?.name ?? role.fontId,
    fontStack: font?.stack ?? "inherit",
    fontSizePx: value.fontSizePx,
    exactFontSizePx: exactSizeIfRounded(role, steps),
    lineHeight: computedLineHeightRatio,
    lineHeightPx: computedLineHeightPx,
    fontWeight: role.fontWeight,
    letterSpacingPx: value.letterSpacingPx,
    textTransform: role.textTransform,
    stepOffset: role.stepOffset,
    variables: typeRoleVariables(role.id),
  };
}

/**
 * The exact size, only where rounding actually moved it.
 *
 * A hand-set size has no exact value to differ from: it is the number
 * somebody typed, and rounding applies to sizes the scale generates rather
 * than to decisions a person made.
 */
function exactSizeIfRounded(role: TypeRole, steps: TypeStep[]): number | null {
  if (role.stepOffset === null) return null;
  const step = steps.find((candidate) => candidate.offset === role.stepOffset);
  if (!step) return null;
  /* A hair of tolerance rather than !==, because an exact value that lands on
     a whole pixel arrives through a pow() and may be 24.000000000000004. */
  return Math.abs(step.exactFontSizePx - step.fontSizePx) > 0.005
    ? step.exactFontSizePx
    : null;
}

/** The scale itself: what generated the sizes above. */
export interface TypeScaleSummary {
  baseFontSizePx: number;
  ratio: number;
  stepCount: number;
  breakpointPx: number;
  steps: TypeStep[];
}

export function typeScaleSummary(system: TypeSystem): TypeScaleSummary {
  return {
    baseFontSizePx: system.baseFontSizePx,
    ratio: system.ratio,
    stepCount: system.stepCount,
    breakpointPx: system.breakpointPx,
    steps: generateTypeSteps(
      system.baseFontSizePx,
      system.ratio,
      system.stepCount,
    ),
  };
}
