import type { TypeStep } from "./types";
/**
 * The merged typography model.
 *
 * It replaces two models that disagreed: the main studio's six fixed roles with
 * a single font, and the Ferre studio's arbitrary grouped roles with several.
 * They also differed in origin — Ferre's sizes are authored, the main studio's
 * are generated from a ratio — so a role here can do either.
 */

/** Casing applied to a role. Lives with the model that uses it. */
export type TypographyTextTransform = "none" | "uppercase" | "capitalize";

export const TEXT_TRANSFORMS: TypographyTextTransform[] = [
  "none",
  "uppercase",
  "capitalize",
];

/**
 * How a group names its roles.
 *
 * `none` exists because not every style is a family: a project may want exactly
 * one caption, and forcing it to be `caption-1` is noise.
 */
/**
 * How a group names its roles.
 *
 * A group holding a single role drops the index entirely — one caption is
 * `caption`, not `caption-1` — so "single" is a consequence of the count rather
 * than a mode the user has to pick.
 */
export type TypeIndexing = "number" | "size";

export const TYPE_INDEXING_LABELS: Record<TypeIndexing, string> = {
  number: "Number",
  size: "Size",
};

/** Shirt sizes, small to large, used by `size` indexing. */
export const SIZE_INDEX = ["xs", "sm", "md", "lg", "xl"] as const;

/** Heading is always h1–h6, so it never grows past six. */
export const MAX_HEADING_LEVEL = 6;

export interface TypeGroup {
  id: string;
  label: string;
  /** Fixed groups cannot be removed or reordered. Only heading and body. */
  isFixed: boolean;
  indexing: TypeIndexing;
}

export const HEADING_GROUP_ID = "heading";
export const BODY_GROUP_ID = "body";

/** The two groups every system has. */
export function defaultGroups(): TypeGroup[] {
  return [
    {
      id: HEADING_GROUP_ID,
      label: "Heading",
      isFixed: true,
      indexing: "number",
    },
    { id: BODY_GROUP_ID, label: "Body", isFixed: true, indexing: "number" },
  ];
}

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
  groupId: string;
  /**
   * Semantic element. Ignored for the heading group, which derives h1–h6 from
   * the role's position.
   */
  element: string;
  fontId: string;
  fontWeight: number;
  textTransform: TypographyTextTransform;
  /**
   * Distance from the base step, or null when the size is hand-set.
   *
   * An offset rather than an index: base is the midpoint of the ramp, so an
   * absolute index points at a different size as soon as the step count changes.
   */
  stepOffset: number | null;
  /**
   * Follow another role's size. Most component styles are "body with a small
   * adjustment", and recording that intent keeps them in step when body moves.
   */
  sameAsRoleId: string | null;
  desktop: TypeRoleValue;
  mobile: TypeRoleValue;
}

export interface TypeSystem {
  id: string;
  groups: TypeGroup[];
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
 * Only a default: the element is stored on the role and can be changed, except
 * in the heading group where it is derived and not offered.
 */
export function defaultElementForRole(id: string): string {
  const normalized = id.trim().toLowerCase();

  if (HEADING_ID.test(normalized)) return normalized;
  if (normalized.startsWith("display")) return "h2";
  if (normalized.startsWith("label")) return "label";
  if (normalized.startsWith("button")) return "span";
  if (normalized.startsWith("caption") || normalized.startsWith("overline")) {
    return "small";
  }
  return "p";
}

/** Roles in a group, in insertion order. */
export function rolesInGroup(system: TypeSystem, groupId: string): TypeRole[] {
  return system.roles.filter((role) => role.groupId === groupId);
}

export function findGroup(
  system: TypeSystem,
  groupId: string,
): TypeGroup | undefined {
  return system.groups.find((group) => group.id === groupId);
}

/** Most roles a group can hold, which its indexing decides. */
export function groupCapacity(group: TypeGroup): number {
  if (group.id === HEADING_GROUP_ID) return MAX_HEADING_LEVEL;
  return group.indexing === "size" ? SIZE_INDEX.length : 99;
}

/**
 * The ids a group's roles should have, given how many there are.
 *
 * A single role drops the index — one caption is `caption` — because a lone
 * `caption-1` reads as the first of a family that does not exist. Heading is
 * exempt: `h1` is the name, not an index onto one.
 */
export function roleIdsForGroup(group: TypeGroup, count: number): string[] {
  if (group.id === HEADING_GROUP_ID) {
    return Array.from({ length: count }, (_, index) => `h${index + 1}`);
  }
  if (count === 1) return [group.id];
  if (group.indexing === "size") {
    return Array.from(
      { length: count },
      (_, index) => `${group.id}-${SIZE_INDEX[index] ?? index + 1}`,
    );
  }
  return Array.from(
    { length: count },
    (_, index) => `${group.id}-${index + 1}`,
  );
}

/** Whether a group can take another role. */
export function canAddRole(system: TypeSystem, group: TypeGroup): boolean {
  return rolesInGroup(system, group.id).length < groupCapacity(group);
}

/**
 * Rename a group's roles to match its indexing and its current size.
 *
 * Adding a second role to a group turns `caption` into `caption-1`, so any role
 * following it by id has to be repointed. Exported token names follow role ids,
 * so this does rename tokens — the alternative is a group whose members are
 * named inconsistently, which is worse to live with.
 */
export function reindexGroup(system: TypeSystem, groupId: string): TypeSystem {
  const group = findGroup(system, groupId);
  if (!group) return system;

  const members = rolesInGroup(system, groupId);
  const wanted = roleIdsForGroup(group, members.length);

  const renames = new Map<string, string>();
  members.forEach((role, index) => {
    const next = wanted[index];
    if (next && next !== role.id) renames.set(role.id, next);
  });
  if (renames.size === 0) return system;

  return {
    ...system,
    roles: system.roles.map((role) => {
      const renamed = renames.get(role.id);
      const following = role.sameAsRoleId
        ? (renames.get(role.sameAsRoleId) ?? role.sameAsRoleId)
        : null;
      return {
        ...role,
        id: renamed ?? role.id,
        name: renamed && role.name === role.id ? renamed : role.name,
        element:
          renamed && groupId === HEADING_GROUP_ID ? renamed : role.element,
        sameAsRoleId: following,
      };
    }),
  };
}

/**
 * Move a free group up or down. Fixed groups do not move, and nothing may be
 * placed such that a fixed group changes position.
 */
export function moveGroup(
  system: TypeSystem,
  groupId: string,
  direction: -1 | 1,
): TypeGroup[] {
  const groups = [...system.groups];
  const index = groups.findIndex((group) => group.id === groupId);
  const target = index + direction;
  if (index === -1 || target < 0 || target >= groups.length) return groups;
  if (groups[index]!.isFixed || groups[target]!.isFixed) return groups;

  [groups[index], groups[target]] = [groups[target]!, groups[index]!];
  return groups;
}

/**
 * Resolve a role's font size in px.
 *
 * Precedence: follow another role, else a step offset, else the value already
 * stored. `seen` breaks a cycle if two roles somehow point at each other.
 */
export function resolveRoleSizePx(
  system: TypeSystem,
  steps: TypeStep[],
  role: TypeRole,
  viewport: "desktop" | "mobile" = "desktop",
  seen: Set<string> = new Set(),
): number {
  if (role.sameAsRoleId && !seen.has(role.id)) {
    seen.add(role.id);
    const target = system.roles.find(
      (candidate) => candidate.id === role.sameAsRoleId,
    );
    if (target) {
      return resolveRoleSizePx(system, steps, target, viewport, seen);
    }
  }

  if (role.stepOffset !== null) {
    const step = steps.find(
      (candidate) => candidate.offset === role.stepOffset,
    );
    if (step) return step.fontSizePx;
  }

  return role[viewport].fontSizePx;
}

/**
 * Resolve a role's font stack to a CSS font-family value.
 *
 * Families that are not valid CSS identifiers are quoted, which is what makes a
 * stack like `Noto Sans Thai` valid rather than three bare identifiers.
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
