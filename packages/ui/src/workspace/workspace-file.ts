import {
  BLUEPRINT_PROJECT_FILE_VERSION,
  type PaletteProjectData,
} from "../color/export";
import {
  readLegacyPaletteName,
  readPaletteProjectData,
} from "./palette-project";
import {
  filledSemanticsForPalette,
  readRemovedSeedRoles,
  readSemanticTokens,
  semanticsForPalette,
} from "./semantics";
import {
  elevationOrDefault,
  radiusOrDefault,
  spacingOrDefault,
} from "./scale-slices";
import { readTypographyProjectData } from "./typography-project";
import { DEFAULT_WORKSPACE_NAME } from "./workspace";
import type { WorkspaceProject } from "./types";

export const BLUEPRINT_WORKSPACE_FILE_VERSION = 7;

/**
 * Versions this build can open.
 *
 * A strict equality on the current version is what shipped, and it would have
 * refused every file anybody had already saved the moment the semantic slice
 * was added. A version is a statement about what a file contains, not a
 * demand that it was written by this exact build: each earlier version differs
 * only by lacking a slice that is filled on the way in — semantics at 2, the
 * spacing scale at 3, radius at 4, elevation at 5.
 *
 * Six is the first that is not a missing slice. A semantic reference can carry
 * an alpha, and a file written at 5 has none anywhere: absent means opaque, so
 * every version-5 file reads as the file it always was and needs nothing
 * filled. The number moved anyway, because the migration that matters runs the
 * other way. A build that only knows 5, handed a file with `alpha: 0.12` in it,
 * would read the reference, ignore the field it does not know, and hand back a
 * solid divider — a silent change to somebody's system with nothing anywhere
 * saying so. Refusing the file is the honest failure, and only a version number
 * it does not recognise can make it refuse.
 *
 * Seven is the same argument again, and it is the stronger case of the two.
 * `removedSeedRoles` names the seed roles a workspace has deliberately thrown
 * away. A file written at 6 has none, and an absent list already means "nothing
 * was removed", so it reads back unchanged. But a build that only knows 6,
 * handed a file that says `border.subtle` was deleted, drops the list, finds
 * the role missing from the layer and puts it back — undoing a decision
 * somebody made, in the one direction the reader was built to be helpful in.
 * An alpha silently lost changes a colour; this silently reverses an edit.
 */
export const SUPPORTED_WORKSPACE_FILE_VERSIONS: readonly number[] = [
  1, 2, 3, 4, 5, 6, 7,
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

function paletteOnlyWorkspace(
  project: PaletteProjectData,
  name: string | null,
): WorkspaceProject {
  /* An older file names a palette and knows nothing of a type scale. Null
     rather than an empty system, so the typography studio still offers to
     create one instead of opening a scale nobody chose.

     The name is read off the raw file rather than the parsed slice, which has
     none — it is the only thing in one of these files the workspace still
     takes its name from. */
  return {
    name: name ?? DEFAULT_WORKSPACE_NAME,
    palette: project,
    typography: null,
    semantics: semanticsForPalette(project),
    removedSeedRoles: [],
    spacing: spacingOrDefault(undefined),
    radius: radiusOrDefault(undefined),
    elevation: elevationOrDefault(undefined),
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
    return paletteOnlyWorkspace(palette, readLegacyPaletteName(parsed.project));
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

  const removedSeedRoles = readRemovedSeedRoles(raw.removedSeedRoles);

  /* Each earlier version is missing a slice and gains it here. Nothing else
     about the shape has changed across the three. */
  return {
    name: raw.name,
    palette,
    typography,
    /* Topped up to the current seed set, the same way stored data is. This
       path used to read the layer and stop, so a workspace *file* could never
       gain a role added after it was saved while a workspace in localStorage
       gained it on the next read — the same document, two answers, decided by
       which door it came through. Found when six roles moved over from the
       studio's chrome and the docs app, which reads a file, kept exporting
       nineteen. */
    semantics:
      filledSemanticsForPalette(
        readSemanticTokens(raw.semantics),
        palette,
        removedSeedRoles,
      ) ?? semanticsForPalette(palette),
    /* Read through the same door as the layer it belongs to. A file opened
       here and a workspace read out of storage have to agree about which roles
       were thrown away, or the same document gives two answers depending on
       which way it came in — the fault the semantic top-up itself shipped
       once. */
    removedSeedRoles,
    spacing: spacingOrDefault(raw.spacing),
    radius: radiusOrDefault(raw.radius),
    elevation: elevationOrDefault(raw.elevation),
  };
}
