import {
  assignDefaultRoles,
  generateTypeSteps,
  STEPS_BELOW_BASE,
} from "./scale";
import {
  BODY_GROUP_ID,
  defaultGroups,
  reindexGroup,
  HEADING_GROUP_ID,
  type TypeGroup,
  FONT_SLOTS,
  isGenericFamily,
  type TypeFont,
  type TypeFontSource,
  type TypeRole,
  type TypeRoleValue,
  type TypeSystem,
} from "./system";
import { readLineHeightConfig } from "./line-height";
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
/** Legacy role name to its id in the merged model. */
const LEGACY_IDS: Record<SemanticRole, string> = {
  display: "display",
  heading: "h1",
  title: "h2",
  body: "body",
  label: "label",
  caption: "caption",
};

const DISPLAY_GROUP_ID = "display";

/** Which group each legacy role lands in. */
const LEGACY_GROUPS: Record<SemanticRole, string> = {
  display: DISPLAY_GROUP_ID,
  heading: HEADING_GROUP_ID,
  title: HEADING_GROUP_ID,
  body: BODY_GROUP_ID,
  label: "label",
  caption: "caption",
};

/** Groups a migrated legacy project needs: the two fixed ones plus two free. */
function legacyGroups(): TypeGroup[] {
  /* Display comes from defaultGroups now; adding it here as well gave a
     migrated project two groups with the same id. */
  return [
    ...defaultGroups(),
    { id: "label", label: "Label", indexing: "number" },
    { id: "caption", label: "Caption", indexing: "number" },
  ];
}

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
    /* `ratio`, not `auto`. These were per-role values somebody had set, and
       adopting the group default instead would change how a saved project
       renders on the first load after this. */
    const value: TypeRoleValue = {
      fontSizePx: step?.fontSizePx ?? project.baseFontSizePx,
      lineHeight: { mode: "ratio", value: style.lineHeight },
      letterSpacingPx: style.letterSpacingPx,
    };

    return {
      id: LEGACY_IDS[role],
      name: LEGACY_IDS[role],
      groupId: LEGACY_GROUPS[role],
      fontId: LEGACY_FONT_ID,
      fontWeight: style.fontWeight,
      textTransform: "none" as const,
      /* Stored as a distance from base, so changing the step count later does
         not move this role onto a different size. */
      stepOffset: step?.offset ?? 0,
      sameAsRoleId: null,
      desktop: value,
      mobile: { ...value },
    };
  });

  return {
    id: "migrated-type-scale",
    groups: legacyGroups(),
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
        sources: { primary: "system" },
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

/**
 * Bring a stored system up to the current shape.
 *
 * An earlier release persisted a system with no `groups`, roles keyed by
 * `group` rather than `groupId`, and an absolute `step` rather than an offset.
 * Reading one of those without upgrading it crashes on `system.groups.map`, so
 * every field the model now requires is backfilled here rather than assumed.
 *
 * Returns null only when the value is not recognisably a system at all.
 */
/**
 * One breakpoint's values, out of stored data.
 *
 * This was a cast until the line height stopped being a bare number. Every
 * project saved before then holds one, and `readLineHeightConfig` reads it as
 * the ratio it meant — detected by shape, like the rest of this file, rather
 * than gated on a version.
 */
function readRoleValue(value: unknown): TypeRoleValue {
  const raw = (value ?? {}) as Record<string, unknown>;
  return {
    fontSizePx: typeof raw.fontSizePx === "number" ? raw.fontSizePx : 16,
    lineHeight: readLineHeightConfig(raw.lineHeight) ?? { mode: "auto" },
    letterSpacingPx:
      typeof raw.letterSpacingPx === "number" ? raw.letterSpacingPx : 0,
  };
}

function isFontSource(value: unknown): value is TypeFontSource {
  return value === "google" || value === "local" || value === "system";
}

/**
 * Font entries out of stored data.
 *
 * This was a cast until `source` became per-slot. Every project saved before
 * then carries one source for the whole entry, and it described the primary:
 * an upload could only ever land there, and the fallback slot was reachable
 * only through the Google picker. So the old value becomes the primary's and
 * a fallback that exists is Google's.
 *
 * Detected by shape rather than gated on a version, like the rest of this
 * file. An entry already carrying `sources` keeps it.
 */
function readFonts(value: unknown): TypeFont[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((raw): TypeFont[] => {
    if (!raw || typeof raw !== "object") return [];
    const font = raw as Record<string, unknown>;
    if (typeof font.id !== "string") return [];

    const families = Array.isArray(font.families)
      ? font.families.filter(
          (family): family is string =>
            typeof family === "string" && family.trim().length > 0,
        )
      : [];

    let sources: TypeFont["sources"];
    if (font.sources && typeof font.sources === "object") {
      const stored = font.sources as Record<string, unknown>;
      sources = {};
      for (const slot of FONT_SLOTS) {
        if (isFontSource(stored[slot])) sources[slot] = stored[slot];
      }
    } else {
      const legacy = isFontSource(font.source) ? font.source : "system";
      sources = { primary: legacy };
      /* The only way a fallback could have been set was the picker. */
      const named = families.filter((family) => !isGenericFamily(family));
      if (named.length > 1) sources.fallback = "google";
    }

    return [
      {
        id: font.id,
        name: typeof font.name === "string" ? font.name : font.id,
        families,
        sources,
      },
    ];
  });
}

export function normalizeStoredSystem(value: unknown): TypeSystem | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;

  if (
    !Array.isArray(raw.roles) ||
    !Array.isArray(raw.fonts) ||
    typeof raw.baseFontSizePx !== "number" ||
    typeof raw.ratio !== "number" ||
    typeof raw.stepCount !== "number"
  ) {
    return null;
  }

  const stepCount = raw.stepCount;
  const baseIndex = Math.min(STEPS_BELOW_BASE, stepCount - 1);

  const roles: TypeRole[] = (raw.roles as Record<string, unknown>[]).map(
    (role) => {
      const groupId =
        typeof role.groupId === "string"
          ? role.groupId
          : typeof role.group === "string"
            ? role.group
            : BODY_GROUP_ID;

      const rawOffset =
        role.stepOffset === null || typeof role.stepOffset === "number"
          ? (role.stepOffset as number | null)
          : typeof role.step === "number"
            ? role.step - baseIndex
            : null;

      /* The ramp used to be centred, so a saved offset can sit outside it now
         that base has moved up. Clamp rather than drop: an offset with no step
         would silently freeze the role at whatever size it last stored. */
      const stepOffset =
        rawOffset === null
          ? null
          : Math.min(
              Math.max(rawOffset, -baseIndex),
              stepCount - 1 - baseIndex,
            );

      const id = typeof role.id === "string" ? role.id : "role";

      return {
        id,
        name: typeof role.name === "string" ? role.name : id,
        groupId,
        fontId: typeof role.fontId === "string" ? role.fontId : "base",
        fontWeight: typeof role.fontWeight === "number" ? role.fontWeight : 400,
        textTransform:
          role.textTransform === "uppercase" ||
          role.textTransform === "capitalize"
            ? role.textTransform
            : "none",
        stepOffset,
        sameAsRoleId:
          typeof role.sameAsRoleId === "string" ? role.sameAsRoleId : null,
        desktop: readRoleValue(role.desktop),
        mobile: readRoleValue(role.mobile ?? role.desktop),
      };
    },
  );

  const groups = normalizeGroups(raw.groups, roles);

  /* A role pointing at a group that no longer exists would vanish from the
     editor entirely, so it is adopted by body rather than dropped. */
  const known = new Set(groups.map((group) => group.id));
  roles.forEach((role) => {
    if (!known.has(role.groupId)) role.groupId = BODY_GROUP_ID;
  });

  const system: TypeSystem = {
    id: typeof raw.id === "string" ? raw.id : "type-system",
    name: typeof raw.name === "string" ? raw.name : "Type scale",
    groups,
    baseFontSizePx: raw.baseFontSizePx,
    ratio: raw.ratio,
    stepCount,
    breakpointPx: typeof raw.breakpointPx === "number" ? raw.breakpointPx : 768,
    fonts: readFonts(raw.fonts),
    roles,
  };

  /* Repair ids that an earlier release left inconsistent. It appended a role
     without renaming its siblings, so a group could hold both `body` and
     `body-1`. Reindexing on load fixes that without the user touching it. */
  return system.groups.reduce(
    (acc, group) => reindexGroup(acc, group.id),
    system,
  );
}

function normalizeGroups(value: unknown, roles: TypeRole[]): TypeGroup[] {
  if (Array.isArray(value) && value.length > 0) {
    const groups = (value as Record<string, unknown>[])
      .filter((group) => typeof group.id === "string")
      .map((group): TypeGroup => ({
        id: group.id as string,
        label:
          typeof group.label === "string" ? group.label : (group.id as string),
        /* "none" was a mode in an earlier release; a single role now simply
           drops its index, so it collapses to number. */
        indexing: group.indexing === "size" ? "size" : "number",
      }));
    return withFixedGroups(groups);
  }

  /* No groups stored: rebuild them from whatever the roles claim to belong to,
     keeping the order the roles appear in. */
  const seen = new Set<string>();
  const derived: TypeGroup[] = [];
  roles.forEach((role) => {
    if (seen.has(role.groupId)) return;
    seen.add(role.groupId);
    derived.push({
      id: role.groupId,
      label: role.groupId.charAt(0).toUpperCase() + role.groupId.slice(1),
      indexing: "number",
    });
  });
  return withFixedGroups(derived);
}

/** Heading and body always exist, whatever the stored value said. */
function withFixedGroups(groups: TypeGroup[]): TypeGroup[] {
  const result = [...groups];
  defaultGroups().forEach((fixed) => {
    if (!result.some((group) => group.id === fixed.id)) result.push(fixed);
  });
  return result;
}
