import {
  DEFAULT_SPECIMEN_TEXT as PACKAGE_SPECIMEN_TEXT,
  DEFAULT_TYPE_SCALE_UNIT,
  LEGACY_PALETTE_STORAGE_KEY,
  LEGACY_TYPOGRAPHY_STORAGE_KEY,
  WORKSPACE_STORAGE_KEY,
  loadWorkspace,
  withSharedName,
  withTypographySlice,
  type WorkspaceLoadInput,
  type TypeScaleUnit,
  type TypeSystem,
  type TypographyProjectData,
} from "@blueprint/ui";
import { PREVIEW_TEMPLATES, type PreviewTemplateId } from "./preview-templates";

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

/* Every key the workspace can come from, so loadWorkspace decides which one
   wins rather than this module guessing. */
function readStorageKeys(): WorkspaceLoadInput {
  return {
    workspace: window.localStorage.getItem(WORKSPACE_STORAGE_KEY),
    legacyPalette: window.localStorage.getItem(LEGACY_PALETTE_STORAGE_KEY),
    legacyTypography: window.localStorage.getItem(
      LEGACY_TYPOGRAPHY_STORAGE_KEY,
    ),
  };
}

/* The workspace name as this tab last saw it. See the note in PaletteStudio:
   only the tab that changed the name may write it. */
let adoptedName: string | null = null;

export function readStoredProject(): TypographyProject | null {
  try {
    const workspace = loadWorkspace(readStorageKeys()).project;
    adoptedName = workspace?.name ?? null;
    /* Adopt the workspace name: it is one name, and the other studio may have
       set it. */
    return narrowTemplate(
      workspace ? withSharedName(workspace).typography : null,
    );
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

/**
 * Persist the typography half, and only that half.
 *
 * The stored workspace is re-read rather than reused from state: the palette
 * studio owns the other slice and may have written it since this page loaded.
 * Clearing the project nulls this slice rather than removing the key, so a
 * new type scale never costs someone their palette.
 */
export function writeStoredProject(project: TypographyProject | null): void {
  try {
    const current = loadWorkspace(readStorageKeys()).project;
    const renamedHere = !!project && project.system.name !== adoptedName;
    const next = withSharedName(
      withTypographySlice(
        current,
        project,
        renamedHere ? project.system.name : undefined,
      ),
    );
    adoptedName = next.name;
    window.localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* A storage that will not take a write is not something the studio can
       resolve, and losing the session is worse than losing the save. */
  }
}
