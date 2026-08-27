import { assignDefaultRoles, generateTypeSteps } from "./scale";
import {
  BODY_GROUP_ID,
  defaultGroups,
  reindexGroup,
  HEADING_GROUP_ID,
  type TypeGroup,
  type TypeRole,
  type TypeSystem,
} from "./system";
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
  return [
    {
      id: DISPLAY_GROUP_ID,
      label: "Display",
      isFixed: false,
      indexing: "number",
    },
    ...defaultGroups(),
    { id: "label", label: "Label", isFixed: false, indexing: "number" },
    { id: "caption", label: "Caption", isFixed: false, indexing: "number" },
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
    const value = {
      fontSizePx: step?.fontSizePx ?? project.baseFontSizePx,
      lineHeight: style.lineHeight,
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

  /* Base sits at the midpoint of the ramp, which is exactly why an absolute
     index had to become an offset. */
  const baseIndex = Math.floor((raw.stepCount - 1) / 2);

  const roles: TypeRole[] = (raw.roles as Record<string, unknown>[]).map(
    (role) => {
      const groupId =
        typeof role.groupId === "string"
          ? role.groupId
          : typeof role.group === "string"
            ? role.group
            : BODY_GROUP_ID;

      const stepOffset =
        role.stepOffset === null || typeof role.stepOffset === "number"
          ? (role.stepOffset as number | null)
          : typeof role.step === "number"
            ? role.step - baseIndex
            : null;

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
        desktop: role.desktop as TypeRole["desktop"],
        mobile: (role.mobile ?? role.desktop) as TypeRole["mobile"],
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
    stepCount: raw.stepCount,
    breakpointPx: typeof raw.breakpointPx === "number" ? raw.breakpointPx : 768,
    fonts: raw.fonts as TypeSystem["fonts"],
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
        isFixed:
          group.id === HEADING_GROUP_ID || group.id === BODY_GROUP_ID
            ? true
            : Boolean(group.isFixed),
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
      isFixed:
        role.groupId === HEADING_GROUP_ID || role.groupId === BODY_GROUP_ID,
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
