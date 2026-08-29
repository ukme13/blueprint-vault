import {
  DEFAULT_SPECIMEN_TEXT as PACKAGE_SPECIMEN_TEXT,
  DEFAULT_TYPE_SCALE_UNIT,
  readTypographyProjectData,
  type TypeScaleUnit,
  type TypeSystem,
  type TypographyProjectData,
} from "@blueprint/ui";
import { PREVIEW_TEMPLATES, type PreviewTemplateId } from "./preview-templates";

const TYPOGRAPHY_STORAGE_KEY = "blueprint.typography-project.v1";

export const DEFAULT_UNIT: TypeScaleUnit = DEFAULT_TYPE_SCALE_UNIT;
export const DEFAULT_SPECIMEN_TEXT = PACKAGE_SPECIMEN_TEXT;
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
    return narrowTemplate(readTypographyProjectData(JSON.parse(stored)));
  } catch {
    return null;
  }
}

/* The package reads `template` as a string, since it does not know which
   templates exist. This is where that becomes one of ours. */
function narrowTemplate(
  data: TypographyProjectData | null,
): TypographyProject | null {
  if (!data) return null;
  return {
    ...data,
    template: PREVIEW_TEMPLATES.some((entry) => entry.id === data.template)
      ? (data.template as PreviewTemplateId)
      : DEFAULT_TEMPLATE,
  };
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
