import {
  BLUEPRINT_PROJECT_FILE_VERSION,
  type PaletteProjectData,
} from "../color/export";
import { readPaletteProjectData } from "./palette-project";
import { readSemanticTokens, semanticsForPalette } from "./semantics";
import { radiusOrDefault, spacingOrDefault } from "./scale-slices";
import { readTypographyProjectData } from "./typography-project";
import { DEFAULT_WORKSPACE_NAME } from "./workspace";
import type { WorkspaceProject } from "./types";

export const BLUEPRINT_WORKSPACE_FILE_VERSION = 4;

/**
 * Versions this build can open.
 *
 * A strict equality on the current version is what shipped, and it would have
 * refused every file anybody had already saved the moment the semantic slice
 * was added. A version is a statement about what a file contains, not a
 * demand that it was written by this exact build: each earlier version differs
 * only by lacking a slice that is filled on the way in — semantics at 2, the
 * spacing scale at 3, radius at 4.
 */
export const SUPPORTED_WORKSPACE_FILE_VERSIONS: readonly number[] = [
  1, 2, 3, 4,
];

export interface BlueprintWorkspaceFile {
  kind: "blueprint-workspace";
  version: typeof BLUEPRINT_WORKSPACE_FILE_VERSION;
  project: WorkspaceProject;
}

/**
 * A workspace as a file.
 *
 * Both halves, because a project file that carried only the palette lost
 * someone's type scale the moment they exported and re-imported — which is
 * what this format exists to fix.
 *
 * Font bytes are not here and cannot be: the system carries family names and a
 * source, and an uploaded file lives in IndexedDB under the entry's id. A
 * project file is a document, not a payload. The export guard holds that up.
 */
export function formatBlueprintWorkspace(project: WorkspaceProject): string {
  const file: BlueprintWorkspaceFile = {
    kind: "blueprint-workspace",
    version: BLUEPRINT_WORKSPACE_FILE_VERSION,
    project,
  };
  return `${JSON.stringify(file, null, 2)}\n`;
}

function paletteOnlyWorkspace(project: PaletteProjectData): WorkspaceProject {
  /* An older file names a palette and knows nothing of a type scale. Null
     rather than an empty system, so the typography studio still offers to
     create one instead of opening a scale nobody chose. */
  return {
    name: project.name.trim() || DEFAULT_WORKSPACE_NAME,
    palette: project,
    typography: null,
    semantics: semanticsForPalette(project),
    spacing: spacingOrDefault(undefined),
    radius: radiusOrDefault(undefined),
  };
}

/**
 * Read a Blueprint project file, whichever of the two it is.
 *
 * A `blueprint-palette` file still imports and fills the palette half, because
 * people have them and a format change is not a reason to orphan them. One
 * parser rather than two, so whoever calls this does not have to know which
 * kind they were handed.
 *
 * Throws rather than returning null: a file someone deliberately chose is
 * either the thing they meant or a mistake worth reporting. That is the
 * opposite of how stored data is read, and deliberately so.
 */
export function parseBlueprintWorkspace(source: string): WorkspaceProject {
  let parsed: unknown;
  try {
    parsed = JSON.parse(source);
  } catch {
    throw new TypeError("This is not a Blueprint project file.");
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new TypeError("This is not a Blueprint project file.");
  }
  if (!("kind" in parsed) || !("project" in parsed)) {
    throw new TypeError("This is not a Blueprint project file.");
  }

  if (parsed.kind === "blueprint-workspace") {
    if (
      !("version" in parsed) ||
      typeof parsed.version !== "number" ||
      !SUPPORTED_WORKSPACE_FILE_VERSIONS.includes(parsed.version)
    ) {
      throw new TypeError("This Blueprint project file is not supported.");
    }
    return readWorkspaceFileProject(parsed.project);
  }

  if (parsed.kind === "blueprint-palette") {
    if (
      !("version" in parsed) ||
      parsed.version !== BLUEPRINT_PROJECT_FILE_VERSION
    ) {
      throw new TypeError("This Blueprint project file is not supported.");
    }
    const palette = readPaletteProjectData(parsed.project);
    if (!palette) {
      throw new TypeError(
        "The Blueprint project data is incomplete or invalid.",
      );
    }
    return paletteOnlyWorkspace(palette);
  }

  throw new TypeError("This Blueprint project file is not supported.");
}

function readWorkspaceFileProject(value: unknown): WorkspaceProject {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("The Blueprint project data is incomplete or invalid.");
  }
  const raw = value as Record<string, unknown>;
  if (typeof raw.name !== "string" || !raw.name.trim()) {
    throw new TypeError("The Blueprint project data is incomplete or invalid.");
  }

  /* Each half read on its own, and through the same validators storage uses.
     A file with a good palette and a damaged scale is worth more than an
     error — the half that survived is still someone's work. */
  const palette = readPaletteProjectData(raw.palette);
  const typography = readTypographyProjectData(raw.typography);
  if (!palette && !typography) {
    throw new TypeError("The Blueprint project data is incomplete or invalid.");
  }

  /* Each earlier version is missing a slice and gains it here. Nothing else
     about the shape has changed across the three. */
  return {
    name: raw.name,
    palette,
    typography,
    semantics:
      readSemanticTokens(raw.semantics) ?? semanticsForPalette(palette),
    spacing: spacingOrDefault(raw.spacing),
    radius: radiusOrDefault(raw.radius),
  };
}
