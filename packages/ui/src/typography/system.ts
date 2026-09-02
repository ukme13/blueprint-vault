import {
  computeLineHeight,
  FALLBACK_AUTO_LINE_HEIGHT_RATIO,
  type ComputedLineHeight,
  type LineHeightConfig,
} from "./line-height";
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
  /* `auto` rather than the ratio each group used to be given literally.
     AUTO_LINE_HEIGHT_RATIOS holds the same numbers, so a new system renders
     identically — but the roles now follow their group when the size moves,
     and land on the 4px grid on the way. */
  const value = (fontSizePx: number): TypeRoleValue => ({
    fontSizePx,
    lineHeight: { mode: "auto" },
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
    desktop: value(baseFontSizePx),
    mobile: value(baseFontSizePx),
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
    desktop: value(baseFontSizePx),
    mobile: value(baseFontSizePx),
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
    desktop: value(baseFontSizePx),
    mobile: value(baseFontSizePx),
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
        sources: { primary: "system" },
      },
      {
        id: MAIN_FONT_ID,
        name: "Main",
        families: fontFamilies,
        sources: { primary: "system" },
      },
    ],
    roles: [display, ...headings, body],
  };
}

/** Id for a new font entry, unique within the system. */
export function nextFontId(system: TypeSystem): string {
  for (let index = 2; index <= 99; index += 1) {
    const id = `font-${index}`;
    if (!system.fonts.some((font) => font.id === id)) return id;
  }
  return `font-${system.fonts.length + 1}`;
}

/**
 * Add a font entry.
 *
 * Entries are what a role points at — a display face and a readable one, say.
 * The stack inside each entry is a different axis: which family covers which
 * script.
 */
export function addFont(system: TypeSystem, name?: string): TypeSystem {
  const id = nextFontId(system);
  const template = system.fonts[0];
  return {
    ...system,
    fonts: [
      ...system.fonts,
      {
        id,
        name: name ?? `Font ${system.fonts.length + 1}`,
        /* Starts from the first entry's stack rather than empty, so a new font
           renders something immediately and can be changed from there. */
        families: template ? [...template.families] : ["sans-serif"],
        sources: { ...(template?.sources ?? { primary: "system" }) },
      },
    ],
  };
}

/**
 * Remove a font entry, moving any role that used it onto the first survivor.
 *
 * The last entry cannot go: a role with no font has nothing to render with.
 */
export function removeFont(system: TypeSystem, fontId: string): TypeSystem {
  if (system.fonts.length <= 1) return system;
  const remaining = system.fonts.filter((font) => font.id !== fontId);
  if (remaining.length === system.fonts.length) return system;

  const fallback = remaining[0]!.id;
  return {
    ...system,
    fonts: remaining,
    roles: system.roles.map((role) =>
      role.fontId === fontId ? { ...role, fontId: fallback } : role,
    ),
  };
}

/** Rename a font entry. Ids are stable, so exported tokens do not move. */
export function renameFont(
  system: TypeSystem,
  fontId: string,
  name: string,
): TypeSystem {
  return {
    ...system,
    fonts: system.fonts.map((font) =>
      font.id === fontId ? { ...font, name } : font,
    ),
  };
}

/** Whether a group names its roles without a separator, as `h` does. */
export function isHeadingGroup(group: Pick<TypeGroup, "id">): boolean {
  return group.id.trim().toLowerCase() === HEADING_GROUP_ID;
}

/** Where a family comes from, which decides how it is loaded. */
export type TypeFontSource = "google" | "local" | "system";

/**
 * The named slots in a stack.
 *
 * A stack is a primary, up to three fallbacks, and a generic. The generic is
 * not a slot: it is appended from the primary's category rather than chosen,
 * and nobody uploads a file for `sans-serif`.
 *
 * The first fallback is `fallback` rather than `fallback1`, which is not
 * tidiness — it is what every project saved before there were three of them
 * already has, in `sources` and in the key its uploaded file is stored under.
 * Renaming it would mean a migration that moves files, and the payment for
 * that is one inconsistent name.
 */
export type FontSlot = "primary" | "fallback" | "fallback2" | "fallback3";

export const FONT_SLOTS: readonly FontSlot[] = [
  "primary",
  "fallback",
  "fallback2",
  "fallback3",
];

/** The slots behind the primary, in the order the browser tries them. */
export const FALLBACK_SLOTS: readonly FontSlot[] = FONT_SLOTS.slice(1);

/** How many families can sit behind the primary. */
export const MAX_FALLBACKS = FALLBACK_SLOTS.length;

/** Where a slot sits in the stack, counting the primary as 0. */
export function slotIndex(slot: FontSlot): number {
  return FONT_SLOTS.indexOf(slot);
}

export interface TypeFont {
  id: string;
  name: string;
  /**
   * Ordered family stack. CSS falls back per glyph, so a Latin display face
   * followed by a Thai face gives each script the right font with no glyph
   * detection of our own.
   */
  families: string[];
  /**
   * Where each named slot's family came from.
   *
   * Per slot rather than per entry. One `source` could not describe a stack
   * with an uploaded Latin face in front of a Google Thai one, which is
   * exactly the stack this studio exists to build. A slot with no family has
   * no entry here.
   */
  sources: Partial<Record<FontSlot, TypeFontSource>>;
}

export interface TypeRoleValue {
  fontSizePx: number;
  /**
   * How the line height was chosen, not what it works out to.
   *
   * A bare number here used to mean a ratio. It still reads as one —
   * `readLineHeightConfig` detects the old shape — but a role can now pin a
   * pixel height or follow its group's default instead. Ask
   * `resolveLineHeight` for the numbers.
   */
  lineHeight: LineHeightConfig;
  letterSpacingPx: number;
}

/**
 * The ratio `auto` uses, by group.
 *
 * The same numbers the default system shipped as hand-set values, which is
 * what makes `auto` the honest default rather than a new opinion. Groups are
 * user-editable, so a custom group falls back to body's.
 */
export const AUTO_LINE_HEIGHT_RATIOS: Readonly<Record<string, number>> = {
  [DISPLAY_GROUP_ID]: 1.1,
  [HEADING_GROUP_ID]: 1.2,
  [BODY_GROUP_ID]: 1.5,
};

/** The ratio a role's `auto` resolves against. */
export function autoRatioForRole(role: Pick<TypeRole, "groupId">): number {
  return (
    AUTO_LINE_HEIGHT_RATIOS[role.groupId] ?? FALLBACK_AUTO_LINE_HEIGHT_RATIO
  );
}

/**
 * A role's line height at one breakpoint, in both units.
 *
 * The one place anything outside this module should be reading a line height
 * from. Reading `role.desktop.lineHeight` directly gets the config, which is
 * an intent rather than a value.
 */
export function resolveLineHeight(
  role: TypeRole,
  breakpoint: "desktop" | "mobile" = "desktop",
): ComputedLineHeight {
  const value = role[breakpoint];
  return computeLineHeight(
    value.fontSizePx,
    value.lineHeight,
    autoRatioForRole(role),
  );
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

const HEADING_ELEMENTS = ["h1", "h2", "h3", "h4", "h5", "h6"] as const;

/** The elements a role can render as: a heading level, or a paragraph. */
export type RoleElement = (typeof HEADING_ELEMENTS)[number] | "p";

/** A role id that names an HTML heading level. */
function isHeadingElement(id: string): id is (typeof HEADING_ELEMENTS)[number] {
  return (HEADING_ELEMENTS as readonly string[]).includes(id);
}

/**
 * Semantic element for a role, derived rather than stored.
 *
 * The heading group is h1 to h6 by position; everything else is a paragraph.
 * A stored, editable element was a control nobody needed: headings already know
 * their level, and every other role is a visual style applied to body copy.
 */
export function elementForRole(
  _system: TypeSystem,
  role: TypeRole,
): RoleElement {
  /* Read from the id rather than the group, so renaming or moving a group
     never changes what a role renders as. A predicate rather than a regex, so
     the narrowing is something the compiler checked instead of a cast at every
     place the result is used as a tag name. */
  return isHeadingElement(role.id) ? role.id : "p";
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
/* The edits a studio makes to a system, as TypeSystem -> TypeSystem. They sit
   here rather than in the app because they are the same species as addFont and
   reindexGroup beside them, and several call those directly. */

export function updateRole(
  system: TypeSystem,
  id: string,
  patch: Partial<TypeRole>,
): TypeSystem {
  return {
    ...system,
    roles: system.roles.map((role) =>
      role.id === id ? { ...role, ...patch } : role,
    ),
  };
}

/** Line height and letter spacing are always per-role and never linked. */
export function updateRoleValue(
  system: TypeSystem,
  id: string,
  patch: Partial<{ lineHeight: LineHeightConfig; letterSpacingPx: number }>,
): TypeSystem {
  return {
    ...system,
    roles: system.roles.map((role) =>
      role.id === id
        ? {
            ...role,
            desktop: { ...role.desktop, ...patch },
            mobile: { ...role.mobile, ...patch },
          }
        : role,
    ),
  };
}

/** A group at capacity is returned unchanged, so callers need no guard. */
export function addRole(system: TypeSystem, group: TypeGroup): TypeSystem {
  if (!canAddRole(system, group)) return system;

  const template =
    system.roles.find((role) => role.groupId === group.id) ??
    system.roles.find((role) => role.id === BODY_GROUP_ID) ??
    system.roles[0];
  if (!template) return system;

  /* Placeholder id: reindexGroup gives every role in the group its real name,
     which is how a lone `caption` becomes `caption-1` once a second one joins
     it. */
  const placeholder = `${group.id}-new-${system.roles.length}`;
  const withRole: TypeSystem = {
    ...system,
    roles: [
      ...system.roles,
      {
        ...template,
        id: placeholder,
        name: placeholder,
        groupId: group.id,
        /* A new role reuses its sibling's step rather than claiming one of its
           own. Adding roles must never force the ramp to grow. */
        stepOffset: template.stepOffset,
        sameAsRoleId: null,
      },
    ],
  };

  return reindexGroup(withRole, group.id);
}

export function removeRole(system: TypeSystem, id: string): TypeSystem {
  const groupId = system.roles.find((role) => role.id === id)?.groupId;

  const without: TypeSystem = {
    ...system,
    roles: system.roles
      .filter((role) => role.id !== id)
      /* Anything following the removed role keeps its size rather than silently
         falling back to whatever it stored. */
      .map((role) =>
        role.sameAsRoleId === id ? { ...role, sameAsRoleId: null } : role,
      ),
  };

  return groupId ? reindexGroup(without, groupId) : without;
}

export function updateGroup(
  system: TypeSystem,
  groupId: string,
  patch: Partial<TypeGroup>,
): TypeSystem {
  const updated: TypeSystem = {
    ...system,
    groups: system.groups.map((group) =>
      group.id === groupId ? { ...group, ...patch } : group,
    ),
  };
  /* Switching a group between number and size renames its roles, so the ids
     follow the mode rather than whatever they were created under. */
  return reindexGroup(updated, groupId);
}

/** Skips any number already taken, so ids stay unique however groups were made. */
export function addGroup(system: TypeSystem): TypeSystem {
  let index = system.groups.length + 1;
  while (system.groups.some((group) => group.id === `group-${index}`)) {
    index += 1;
  }
  return {
    ...system,
    groups: [
      ...system.groups,
      { id: `group-${index}`, label: `Group ${index}`, indexing: "number" },
    ],
  };
}

/** Removes the group and the roles that belonged to it. */
export function removeGroup(system: TypeSystem, groupId: string): TypeSystem {
  return {
    ...system,
    groups: system.groups.filter((group) => group.id !== groupId),
    roles: system.roles.filter((role) => role.groupId !== groupId),
  };
}

/**
 * The CSS keywords that end a stack rather than name a face.
 *
 * Here rather than in the editor that used to hold them: deciding whether a
 * family is a real one is a question about the model, and two answers to it
 * would eventually disagree.
 */
const GENERIC_FAMILIES = new Set([
  "serif",
  "sans-serif",
  "monospace",
  "cursive",
  "fantasy",
  "system-ui",
  "ui-serif",
  "ui-sans-serif",
  "ui-monospace",
  "ui-rounded",
  "math",
  "emoji",
  "fangsong",
  "inherit",
  "initial",
  "unset",
]);

/** Whether a family is a CSS keyword rather than a face somebody chose. */
export function isGenericFamily(family: string): boolean {
  return GENERIC_FAMILIES.has(family.trim().toLowerCase());
}

/**
 * The families somebody actually chose, in slot order.
 *
 * Generics are filtered out rather than counted, because a migrated stack of
 * ["Geist Sans", "ui-sans-serif", "system-ui"] has no fallback font — reading
 * index 1 as one would claim Thai coverage that is not there.
 */
export function namedFamilies(font: Pick<TypeFont, "families">): string[] {
  return font.families.filter((family) => !isGenericFamily(family));
}

/** The family in one slot, or "" when the slot is empty. */
export function familyForSlot(
  font: Pick<TypeFont, "families">,
  slot: FontSlot,
): string {
  return namedFamilies(font)[slotIndex(slot)] ?? "";
}

/** Where one slot's family came from. */
export function slotSource(
  font: Pick<TypeFont, "sources">,
  slot: FontSlot,
): TypeFontSource {
  return font.sources[slot] ?? "system";
}

/** Whether a slot is rendered from a file in this browser. */
export function isLocalSlot(
  font: Pick<TypeFont, "sources">,
  slot: FontSlot,
): boolean {
  return slotSource(font, slot) === "local";
}

/** Every slot of every entry that is backed by a stored file. */
export function localSlots(
  system: TypeSystem | null,
): { fontId: string; slot: FontSlot; family: string }[] {
  return (system?.fonts ?? []).flatMap((font) =>
    FONT_SLOTS.filter(
      (slot) => isLocalSlot(font, slot) && familyForSlot(font, slot),
    ).map((slot) => ({
      fontId: font.id,
      slot,
      family: familyForSlot(font, slot),
    })),
  );
}

/** One named slot of a stack, with where its family came from. */
interface SlotEntry {
  family: string;
  /** Absent for a slot nothing ever recorded a source for. */
  source?: TypeFontSource;
}

/** A stack read back as its named slots, in order. */
function slotEntries(font: TypeFont): SlotEntry[] {
  return namedFamilies(font).map((family, index) => ({
    family,
    source: font.sources[FONT_SLOTS[index]!],
  }));
}

/**
 * Rebuild a stack from its slots.
 *
 * Empty slots are dropped rather than kept as holes, so the families array
 * stays the ordered list the browser reads. That is also why `sources` is
 * rebuilt from the position each family ends up in: closing a gap moves
 * everything behind it up a slot, and a source left on its old key would
 * describe the wrong family.
 *
 * The generic goes last and is kept if the stack already had one, so a serif
 * stack does not come back sans-serif.
 */
function fontFromSlots(
  font: TypeFont,
  entries: SlotEntry[],
  generic: string,
): TypeFont {
  const kept = entries
    .filter((entry) => entry.family.length > 0)
    /* A family named twice is one family. Deduped here rather than at the end
       so the source that survives is the one in front. */
    .filter(
      (entry, index, all) =>
        all.findIndex((other) => other.family === entry.family) === index,
    )
    .slice(0, FONT_SLOTS.length);

  const existingGeneric = font.families.filter(isGenericFamily);
  const tail = existingGeneric.length > 0 ? existingGeneric : [generic];

  const sources: TypeFont["sources"] = {};
  kept.forEach((entry, index) => {
    if (entry.source) sources[FONT_SLOTS[index]!] = entry.source;
  });

  return {
    ...font,
    families: [...kept.map((entry) => entry.family), ...tail],
    sources,
  };
}

/** A stored file that has to follow its family to a new slot. */
export interface SlotFileMove {
  from: FontSlot;
  to: FontSlot;
}

/**
 * Which uploaded files a slot removal leaves under the wrong key.
 *
 * Only local slots, because they are the only ones with a file behind them.
 * Everything after the removed slot moves up one; the caller moves the bytes,
 * which is not something a pure function can do.
 */
export function fallbackFileMoves(
  font: TypeFont,
  removed: FontSlot,
): SlotFileMove[] {
  const from = slotIndex(removed);
  return slotEntries(font)
    .map((entry, index) => ({ entry, index }))
    .filter(({ entry, index }) => index > from && entry.source === "local")
    .map(({ index }) => ({
      from: FONT_SLOTS[index]!,
      to: FONT_SLOTS[index - 1]!,
    }));
}

/**
 * Put a family in one slot, recording where it came from.
 *
 * One entry point for both pickers and both uploads. The editor used to
 * rebuild the array itself and hand it over whole, which meant every write
 * carried an opinion about the slot it was not editing.
 */
export function setSlotFamily(
  system: TypeSystem,
  fontId: string,
  slot: FontSlot,
  family: string,
  source: TypeFontSource,
  generic = "sans-serif",
): TypeSystem {
  return {
    ...system,
    fonts: system.fonts.map((font) => {
      if (font.id !== fontId) return font;

      const entries = slotEntries(font);
      const index = slotIndex(slot);
      while (entries.length <= index) entries.push({ family: "" });
      /* An emptied slot loses its source with it, or the entry would claim a
         file that nothing points at. */
      entries[index] = family ? { family, source } : { family: "" };

      return fontFromSlots(font, entries, generic);
    }),
  };
}

/**
 * Take one family out of a stack, closing the gap behind it.
 *
 * Removal rather than emptying, because the families array is what the
 * browser reads in order: leaving a hole at slot two would put the third
 * fallback where the second was for CSS and leave it named `fallback3` here,
 * and the two would disagree from then on.
 *
 * The moves come back with the system because the bytes of an uploaded file
 * live outside it, under a key naming the slot. Applying one without the
 * other leaves a file orphaned or a slot pointing at nothing.
 */
export function removeFontSlot(
  system: TypeSystem,
  fontId: string,
  slot: FontSlot,
): { system: TypeSystem; fileMoves: SlotFileMove[] } {
  const font = system.fonts.find((entry) => entry.id === fontId);
  if (!font) return { system, fileMoves: [] };

  const entries = slotEntries(font);
  const index = slotIndex(slot);
  if (index >= entries.length) return { system, fileMoves: [] };

  const fileMoves = fallbackFileMoves(font, slot);
  entries.splice(index, 1);
  const next = fontFromSlots(font, entries, "sans-serif");

  return {
    system: {
      ...system,
      fonts: system.fonts.map((entry) => (entry.id === fontId ? next : entry)),
    },
    fileMoves,
  };
}

/**
 * Point one slot at an uploaded file.
 *
 * The slot only. This used to write `[family, "sans-serif"]` over the whole
 * stack, which deleted the bilingual fallback the user had picked — upload a
 * Latin face onto Inter + Noto Sans Thai and the Thai was gone, silently, and
 * only for Thai.
 */
export function setLocalFont(
  system: TypeSystem,
  fontId: string,
  family: string,
  slot: FontSlot = "primary",
): TypeSystem {
  return setSlotFamily(system, fontId, slot, family, "local");
}

/** A family picked from the catalogue, which makes that slot a Google one. */
export function setGoogleFont(
  system: TypeSystem,
  fontId: string,
  slot: FontSlot,
  family: string,
  generic = "sans-serif",
): TypeSystem {
  return setSlotFamily(system, fontId, slot, family, "google", generic);
}

export function fontFamilyValue(system: TypeSystem, role: TypeRole): string {
  const font = system.fonts.find((candidate) => candidate.id === role.fontId);
  return font ? familiesToCss(font.families) : "inherit";
}

/**
 * Turn a family stack into a CSS font-family value.
 *
 * Families that are not valid CSS identifiers are quoted, which is what makes
 * `Noto Sans Thai` one family rather than three bare identifiers.
 */
export function familiesToCss(families: string[]): string {
  if (families.length === 0) return "inherit";
  return families
    .map((family) =>
      /^[a-zA-Z][a-zA-Z0-9-]*$/.test(family) ? family : `"${family}"`,
    )
    .join(", ");
}
