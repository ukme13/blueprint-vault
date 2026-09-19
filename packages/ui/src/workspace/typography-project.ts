import {
  readPreviewDocument,
  readPreviewLanding,
  readPreviewShell,
} from "../typography/preview-document";
import { readPreviewSections } from "../typography/preview-sections";
import { readPreviewTemplate } from "../typography/preview-template-shared";
import {
  migrateLegacyProject,
  normalizeStoredSystem,
  type LegacyTypographyProject,
} from "../typography/migrate";
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
): Omit<
  TypographyProjectData,
  | "system"
  | "previewDocument"
  | "previewShell"
  | "previewLanding"
  | "previewSections"
> {
  return {
    unit:
      "unit" in value && TYPE_SCALE_UNITS.includes(value.unit as TypeScaleUnit)
        ? (value.unit as TypeScaleUnit)
        : DEFAULT_TYPE_SCALE_UNIT,
    specimenText:
      "specimenText" in value && typeof value.specimenText === "string"
        ? value.specimenText
        : DEFAULT_SPECIMEN_TEXT,
    /* Retired names (documentation) become the layout they actually were. */
    template: readPreviewTemplate(
      "template" in value && typeof value.template === "string"
        ? value.template
        : undefined,
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
    const system = migrateLegacyProject(legacy);
    return {
      system,
      ...readPreferences(value),
      previewDocument: readPreviewDocument(
        "previewDocument" in value ? value.previewDocument : undefined,
        system,
      ),
      previewShell: readPreviewShell(
        "previewShell" in value ? value.previewShell : undefined,
        system,
      ),
      previewLanding: readPreviewLanding(
        "previewLanding" in value ? value.previewLanding : undefined,
        system,
      ),
      previewSections: readPreviewSections(
        "previewSections" in value ? value.previewSections : undefined,
      ),
    };
  }

  if (!("system" in value)) return null;

  const system = normalizeStoredSystem(value.system);
  if (!system) return null;

  return {
    system,
    ...readPreferences(value),
    previewDocument: readPreviewDocument(
      "previewDocument" in value ? value.previewDocument : undefined,
      system,
    ),
    previewShell: readPreviewShell(
      "previewShell" in value ? value.previewShell : undefined,
      system,
    ),
    previewLanding: readPreviewLanding(
      "previewLanding" in value ? value.previewLanding : undefined,
      system,
    ),
    previewSections: readPreviewSections(
      "previewSections" in value ? value.previewSections : undefined,
    ),
  };
}
