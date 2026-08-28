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
  indexing: TypeIndexing;
}

/**
 * A group named `h` numbers its roles without a separator.
 *
 * `h1` is a name, not `h` indexed by 1, so the dash a group like `body-1` needs
 * would be wrong here. It also caps at six, because there is no h7.
 */
export const HEADING_GROUP_ID = "h";
export const BODY_GROUP_ID = "body";
export const DISPLAY_GROUP_ID = "display";

/** The expressive brand font, and the readable one everything else uses. */
export const DISPLAY_FONT_ID = "display";
export const MAIN_FONT_ID = "main";

/** Groups a new or reset scale starts with. None is special afterwards. */
export function defaultGroups(): TypeGroup[] {
  return [
    { id: DISPLAY_GROUP_ID, label: "Display", indexing: "number" },
    { id: HEADING_GROUP_ID, label: "H", indexing: "number" },
    { id: BODY_GROUP_ID, label: "Body", indexing: "number" },
  ];
}

/**
 * The system a new or reset scale starts from: six headings and one body.
 *
 * Both are ordinary groups afterwards — renameable, removable, reorderable.
 */
export function defaultSystem(
  name: string,
  fontFamilies: string[],
  baseFontSizePx: number,
  ratio: number,
  stepCount: number,
): TypeSystem {
  const groups = defaultGroups();
  const value = (fontSizePx: number, lineHeight: number) => ({
    fontSizePx,
    lineHeight,
    letterSpacingPx: 0,
  });

  /* One display role, not six. A full parallel set to h1-h6 would start every
     project with thirteen roles, and most use one or two display sizes. */
  const display: TypeRole = {
    id: "display-1",
    name: "display-1",
    groupId: DISPLAY_GROUP_ID,
    fontId: DISPLAY_FONT_ID,
    fontWeight: 700,
    textTransform: "none",
    stepOffset: 6,
    sameAsRoleId: null,
    desktop: value(baseFontSizePx, 1.1),
    mobile: value(baseFontSizePx, 1.1),
  };

  const headings: TypeRole[] = Array.from({ length: 6 }, (_, index) => ({
    id: `h${index + 1}`,
    name: `h${index + 1}`,
    groupId: HEADING_GROUP_ID,
    /* Headings use the main font: a blog still needs a readable h1, and the
       display font is chosen for character rather than legibility. */
    fontId: MAIN_FONT_ID,
    fontWeight: 700,
    textTransform: "none",
    /* Largest heading at the top of the ramp, stepping down to base. */
    stepOffset: Math.max(6 - index, 0),
    sameAsRoleId: null,
    desktop: value(baseFontSizePx, 1.2),
    mobile: value(baseFontSizePx, 1.2),
  }));

  const body: TypeRole = {
    id: "body",
    name: "body",
    groupId: BODY_GROUP_ID,
    fontId: MAIN_FONT_ID,
    fontWeight: 400,
    textTransform: "none",
    stepOffset: 0,
    sameAsRoleId: null,
    desktop: value(baseFontSizePx, 1.5),
    mobile: value(baseFontSizePx, 1.5),
  };

  return {
    id: "type-system",
    name,
    groups,
    baseFontSizePx,
    ratio,
    stepCount,
    breakpointPx: 768,
    fonts: [
      {
        id: DISPLAY_FONT_ID,
        name: "Display",
        families: fontFamilies,
        source: "system",
      },
      {
        id: MAIN_FONT_ID,
        name: "Main",
        families: fontFamilies,
        source: "system",
      },
    ],
    roles: [display, ...headings, body],
  };
}

/** Whether a group names its roles without a separator, as `h` does. */
export function isHeadingGroup(group: Pick<TypeGroup, "id">): boolean {
  return group.id.trim().toLowerCase() === HEADING_GROUP_ID;
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

/** A role id that names an HTML heading level. */
const HEADING_ID = /^h[1-6]$/;

/**
 * Semantic element for a role, derived rather than stored.
 *
 * The heading group is h1 to h6 by position; everything else is a paragraph.
 * A stored, editable element was a control nobody needed: headings already know
 * their level, and every other role is a visual style applied to body copy.
 */
export function elementForRole(_system: TypeSystem, role: TypeRole): string {
  /* Read from the id rather than the group, so renaming or moving a group
     never changes what a role renders as. */
  return HEADING_ID.test(role.id) ? role.id : "p";
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
  if (isHeadingGroup(group)) return MAX_HEADING_LEVEL;
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
  if (isHeadingGroup(group)) {
    /* No separator, and always numbered: h1 is the name, so a lone heading is
       still h1 rather than a bare h. */
    return Array.from(
      { length: count },
      (_, index) => `${group.id}${index + 1}`,
    );
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
        sameAsRoleId: following,
      };
    }),
  };
}

/** Turn a label into an id: lowercase, words joined by a single dash. */
export function slugify(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Rename a group, and rename its roles with it.
 *
 * Role ids are built from the group id, so a group called Caption holding a
 * role called `caption` has to become `overline` when renamed — otherwise the
 * label and the exported token names drift apart.
 */
export function renameGroup(
  system: TypeSystem,
  groupId: string,
  label: string,
): TypeSystem {
  const group = findGroup(system, groupId);
  if (!group) return system;

  const wanted = slugify(label);
  let nextId = wanted || groupId;
  let suffix = 2;
  while (
    nextId !== groupId &&
    system.groups.some((candidate) => candidate.id === nextId)
  ) {
    nextId = `${wanted}-${suffix}`;
    suffix += 1;
  }

  const renamed: TypeSystem = {
    ...system,
    groups: system.groups.map((candidate) =>
      candidate.id === groupId
        ? { ...candidate, id: nextId, label }
        : candidate,
    ),
    roles: system.roles.map((role) =>
      role.groupId === groupId ? { ...role, groupId: nextId } : role,
    ),
  };

  return reindexGroup(renamed, nextId);
}

/** Move a group up or down. */
export function moveGroup(
  system: TypeSystem,
  groupId: string,
  direction: -1 | 1,
): TypeGroup[] {
  const groups = [...system.groups];
  const index = groups.findIndex((group) => group.id === groupId);
  const target = index + direction;
  if (index === -1 || target < 0 || target >= groups.length) return groups;

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
