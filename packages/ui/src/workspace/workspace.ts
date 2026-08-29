import { readPaletteProjectData } from "./palette-project";
import { readTypographyProjectData } from "./typography-project";
import type { WorkspaceProject } from "./types";

export const WORKSPACE_STORAGE_KEY = "blueprint.workspace.v1";

/* The keys the two studios wrote before they shared a document. Still read, and
   still left in place after a migration, so a browser that hits a bug can be
   recovered by clearing one key rather than losing the work. */
export const LEGACY_PALETTE_STORAGE_KEY = "blueprint.palette-project.v1";
export const LEGACY_TYPOGRAPHY_STORAGE_KEY = "blueprint.typography-project.v1";

/** The name a workspace takes when neither half carried one. */
export const DEFAULT_WORKSPACE_NAME = "Untitled workspace";

export interface WorkspaceLoadInput {
  /** Raw contents of the workspace key, or null when unset. */
  workspace: string | null;
  legacyPalette: string | null;
  legacyTypography: string | null;
}

export interface WorkspaceLoadResult {
  project: WorkspaceProject | null;
  /**
   * True when the workspace was rebuilt from the legacy keys, which is the
   * caller's cue to persist it. False when it was read from the workspace key,
   * or when there was nothing anywhere to read.
   */
  migrated: boolean;
}

function parseJson(source: string | null): unknown {
  if (!source) return null;
  try {
    return JSON.parse(source);
  } catch {
    return null;
  }
}

/**
 * Whether a value is a workspace rather than one of the documents that came
 * before it.
 *
 * A legacy palette project also carries a `name`, so the name alone decides
 * nothing. Naming a slice is what makes this a workspace, and a slice that is
 * present and null still counts — that is a studio someone has not opened, not
 * a missing field.
 */
function isWorkspaceShape(value: unknown): value is Record<string, unknown> {
  return (
    !!value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    "name" in value &&
    typeof (value as { name: unknown }).name === "string" &&
    ("palette" in value || "typography" in value)
  );
}

/** Read a stored workspace, salvaging each slice on its own. */
export function readWorkspaceProject(value: unknown): WorkspaceProject | null {
  if (!isWorkspaceShape(value)) return null;

  /* Slices are read independently: a corrupt palette must not cost someone
     their type scale, and the reverse. */
  return {
    name: value.name as string,
    palette: readPaletteProjectData(value.palette),
    typography: readTypographyProjectData(value.typography),
  };
}

/**
 * Build a workspace from whatever the two old keys hold.
 *
 * Returns null when neither is readable, which is how a browser with nothing
 * saved is told apart from one whose data needs upgrading.
 */
export function workspaceFromLegacy(
  paletteValue: unknown,
  typographyValue: unknown,
): WorkspaceProject | null {
  const palette = readPaletteProjectData(paletteValue);
  const typography = readTypographyProjectData(typographyValue);
  if (!palette && !typography) return null;

  /* The palette's name wins when both exist: it is the default route, so it is
     the more likely of the two to be the one someone deliberately named.

     Blank counts as absent rather than as a name. ?? would keep an empty
     string, and a workspace called "" is a topbar someone has to guess at. */
  const name =
    [palette?.name, typography?.system.name]
      .map((candidate) => candidate?.trim())
      .find((candidate) => candidate) ?? DEFAULT_WORKSPACE_NAME;

  return { name, palette, typography };
}

/**
 * Load the workspace, upgrading the previous two documents if that is all there
 * is.
 *
 * Pure: it takes the raw strings rather than reading storage itself, so the
 * decisions are testable and the I/O stays with the caller. Running it twice
 * over the same input gives the same workspace, since a migration leaves the
 * legacy keys where they were.
 */
export function loadWorkspace(input: WorkspaceLoadInput): WorkspaceLoadResult {
  const stored = readWorkspaceProject(parseJson(input.workspace));
  if (stored) return { project: stored, migrated: false };

  const project = workspaceFromLegacy(
    parseJson(input.legacyPalette),
    parseJson(input.legacyTypography),
  );
  return { project, migrated: project !== null };
}
