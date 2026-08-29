import {
  migrateLegacyProject,
  normalizeStoredSystem,
  TYPE_SCALE_UNITS,
  type LegacyTypographyProject,
  type TypeScaleUnit,
  type TypeSystem,
} from "@blueprint/ui";
import { PREVIEW_TEMPLATES, type PreviewTemplateId } from "./preview-templates";

const TYPOGRAPHY_STORAGE_KEY = "blueprint.typography-project.v1";

export const DEFAULT_UNIT: TypeScaleUnit = "rem";
export const DEFAULT_SPECIMEN_TEXT = "How vexingly quick daft zebras jump";
export const DEFAULT_TEMPLATE: PreviewTemplateId = "specimen";

export interface TypographyProject {
  /** The typography system itself. Everything else here is a preference. */
  system: TypeSystem;
  /** Output unit. Optional in storage: projects saved before units existed. */
  unit: TypeScaleUnit;
  /** Text shown at every step so a scale can be judged in real copy. */
  specimenText: string;
  /** Which preview template the Preview section shows. */
  template: PreviewTemplateId;
}

export function readStoredProject(): TypographyProject | null {
  try {
    const stored = window.localStorage.getItem(TYPOGRAPHY_STORAGE_KEY);
    if (!stored) return null;

    const parsed: unknown = JSON.parse(stored);
    if (!parsed || typeof parsed !== "object") return null;

    const prefs = readPreferences(parsed);

    /* Two shapes live under this key. The pre-merge one has roleStyles and a
       flat fontFamily; the merged one has a system. Detect rather than version,
       so nobody's saved work is orphaned by the rename. */
    if ("roleStyles" in parsed && !("system" in parsed)) {
      const legacy = parsed as unknown as LegacyTypographyProject;
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
      return { system: migrateLegacyProject(legacy), ...prefs };
    }

    if (!("system" in parsed)) return null;

    /* Normalise rather than trust: an earlier release stored a system with no
       groups, roles keyed by `group`, and absolute steps. Reading one of those
       as-is crashed on system.groups.map. */
    const system = normalizeStoredSystem(parsed.system);
    if (!system) return null;

    return { system, ...prefs };
  } catch {
    return null;
  }
}

/** Clearing the project removes the key, so a reload lands on creation. */
export function writeStoredProject(project: TypographyProject | null): void {
  if (project) {
    window.localStorage.setItem(
      TYPOGRAPHY_STORAGE_KEY,
      JSON.stringify(project),
    );
  } else {
    window.localStorage.removeItem(TYPOGRAPHY_STORAGE_KEY);
  }
}

function readPreferences(parsed: object): {
  unit: TypeScaleUnit;
  specimenText: string;
  template: PreviewTemplateId;
} {
  return {
    unit:
      "unit" in parsed &&
      TYPE_SCALE_UNITS.includes(parsed.unit as TypeScaleUnit)
        ? (parsed.unit as TypeScaleUnit)
        : DEFAULT_UNIT,
    specimenText:
      "specimenText" in parsed && typeof parsed.specimenText === "string"
        ? parsed.specimenText
        : DEFAULT_SPECIMEN_TEXT,
    template:
      "template" in parsed &&
      PREVIEW_TEMPLATES.some((entry) => entry.id === parsed.template)
        ? (parsed.template as PreviewTemplateId)
        : DEFAULT_TEMPLATE,
  };
}
