import {
  clampLineHeightRatio,
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

/** Shirt sizes, smallest first, used by `size` indexing. */
export const SIZE_INDEX = ["xs", "sm", "md", "lg", "xl"] as const;

/** Heading is always h1–h6, so it never grows past six. */
export const MAX_HEADING_LEVEL = 6;

export interface TypeGroup {
  id: string;
  label: string;
  indexing: TypeIndexing;
  /**
   * The ratio `auto` line height uses for roles in this group.
   *
   * Seeded from `AUTO_LINE_HEIGHT_RATIOS` for the five defaults; a custom
   * group starts at body's 1.5. Changing it does not move a role that has
   * already pinned a ratio or a pixel height.
   */
  autoLineHeightRatio: number;
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

/**
 * The two supporting roles, each alone in a group of its own.
 *
 * A group of one takes the group's own id, which is the only shape in this
 * model that keeps a role called `label` called `label`. Every group is
 * reindexed by position on read — that is what repairs a project an earlier
 * release left holding both `body` and `body-1` — so putting these two in the
 * body group would have renamed all three: `body` to `body-1` and these to
 * `body-2` and `body-3`, taking `--font-body-size` out of every file that
 * already installs it.
 *
 * It is the same shape `display` already has, and it reads correctly on the
 * Groups tab: these are named roles rather than an indexed family, and a
 * project that wants two labels gets `label-1` and `label-2` the way every
 * other group works.
 */
export const LABEL_GROUP_ID = "label";
export const CAPTION_GROUP_ID = "caption";

/** The expressive brand font, and the readable one everything else uses. */
export const DISPLAY_FONT_ID = "display";
export const MAIN_FONT_ID = "main";

/**
 * The ratio `auto` uses, by group, until a project edits it.
 *
 * The same numbers the default system shipped as hand-set values, which is
 * what makes `auto` the honest default rather than a new opinion. Stored on
 * each `TypeGroup` after that, so the Groups tab can change them. A custom
 * group, or a role whose group is missing, falls back to body's.
 */
export const AUTO_LINE_HEIGHT_RATIOS: Readonly<Record<string, number>> = {
  [DISPLAY_GROUP_ID]: 1.1,
  [HEADING_GROUP_ID]: 1.2,
  [BODY_GROUP_ID]: 1.5,
  /* Tighter than body, because supporting text is short. Left at body's 1.5
     they came out on a 20px line — `auto` ceils to the 4px grid, so 12 × 1.5
     is 18 and rounds up — which is a paragraph's leading on a caption. Both
     land on 16px here: a label is nearly always one line and a caption is
     rarely more than two. */
  [LABEL_GROUP_ID]: 1.3,
  [CAPTION_GROUP_ID]: 1.4,
};

/** The ratio a new or unknown group starts from. */
export function defaultAutoLineHeightRatio(groupId: string): number {
  return AUTO_LINE_HEIGHT_RATIOS[groupId] ?? FALLBACK_AUTO_LINE_HEIGHT_RATIO;
}

/** The ratio a role's `auto` resolves against. */
export function autoRatioForRole(
  role: Pick<TypeRole, "groupId">,
  group?: Pick<TypeGroup, "autoLineHeightRatio">,
): number {
  if (typeof group?.autoLineHeightRatio === "number") {
    return group.autoLineHeightRatio;
  }
  return defaultAutoLineHeightRatio(role.groupId);
}

function defineGroup(
  id: string,
  label: string,
  indexing: TypeIndexing = "number",
): TypeGroup {
  return {
    id,
    label,
    indexing,
    autoLineHeightRatio: defaultAutoLineHeightRatio(id),
  };
}

/** Groups a new or reset scale starts with. None is special afterwards. */
export function defaultGroups(): TypeGroup[] {
  return [
    defineGroup(DISPLAY_GROUP_ID, "Display"),
    defineGroup(HEADING_GROUP_ID, "H"),
    defineGroup(BODY_GROUP_ID, "Body"),
    defineGroup(LABEL_GROUP_ID, "Label"),
    defineGroup(CAPTION_GROUP_ID, "Caption"),
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
  const metrics = {
    lineHeight: { mode: "auto" } as const,
    letterSpacingPx: 0,
    unlinkedSizes: {} as Record<string, number>,
    unlinkedLineHeights: {} as Record<string, LineHeightConfig>,
    unlinkedLetterSpacings: {} as Record<string, number>,
  };

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
    ...metrics,
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
    ...metrics,
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
    ...metrics,
  };

  /**
   * The two supporting roles, and the sizes the scale can actually give them.
   *
   * Asked for at roughly 14px and 12px, and 14 does not exist on this ramp.
   * Two steps below base is 10.24 before rounding and the floor clamps it to
   * 11, one step below is 12.80 rounding to 12, and base is 16 — so the small
   * end of a 1.25 scale is 11, 12, 16 with nothing between. They take the two
   * steps there are.
   *
   * Linked to a step rather than hand-set at 14, which would have hit the
   * number and broken the thing a default role is for: a hand-set size unlinks
   * from the ramp, so changing the base or the ratio would move every other
   * role and leave these two behind.
   *
   * `label` carries a little more weight because it names something rather
   * than saying it — a form label, an eyebrow, a badge — and `caption` stays
   * at body's weight because it is still prose, only quieter.
   */
  const label: TypeRole = {
    id: "label",
    name: "label",
    groupId: LABEL_GROUP_ID,
    fontId: MAIN_FONT_ID,
    fontWeight: 500,
    textTransform: "none",
    stepOffset: -1,
    sameAsRoleId: null,
    ...metrics,
  };

  const caption: TypeRole = {
    id: "caption",
    name: "caption",
    groupId: CAPTION_GROUP_ID,
    fontId: MAIN_FONT_ID,
    fontWeight: 400,
    textTransform: "none",
    stepOffset: -2,
    sameAsRoleId: null,
    ...metrics,
  };

  return {
    id: "type-system",
    name,
    groups,
    baseFontSizePx,
    ratio,
    stepCount,
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
    roles: [display, ...headings, body, label, caption],
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
  /**
   * The size somebody typed, which is not the size the role renders at.
   *
   * Kept so a save that still has `desktop` / `mobile` objects can be read.
   * New roles store typed sizes on `unlinkedSizes` instead.
   */
  fontSizePx: number;
  lineHeight: LineHeightConfig;
  letterSpacingPx: number;
}

/**
 * The line-height config this device uses: a typed override, else the shared
 * default.
 */
export function lineHeightConfigOnDevice(
  role: TypeRole,
  deviceId = "desktop",
): LineHeightConfig {
  const id = canonicalSizeDeviceId(deviceId);
  if (isLineHeightUnlinkedOnDevice(role, id)) {
    return role.unlinkedLineHeights[id]!;
  }
  return role.lineHeight;
}

/**
 * A role's line height, in both units.
 *
 * The one place anything outside this module should be reading a line height
 * from. Pass the resolved font size when you have it — auto snaps to the 4px
 * grid from that size. Without it, a typed desktop or phone size is used, then
 * 16. `deviceId` selects a per-frame override when one exists. Pass `system`
 * so `auto` reads the group's stored ratio rather than the seed table.
 */
export function resolveLineHeight(
  role: TypeRole,
  fontSizePx?: number,
  deviceId = "desktop",
  system?: Pick<TypeSystem, "groups">,
): ComputedLineHeight {
  const size =
    fontSizePx ?? role.unlinkedSizes.desktop ?? role.unlinkedSizes.phone ?? 16;
  const group = system?.groups.find(
    (candidate) => candidate.id === role.groupId,
  );
  return computeLineHeight(
    size,
    lineHeightConfigOnDevice(role, deviceId),
    autoRatioForRole(role, group),
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
   * Distance from the base step, or null when every frame is hand-set.
   *
   * An offset rather than an index: base is the midpoint of the ramp, so an
   * absolute index points at a different size as soon as the step count changes.
   * A typed size on one preview device does not clear this — that frame lives
   * in `unlinkedSizes` instead.
   */
  stepOffset: number | null;
  /**
   * Follow another role's size. Most component styles are "body with a small
   * adjustment", and recording that intent keeps them in step when body moves.
   */
  sameAsRoleId: string | null;
  /**
   * How the line height was chosen, not what it works out to.
   *
   * Shared across devices. A typed leading on one preview frame lives in
   * `unlinkedLineHeights` instead.
   */
  lineHeight: LineHeightConfig;
  /**
   * Shared tracking, in px. A typed value on one preview frame lives in
   * `unlinkedLetterSpacings` instead.
   */
  letterSpacingPx: number;
  /**
   * Hand-set px keyed by preview device id (`phone`, `tablet`, `desktop`,
   * extra desktops). A missing key follows `stepOffset` on that device's ramp.
   */
  unlinkedSizes: Record<string, number>;
  /**
   * Hand-set line height keyed by preview device id. A missing key follows
   * the shared `lineHeight`.
   */
  unlinkedLineHeights: Record<string, LineHeightConfig>;
  /**
   * Hand-set tracking keyed by preview device id. A missing key follows
   * the shared `letterSpacingPx`.
   */
  unlinkedLetterSpacings: Record<string, number>;
}

export interface TypeSystem {
  id: string;
  groups: TypeGroup[];
  name: string;
  baseFontSizePx: number;
  ratio: number;
  stepCount: number;
  fonts: TypeFont[];
  roles: TypeRole[];
}

const HEADING_ELEMENTS = ["h1", "h2", "h3", "h4", "h5", "h6"] as const;

/**
 * Roles that are a run of text inside something else rather than a block.
 *
 * A form label, an eyebrow above a title, a byline, the caption under a
 * figure: each sits within other content, and wrapping one in a `<p>` puts a
 * paragraph inside a paragraph or a block inside a label. Matched by id, the
 * same way a heading is, so moving a role between groups never changes what it
 * renders as.
 */
const SPAN_ROLE_IDS: readonly string[] = ["label", "caption", "overline"];

/** The elements a role can render as: a heading level, a paragraph, or a run. */
export type RoleElement = (typeof HEADING_ELEMENTS)[number] | "p" | "span";

/** A role id that names an HTML heading level. */
function isHeadingElement(id: string): id is (typeof HEADING_ELEMENTS)[number] {
  return (HEADING_ELEMENTS as readonly string[]).includes(id);
}

/**
 * Semantic element for a role, derived rather than stored.
 *
 * The heading group is h1 to h6 by position, the supporting roles are inline
 * runs, and everything else is a paragraph. A stored, editable element was a
 * control nobody needed: headings already know their level, and every other
 * role is a visual style applied to body copy.
 */
export function elementForRole(
  _system: TypeSystem,
  role: TypeRole,
): RoleElement {
  /* Read from the id rather than the group, so renaming or moving a group
     never changes what a role renders as. A predicate rather than a regex, so
     the narrowing is something the compiler checked instead of a cast at every
     place the result is used as a tag name. */
  if (isHeadingElement(role.id)) return role.id;
  return SPAN_ROLE_IDS.includes(role.id) ? "span" : "p";
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
    /* Largest first, because the rows are read top down and a scale is read
       big to small — the same order the step list and the preview use. The
       names are taken from the front of SIZE_INDEX and reversed rather than
       from its end, so a group of three is md/sm/xs and the smallest role
       keeps the same name whatever the group grows to. */
    return Array.from({ length: count }, (_, index) => {
      const size = SIZE_INDEX[count - 1 - index];
      return `${group.id}-${size ?? count - index}`;
    });
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
/**
 * Put one group where another sits, closing the gap it came from.
 *
 * What a drag means, as opposed to what a step means: `moveGroup` swaps with a
 * neighbour, which is the same thing only when the two are adjacent. Dragging
 * the first group past the third has to move one and shift two, not trade
 * places with whatever happens to be under the cursor at the end.
 *
 * An unknown id or a drop on itself returns the order unchanged, so a drag
 * that ends nowhere is not an edit.
 */
export function reorderGroups(
  system: TypeSystem,
  activeId: string,
  overId: string,
): TypeGroup[] {
  const groups = [...system.groups];
  const from = groups.findIndex((group) => group.id === activeId);
  const to = groups.findIndex((group) => group.id === overId);
  if (from === -1 || to === -1 || from === to) return groups;

  const [moved] = groups.splice(from, 1);
  groups.splice(to, 0, moved!);
  return groups;
}

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

/** Legacy `mobile` viewport is the phone frame. */
export function canonicalSizeDeviceId(deviceId: string): string {
  return deviceId === "mobile" ? "phone" : deviceId;
}

function hasDeviceKey(
  map: Record<string, unknown> | undefined,
  deviceId: string,
): boolean {
  return Object.prototype.hasOwnProperty.call(
    map ?? {},
    canonicalSizeDeviceId(deviceId),
  );
}

function pruneDeviceMap<T>(
  map: Record<string, T> | undefined,
  allowed: Set<string>,
): Record<string, T> {
  return Object.fromEntries(
    Object.entries(map ?? {}).filter(([key]) => allowed.has(key)),
  );
}

function omitDeviceKey<T>(
  map: Record<string, T> | undefined,
  deviceId: string,
): Record<string, T> {
  const next = { ...(map ?? {}) };
  delete next[canonicalSizeDeviceId(deviceId)];
  return next;
}

function setDeviceKey<T>(
  map: Record<string, T> | undefined,
  deviceId: string,
  value: T,
): Record<string, T> {
  return { ...(map ?? {}), [canonicalSizeDeviceId(deviceId)]: value };
}

function mapRole(
  system: TypeSystem,
  roleId: string,
  update: (role: TypeRole) => TypeRole,
): TypeSystem {
  return {
    ...system,
    roles: system.roles.map((role) =>
      role.id === roleId ? update(role) : role,
    ),
  };
}

export function isRoleUnlinkedOnDevice(
  role: TypeRole,
  deviceId: string,
): boolean {
  return hasDeviceKey(role.unlinkedSizes, deviceId);
}

export function isLineHeightUnlinkedOnDevice(
  role: TypeRole,
  deviceId: string,
): boolean {
  return hasDeviceKey(role.unlinkedLineHeights, deviceId);
}

export function isLetterSpacingUnlinkedOnDevice(
  role: TypeRole,
  deviceId: string,
): boolean {
  return hasDeviceKey(role.unlinkedLetterSpacings, deviceId);
}

/**
 * Tracking this device uses: a typed override, else the shared default.
 */
export function letterSpacingPxOnDevice(
  role: TypeRole,
  deviceId = "desktop",
): number {
  const id = canonicalSizeDeviceId(deviceId);
  if (isLetterSpacingUnlinkedOnDevice(role, id)) {
    return role.unlinkedLetterSpacings[id]!;
  }
  return role.letterSpacingPx;
}

/**
 * Font size the em conversion uses for this frame.
 *
 * Shared tracking is a proportion of the desktop size, so interpolated frames
 * inherit it. A typed value on this frame was authored against the size on
 * screen, so that frame's size is the divisor.
 */
export function letterSpacingEmSizePx(
  role: TypeRole,
  fontSizePx: number,
  desktopSizePx: number,
  deviceId: string,
): number {
  return isLetterSpacingUnlinkedOnDevice(role, deviceId)
    ? fontSizePx
    : desktopSizePx;
}

/**
 * Resolve a role's font size in px on one named device.
 *
 * Precedence: follow another role, else a typed size for this device, else a
 * step offset on the ramp `steps` describes, else another typed size (desktop,
 * then phone), else 16. `seen` breaks a cycle if two roles point at each other.
 */
export function resolveRoleSizePx(
  system: TypeSystem,
  steps: TypeStep[],
  role: TypeRole,
  deviceId = "desktop",
  seen: Set<string> = new Set(),
): number {
  const id = canonicalSizeDeviceId(deviceId);

  if (role.sameAsRoleId && !seen.has(role.id)) {
    seen.add(role.id);
    const target = system.roles.find(
      (candidate) => candidate.id === role.sameAsRoleId,
    );
    if (target) {
      return resolveRoleSizePx(system, steps, target, id, seen);
    }
  }

  if (isRoleUnlinkedOnDevice(role, id)) {
    return role.unlinkedSizes[id]!;
  }

  if (role.stepOffset !== null) {
    const step = steps.find(
      (candidate) => candidate.offset === role.stepOffset,
    );
    if (step) return step.fontSizePx;
  }

  return (
    role.unlinkedSizes.desktop ??
    role.unlinkedSizes.phone ??
    Object.values(role.unlinkedSizes)[0] ??
    16
  );
}

/** Bind this device to a step. Other devices that were typed stay typed. */
export function bindRoleStepOnDevice(
  system: TypeSystem,
  roleId: string,
  deviceId: string,
  stepOffset: number,
): TypeSystem {
  return mapRole(system, roleId, (role) => ({
    ...role,
    stepOffset,
    sameAsRoleId: null,
    unlinkedSizes: omitDeviceKey(role.unlinkedSizes, deviceId),
  }));
}

/** Type a size on one device; the role's step still drives every other frame. */
export function unlinkRoleSizeOnDevice(
  system: TypeSystem,
  roleId: string,
  deviceId: string,
  fontSizePx: number,
): TypeSystem {
  return mapRole(system, roleId, (role) => ({
    ...role,
    sameAsRoleId: null,
    unlinkedSizes: setDeviceKey(role.unlinkedSizes, deviceId, fontSizePx),
  }));
}

/** Drop typed sizes and line heights for frames that no longer exist. */
export function pruneUnlinkedSizes(
  system: TypeSystem,
  deviceIds: readonly string[],
): TypeSystem {
  const allowed = new Set(deviceIds.map(canonicalSizeDeviceId));
  return {
    ...system,
    roles: system.roles.map((role) => ({
      ...role,
      unlinkedSizes: pruneDeviceMap(role.unlinkedSizes, allowed),
      unlinkedLineHeights: pruneDeviceMap(role.unlinkedLineHeights, allowed),
      unlinkedLetterSpacings: pruneDeviceMap(
        role.unlinkedLetterSpacings,
        allowed,
      ),
    })),
  };
}

/** Type a line height on one device; the shared config still drives the rest. */
export function unlinkLineHeightOnDevice(
  system: TypeSystem,
  roleId: string,
  deviceId: string,
  lineHeight: LineHeightConfig,
): TypeSystem {
  return mapRole(system, roleId, (role) => ({
    ...role,
    unlinkedLineHeights: setDeviceKey(
      role.unlinkedLineHeights,
      deviceId,
      lineHeight,
    ),
  }));
}

/** Restore this device to the shared line height. Other overrides stay. */
export function bindLineHeightOnDevice(
  system: TypeSystem,
  roleId: string,
  deviceId: string,
): TypeSystem {
  return mapRole(system, roleId, (role) => ({
    ...role,
    unlinkedLineHeights: omitDeviceKey(role.unlinkedLineHeights, deviceId),
  }));
}

/** Type tracking on one device; the shared value still drives the rest. */
export function unlinkLetterSpacingOnDevice(
  system: TypeSystem,
  roleId: string,
  deviceId: string,
  letterSpacingPx: number,
): TypeSystem {
  return mapRole(system, roleId, (role) => ({
    ...role,
    unlinkedLetterSpacings: setDeviceKey(
      role.unlinkedLetterSpacings,
      deviceId,
      letterSpacingPx,
    ),
  }));
}

/** Restore this device to the shared tracking. Other overrides stay. */
export function bindLetterSpacingOnDevice(
  system: TypeSystem,
  roleId: string,
  deviceId: string,
): TypeSystem {
  return mapRole(system, roleId, (role) => ({
    ...role,
    unlinkedLetterSpacings: omitDeviceKey(
      role.unlinkedLetterSpacings,
      deviceId,
    ),
  }));
}

/* The edits a studio makes to a system, as TypeSystem -> TypeSystem. They sit
   here rather than in the app because they are the same species as addFont and
   reindexGroup beside them, and several call those directly. */

export function updateRole(
  system: TypeSystem,
  id: string,
  patch: Partial<TypeRole>,
): TypeSystem {
  return mapRole(system, id, (role) => ({ ...role, ...patch }));
}

/** Line height and letter spacing are always per-role and never linked. */
export function updateRoleValue(
  system: TypeSystem,
  id: string,
  patch: Partial<{ lineHeight: LineHeightConfig; letterSpacingPx: number }>,
): TypeSystem {
  return updateRole(system, id, patch);
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
           own. Adding roles must never force the ramp to grow. Typed sizes
           stay with the sibling — a new frame starts bound. */
        stepOffset: template.stepOffset,
        sameAsRoleId: null,
        unlinkedSizes: {},
        unlinkedLineHeights: {},
        unlinkedLetterSpacings: {},
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
    groups: system.groups.map((group) => {
      if (group.id !== groupId) return group;
      const next = { ...group, ...patch };
      return {
        ...next,
        autoLineHeightRatio: clampLineHeightRatio(next.autoLineHeightRatio),
      };
    }),
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
    groups: [...system.groups, defineGroup(`group-${index}`, `Group ${index}`)],
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
