import {
  CAPTION_GROUP_ID,
  defaultAutoLineHeightRatio,
  defaultSystem,
  DISPLAY_FONT_ID,
  DISPLAY_GROUP_ID,
  HEADING_GROUP_ID,
  BODY_GROUP_ID,
  LABEL_GROUP_ID,
  MAIN_FONT_ID,
  reindexGroup,
  roleIdsForGroup,
  type TypeGroup,
  type TypeIndexing,
  type TypeRole,
  type TypeSystem,
  type TypographyTextTransform,
} from "./system";

/**
 * Starting sets of groups and roles for the Groups tab.
 *
 * A preset is the shape of a type system, not its look: which roles exist,
 * which group each sits in, its step on the ramp and its weight. Applying one
 * keeps the fonts, base size, ratio and step count, so a project can try
 * App UI against Editorial without losing its typeface or scale.
 *
 * Role ids come from the group's own naming rule (`roleIdsForGroup`), the
 * rule every read repairs ids with, so a preset's roles keep their names
 * across a reload and the preset is still recognised afterwards. That rule
 * gives a size-indexed group of three `md`, `sm`, `xs`, largest first, and a
 * group of one the group's own id; which is why the support roles are each a
 * group of one (`label`, `caption`, `code`) rather than one "Support" group
 * that would rename them `support-1` to `support-3`. And every preset keeps
 * the five groups a load always restores (display, h, body, label, caption).
 */

export type TypeRolePresetId =
  "app-ui" | "minimal" | "editorial" | "enterprise";

interface PresetRole {
  stepOffset: number;
  fontWeight: number;
  font?: "display" | "main";
  textTransform?: TypographyTextTransform;
}

interface PresetGroup {
  id: string;
  label: string;
  indexing?: TypeIndexing;
  /** Line-height ratio for `auto`, when the group's id has no default. */
  autoLineHeightRatio?: number;
  /** Largest first, the order the Groups tab and the naming rule read. */
  roles: PresetRole[];
}

export interface TypeRolePreset {
  id: TypeRolePresetId;
  label: string;
  description: string;
}

/** Offsets stay within -2..+6, the ramp's range at the default nine steps. */
const APP_UI: PresetGroup[] = [
  {
    id: DISPLAY_GROUP_ID,
    label: "Display",
    roles: [{ stepOffset: 6, fontWeight: 700, font: "display" }],
  },
  {
    id: HEADING_GROUP_ID,
    label: "H",
    roles: [6, 5, 4, 3, 2, 1].map((stepOffset) => ({
      stepOffset,
      fontWeight: 700,
    })),
  },
  {
    id: BODY_GROUP_ID,
    label: "Body",
    indexing: "size",
    roles: [
      { stepOffset: 1, fontWeight: 400 },
      { stepOffset: 0, fontWeight: 400 },
      { stepOffset: -1, fontWeight: 400 },
    ],
  },
  {
    id: "button",
    label: "Button",
    indexing: "size",
    autoLineHeightRatio: 1.2,
    roles: [
      { stepOffset: 0, fontWeight: 600 },
      { stepOffset: -1, fontWeight: 600 },
      { stepOffset: -2, fontWeight: 500 },
    ],
  },
  {
    id: "chip",
    label: "Chip",
    autoLineHeightRatio: 1.3,
    roles: [{ stepOffset: -2, fontWeight: 500 }],
  },
  {
    id: LABEL_GROUP_ID,
    label: "Label",
    roles: [{ stepOffset: -1, fontWeight: 500 }],
  },
  {
    id: CAPTION_GROUP_ID,
    label: "Caption",
    roles: [{ stepOffset: -2, fontWeight: 400 }],
  },
  {
    id: "code",
    label: "Code",
    roles: [{ stepOffset: -1, fontWeight: 400 }],
  },
];

const EDITORIAL: PresetGroup[] = [
  {
    id: DISPLAY_GROUP_ID,
    label: "Display",
    roles: [
      { stepOffset: 6, fontWeight: 700, font: "display" },
      { stepOffset: 5, fontWeight: 700, font: "display" },
    ],
  },
  {
    id: HEADING_GROUP_ID,
    label: "H",
    roles: [5, 4, 3, 2, 1, 0].map((stepOffset) => ({
      stepOffset,
      fontWeight: 700,
    })),
  },
  {
    id: BODY_GROUP_ID,
    label: "Body",
    indexing: "size",
    roles: [
      { stepOffset: 1, fontWeight: 400 },
      { stepOffset: 0, fontWeight: 400 },
      { stepOffset: -1, fontWeight: 400 },
    ],
  },
  /* Every system has a label group: a load adds it back if it is missing,
     so a preset without one would never be recognised after a reload. */
  {
    id: LABEL_GROUP_ID,
    label: "Label",
    roles: [{ stepOffset: -1, fontWeight: 500 }],
  },
  {
    id: "quote",
    label: "Quote",
    autoLineHeightRatio: 1.4,
    roles: [{ stepOffset: 2, fontWeight: 400, font: "display" }],
  },
  {
    id: CAPTION_GROUP_ID,
    label: "Caption",
    roles: [{ stepOffset: -2, fontWeight: 400 }],
  },
  {
    id: "overline",
    label: "Overline",
    autoLineHeightRatio: 1.3,
    roles: [{ stepOffset: -2, fontWeight: 600, textTransform: "uppercase" }],
  },
];

/** A group of roles on one font and weight, one per step offset. */
function steps(
  offsets: number[],
  fontWeight: number,
  font: "display" | "main" = "main",
): PresetRole[] {
  return offsets.map((stepOffset) => ({ stepOffset, fontWeight, font }));
}

/**
 * A full product system: every scale an interface reaches for, and the
 * component text a form, a table and a list need. Body is numbered, not
 * sized, and steps down from base: body-1 is base, body-2 and body-3 one
 * and two steps below.
 */
const ENTERPRISE: PresetGroup[] = [
  {
    id: DISPLAY_GROUP_ID,
    label: "Display",
    roles: steps([6, 5, 4, 3, 2, 1], 700, "display"),
  },
  { id: HEADING_GROUP_ID, label: "H", roles: steps([6, 5, 4, 3, 2, 1], 700) },
  { id: "subtitle", label: "Subtitle", roles: steps([2, 1, 0, -1], 500) },
  {
    id: "subtitle-display",
    label: "Subtitle display",
    roles: steps([2, 1, 0, -1], 500, "display"),
  },
  { id: BODY_GROUP_ID, label: "Body", roles: steps([0, -1, -2], 400) },
  {
    id: "quote",
    label: "Quote",
    autoLineHeightRatio: 1.4,
    roles: steps([2], 400, "display"),
  },
  { id: "code", label: "Code", roles: steps([-1], 400) },
  {
    id: "button",
    label: "Button",
    indexing: "size",
    autoLineHeightRatio: 1.2,
    roles: steps([0, -1, -2], 600),
  },
  {
    id: "input-label",
    label: "Input label",
    indexing: "size",
    roles: steps([-1, -2], 500),
  },
  {
    id: "input-value",
    label: "Input value",
    indexing: "size",
    roles: steps([0, -1], 400),
  },
  { id: "input-helper", label: "Input helper", roles: steps([-2], 400) },
  { id: "table-header", label: "Table header", roles: steps([-1], 600) },
  { id: "list-subheader", label: "List subheader", roles: steps([-1], 600) },
  { id: LABEL_GROUP_ID, label: "Label", roles: steps([-1], 500) },
  { id: CAPTION_GROUP_ID, label: "Caption", roles: steps([-2], 400) },
  {
    id: "overline",
    label: "Overline",
    autoLineHeightRatio: 1.3,
    roles: [{ stepOffset: -2, fontWeight: 600, textTransform: "uppercase" }],
  },
  { id: "tag", label: "Tag", roles: steps([-2], 600) },
];

export const TYPE_ROLE_PRESETS: readonly TypeRolePreset[] = [
  {
    id: "app-ui",
    label: "App UI",
    description:
      "Headings, three body sizes, buttons, a chip, label, caption and code.",
  },
  {
    id: "minimal",
    label: "Minimal",
    description: "Display, h1–h6, body, label and caption. The default.",
  },
  {
    id: "editorial",
    label: "Editorial",
    description:
      "Two displays, headings, three body sizes, a label, a quote, caption and overline.",
  },
  {
    id: "enterprise",
    label: "Enterprise",
    description:
      "Full design system: displays, headings, subtitles, body ramp, buttons, inputs, tables, lists, quote, code and tags.",
  },
];

const PRESET_GROUPS: Record<
  Exclude<TypeRolePresetId, "minimal">,
  PresetGroup[]
> = {
  "app-ui": APP_UI,
  editorial: EDITORIAL,
  enterprise: ENTERPRISE,
};

function blankMetrics(): Pick<
  TypeRole,
  | "lineHeight"
  | "letterSpacingPx"
  | "unlinkedSizes"
  | "unlinkedLineHeights"
  | "unlinkedLetterSpacings"
  | "sameAsRoleId"
> {
  return {
    lineHeight: { mode: "auto" },
    letterSpacingPx: 0,
    unlinkedSizes: {},
    unlinkedLineHeights: {},
    unlinkedLetterSpacings: {},
    sameAsRoleId: null,
  };
}

/**
 * The preset's groups and roles, on this system's fonts.
 *
 * A role asks for the display or the main font; if the system no longer has
 * that one, it takes the first font it does have.
 */
function presetShape(
  system: TypeSystem,
  presetId: TypeRolePresetId,
): Pick<TypeSystem, "groups" | "roles"> {
  const fontIds = new Set(system.fonts.map((font) => font.id));
  const fontId = (wanted: string) =>
    fontIds.has(wanted) ? wanted : (system.fonts[0]?.id ?? wanted);

  if (presetId === "minimal") {
    const seed = defaultSystem(
      system.name,
      [],
      system.baseFontSizePx,
      system.ratio,
      system.stepCount,
    );
    /* Named by the rule, as every load names it: the seed writes a lone
       `display-1`, which the first reload turns into `display`. */
    const named = withRoleNamingRule({
      ...seed,
      roles: seed.roles.map((role) => ({
        ...role,
        fontId: fontId(role.fontId),
      })),
    });
    return { groups: named.groups, roles: named.roles };
  }

  const groups: TypeGroup[] = [];
  const roles: TypeRole[] = [];
  for (const spec of PRESET_GROUPS[presetId]) {
    const group: TypeGroup = {
      id: spec.id,
      label: spec.label,
      indexing: spec.indexing ?? "number",
      autoLineHeightRatio:
        spec.autoLineHeightRatio ?? defaultAutoLineHeightRatio(spec.id),
    };
    groups.push(group);
    const ids = roleIdsForGroup(group, spec.roles.length);
    spec.roles.forEach((role, index) => {
      const id = ids[index]!;
      roles.push({
        id,
        name: id,
        groupId: group.id,
        fontId: fontId(
          role.font === "display" ? DISPLAY_FONT_ID : MAIN_FONT_ID,
        ),
        fontWeight: role.fontWeight,
        textTransform: role.textTransform ?? "none",
        stepOffset: role.stepOffset,
        ...blankMetrics(),
      });
    });
  }
  return { groups, roles };
}

/** Every group's roles renamed by the naming rule, as a load does. */
function withRoleNamingRule(system: TypeSystem): TypeSystem {
  return system.groups.reduce(
    (next, group) => reindexGroup(next, group.id),
    system,
  );
}

/** JSON with object keys sorted, so field order never counts as a change. */
function canonical(value: unknown): string {
  return JSON.stringify(value, (_, each: unknown) =>
    each && typeof each === "object" && !Array.isArray(each)
      ? Object.fromEntries(
          Object.entries(each as Record<string, unknown>).sort(([a], [b]) =>
            a < b ? -1 : a > b ? 1 : 0,
          ),
        )
      : each,
  );
}

/**
 * The system with a preset's groups and roles in place of its own.
 *
 * Keeps everything else: fonts, base size, ratio, step count and name.
 */
export function applyTypeRolePreset(
  system: TypeSystem,
  presetId: TypeRolePresetId,
): TypeSystem {
  return { ...system, ...presetShape(system, presetId) };
}

/**
 * Which preset the system's groups and roles are, exactly, or `custom`.
 *
 * Exactly: applying the preset to this system must give back the same
 * groups and roles, compared by value. A changed weight, a hand-set size, a
 * renamed or added group all make it `custom`, which is what the Groups tab
 * shows. The system is named by the rule first, so a seed that has not been
 * through a load yet (`display-1`) reads the same as one that has.
 */
export function detectTypeRolePreset(
  system: TypeSystem,
): TypeRolePresetId | "custom" {
  const named = withRoleNamingRule(system);
  const current = canonical({ groups: named.groups, roles: named.roles });
  for (const preset of TYPE_ROLE_PRESETS) {
    if (canonical(presetShape(system, preset.id)) === current) {
      return preset.id;
    }
  }
  return "custom";
}
