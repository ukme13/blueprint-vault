import type { TypographyTextTransform } from "./responsive-types";

/**
 * The merged typography model.
 *
 * It replaces two models that disagreed: the main studio's six fixed roles with
 * a single font, and the Ferre studio's arbitrary grouped roles with several.
 * They also differed in origin — Ferre's sizes are authored, the main studio's
 * are generated from a ratio — so a role here can do either.
 */

export type TypeRoleGroup =
  "display" | "heading" | "subtitle" | "body" | "supporting";

export const TYPE_ROLE_GROUPS: TypeRoleGroup[] = [
  "display",
  "heading",
  "subtitle",
  "body",
  "supporting",
];

export const TYPE_ROLE_GROUP_LABELS: Record<TypeRoleGroup, string> = {
  display: "Display",
  heading: "Heading",
  subtitle: "Subtitle",
  body: "Body",
  supporting: "Supporting",
};

/** Where a font's families come from, which decides how they are loaded. */
export type TypeFontSource = "google" | "local" | "system";

export interface TypeFont {
  id: string;
  name: string;
  /**
   * Ordered family stack. CSS falls back per glyph, so a Latin display face
   * followed by a Thai face gives each script the right font with no glyph
   * detection of our own.
   */
  families: string[];
  source: TypeFontSource;
}

export interface TypeRoleValue {
  fontSizePx: number;
  lineHeight: number;
  letterSpacingPx: number;
}

export interface TypeRole {
  id: string;
  name: string;
  group: TypeRoleGroup;
  /** Semantic element. Stored, not inferred — see defaultElementForRole. */
  element: string;
  fontId: string;
  fontWeight: number;
  textTransform: TypographyTextTransform;
  /**
   * Step in the generated scale, or null when the size is hand-set.
   *
   * Storing the link rather than a copy of the size is what lets the ratio keep
   * driving roles that have not been overridden, without reverting ones that
   * have.
   */
  step: number | null;
  desktop: TypeRoleValue;
  mobile: TypeRoleValue;
}

export interface TypeSystem {
  id: string;
  name: string;
  baseFontSizePx: number;
  ratio: number;
  stepCount: number;
  breakpointPx: number;
  fonts: TypeFont[];
  roles: TypeRole[];
}

const HEADING_ID = /^h([1-6])$/;

/**
 * Default semantic element for a role id.
 *
 * Only a default: the element is stored on the role and can be changed. Two
 * roles can legitimately default to `h1` — `display` and `h1` both do — which is
 * why this is not treated as an authoritative mapping. A project with two `h1`s
 * is reported by validation rather than prevented here.
 */
export function defaultElementForRole(id: string): string {
  const normalized = id.trim().toLowerCase();

  if (HEADING_ID.test(normalized)) return normalized;
  if (normalized === "display" || normalized.startsWith("display")) return "h1";
  if (normalized === "label") return "label";
  if (normalized === "button") return "span";
  if (normalized === "caption" || normalized === "overline") return "small";
  return "p";
}

/** Default group for a role id, used when creating a role. */
export function defaultGroupForRole(id: string): TypeRoleGroup {
  const normalized = id.trim().toLowerCase();

  if (normalized.startsWith("display")) return "display";
  if (HEADING_ID.test(normalized)) return "heading";
  if (normalized.startsWith("subtitle")) return "subtitle";
  if (normalized.startsWith("body")) return "body";
  return "supporting";
}

/** Roles in a group, in the order they should be listed. */
export function rolesInGroup(
  system: TypeSystem,
  group: TypeRoleGroup,
): TypeRole[] {
  return system.roles.filter((role) => role.group === group);
}

/**
 * Resolve a role's font stack to a CSS font-family value.
 *
 * Families containing a space are quoted, which is what makes a stack like
 * `Noto Sans Thai` valid CSS rather than three bare identifiers.
 */
export function fontFamilyValue(system: TypeSystem, role: TypeRole): string {
  const font = system.fonts.find((candidate) => candidate.id === role.fontId);
  if (!font || font.families.length === 0) return "inherit";

  return font.families
    .map((family) =>
      /^[a-zA-Z][a-zA-Z0-9-]*$/.test(family) ? family : `"${family}"`,
    )
    .join(", ");
}

/** Next free id in a group, so adding a body role yields body-2 then body-3. */
export function nextRoleId(system: TypeSystem, group: TypeRoleGroup): string {
  if (group === "heading") {
    for (let level = 1; level <= 6; level += 1) {
      const id = `h${level}`;
      if (!system.roles.some((role) => role.id === id)) return id;
    }
    return `h6-${system.roles.length + 1}`;
  }

  const stem = group === "supporting" ? "custom" : group;
  for (let index = 1; index <= 99; index += 1) {
    const id = index === 1 && group === "display" ? stem : `${stem}-${index}`;
    if (!system.roles.some((role) => role.id === id)) return id;
  }
  return `${stem}-${system.roles.length + 1}`;
}
