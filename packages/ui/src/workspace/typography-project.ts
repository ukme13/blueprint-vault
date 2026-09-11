import {
  migrateLegacyProject,
  normalizeStoredSystem,
  type LegacyTypographyProject,
} from "../typography/migrate";
import { normalizePreviewDevices } from "../typography/preview-devices";
import {
  clampRemRootPx,
  ROOT_FONT_SIZE_PX,
  TYPE_SCALE_UNITS,
  type TypeScaleUnit,
} from "../typography/types";
import type { TypographyProjectData } from "./types";

export const DEFAULT_TYPE_SCALE_UNIT: TypeScaleUnit = "rem";
export const DEFAULT_SPECIMEN_TEXT = "How vexingly quick daft zebras jump";
export const DEFAULT_PREVIEW_TEMPLATE = "specimen";

function readPreferences(
  value: object,
  fallbackRatio: number,
): Omit<TypographyProjectData, "system"> {
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
    previewDevices: normalizePreviewDevices(
      "previewDevices" in value && Array.isArray(value.previewDevices)
        ? value.previewDevices
        : undefined,
      fallbackRatio,
    ),
    remRootPx:
      "remRootPx" in value && typeof value.remRootPx === "number"
        ? clampRemRootPx(value.remRootPx)
        : ROOT_FONT_SIZE_PX,
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
 *
 * **A stored system never gains a role it was saved without.** The semantic
 * colour layer does the opposite — `fillSeedRoles` tops a saved layer up to
 * the current seed set on every read — and the difference is deliberate. A
 * semantic role is vocabulary the system defines, so filling one in is a
 * migration; a type role is a decision somebody made about their own scale,
 * the same as a palette track, so adding one on their behalf is inventing
 * their design. `label` and `caption` arrived after most saved projects and
 * those projects do not have them. The template resolver's group rules are the
 * answer for every one of them, which is why those rules stay.
 */
export function readTypographyProjectData(
  value: unknown,
): TypographyProjectData | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

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
    return {
      system: migrateLegacyProject(legacy),
      ...readPreferences(value, legacy.ratio),
    };
  }

  if (!("system" in value)) return null;

  const system = normalizeStoredSystem(value.system);
  if (!system) return null;

  return { system, ...readPreferences(value, system.ratio) };
}
