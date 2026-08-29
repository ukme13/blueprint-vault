import {
  migrateLegacyProject,
  normalizeStoredSystem,
  type LegacyTypographyProject,
} from "../typography/migrate";
import { TYPE_SCALE_UNITS, type TypeScaleUnit } from "../typography/types";
import type { TypographyProjectData } from "./types";

export const DEFAULT_TYPE_SCALE_UNIT: TypeScaleUnit = "rem";
export const DEFAULT_SPECIMEN_TEXT = "How vexingly quick daft zebras jump";
export const DEFAULT_PREVIEW_TEMPLATE = "specimen";

function readPreferences(value: object): Omit<TypographyProjectData, "system"> {
  return {
    unit:
      "unit" in value && TYPE_SCALE_UNITS.includes(value.unit as TypeScaleUnit)
        ? (value.unit as TypeScaleUnit)
        : DEFAULT_TYPE_SCALE_UNIT,
    specimenText:
      "specimenText" in value && typeof value.specimenText === "string"
        ? value.specimenText
        : DEFAULT_SPECIMEN_TEXT,
    /* Only checked to be a string. The list of templates lives in the app, so
       the caller narrows this against the one it has. */
    template:
      "template" in value && typeof value.template === "string"
        ? value.template
        : DEFAULT_PREVIEW_TEMPLATE,
  };
}

/**
 * Read a stored typography project, whichever shape it was saved in.
 *
 * Two historical shapes live under the old key. The pre-merge one has
 * `roleStyles` and a flat `fontFamily`; the merged one has a `system`. They are
 * told apart by inspection rather than by a version field, so that no saved
 * project is orphaned by a rename — and the system itself is then normalised,
 * since an earlier release stored one with no groups, roles keyed by `group`,
 * and absolute steps.
 */
export function readTypographyProjectData(
  value: unknown,
): TypographyProjectData | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const preferences = readPreferences(value);

  if ("roleStyles" in value && !("system" in value)) {
    const legacy = value as unknown as LegacyTypographyProject;
    if (
      typeof legacy.name !== "string" ||
      typeof legacy.fontFamily !== "string" ||
      typeof legacy.baseFontSizePx !== "number" ||
      typeof legacy.ratio !== "number" ||
      typeof legacy.stepCount !== "number" ||
      !legacy.roleStyles
    ) {
      return null;
    }
    return { system: migrateLegacyProject(legacy), ...preferences };
  }

  if (!("system" in value)) return null;

  const system = normalizeStoredSystem(value.system);
  if (!system) return null;

  return { system, ...preferences };
}
