import {
  readLegacyPaletteName,
  readPaletteProjectData,
} from "./palette-project";
import { readSemanticTokens, semanticsForPalette } from "./semantics";
import {
  elevationOrDefault,
  radiusOrDefault,
  spacingOrDefault,
} from "./scale-slices";
import { defaultElevationScale } from "../scale/elevation";
import { defaultRadiusScale } from "../scale/radius";
import { defaultSpacingScale } from "../scale/spacing";
import { readTypographyProjectData } from "./typography-project";
import type { TypographyProjectData, WorkspaceProject } from "./types";
import type { PaletteProjectData } from "../color/export";
import type { SemanticToken } from "../color/semantic";
import type { ElevationScale } from "../scale/elevation";
import type { RadiusScale } from "../scale/radius";
import type { SpacingScale } from "../scale/spacing";

export const WORKSPACE_STORAGE_KEY = "blueprint.workspace.v1";

/* The keys the two studios wrote before they shared a document. Read to
   migrate from, and retired once the workspace they became reads back — see
   `retireLegacyKeys`. Nothing has written them since the studios moved onto the
   workspace. */
export const LEGACY_PALETTE_STORAGE_KEY = "blueprint.palette-project.v1";
export const LEGACY_TYPOGRAPHY_STORAGE_KEY = "blueprint.typography-project.v1";

export const LEGACY_STORAGE_KEYS: readonly string[] = [
  LEGACY_PALETTE_STORAGE_KEY,
  LEGACY_TYPOGRAPHY_STORAGE_KEY,
];

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
  const palette = readPaletteProjectData(value.palette);
  return {
    name: value.name as string,
    palette,
    typography: readTypographyProjectData(value.typography),
    semantics:
      readSemanticTokens(value.semantics) ?? semanticsForPalette(palette),
    spacing: spacingOrDefault(value.spacing),
    radius: radiusOrDefault(value.radius),
    elevation: elevationOrDefault(value.elevation),
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

     Read off the raw value rather than the parsed slice, which has no name of
     its own — this is legacy data, so the field is still there to read.

     Blank counts as absent rather than as a name. ?? would keep an empty
     string, and a workspace called "" is a topbar someone has to guess at. */
  const name =
    [readLegacyPaletteName(paletteValue), typography?.system.name]
      .map((candidate) => candidate?.trim())
      .find((candidate) => candidate) ?? DEFAULT_WORKSPACE_NAME;

  return {
    name,
    palette,
    typography,
    semantics: semanticsForPalette(palette),
    spacing: defaultSpacingScale(),
    radius: defaultRadiusScale(),
    elevation: defaultElevationScale(),
  };
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
/** The part of Storage this needs, so a test can pass a plain object. */
export type LegacyKeyStore = Pick<Storage, "getItem" | "removeItem">;

/**
 * Remove the pre-workspace keys, once the workspace has taken over.
 *
 * Safe to call on every load: it removes nothing until the workspace key holds
 * something that reads back as a workspace, so a migration that has not been
 * persisted yet still has its source to fall back on.
 *
 * They were kept "for one release" so a browser that hit a bug could be
 * recovered by clearing one key. Two things have happened since that make
 * keeping them worse than dropping them.
 *
 * A project file exists now. Stage 6 shipped `.blueprint-workspace`, which is
 * an explicit, current, portable backup — better than a snapshot the user
 * cannot see, cannot refresh and did not ask for.
 *
 * And the snapshot has gone stale in a way that makes the recovery a lie. The
 * legacy keys carry a palette and a type scale, and a workspace now carries
 * semantics, spacing, radius and elevation as well. Rebuilding from them
 * restores two slices and silently resets four to defaults, while looking like
 * it worked. Nothing has written them since the studios moved across, so the
 * palette in them is from whenever the migration ran rather than from the last
 * edit.
 *
 * Returns whether anything was removed, which is only useful to a test.
 */
export function retireLegacyKeys(storage: LegacyKeyStore): boolean {
  const workspace = readWorkspaceProject(
    parseJson(storage.getItem(WORKSPACE_STORAGE_KEY)),
  );
  if (!workspace) return false;

  let removed = false;
  for (const key of LEGACY_STORAGE_KEYS) {
    if (storage.getItem(key) === null) continue;
    storage.removeItem(key);
    removed = true;
  }
  return removed;
}

export function loadWorkspace(input: WorkspaceLoadInput): WorkspaceLoadResult {
  const stored = readWorkspaceProject(parseJson(input.workspace));
  if (stored) return { project: stored, migrated: false };

  const project = workspaceFromLegacy(
    parseJson(input.legacyPalette),
    parseJson(input.legacyTypography),
  );
  return { project, migrated: project !== null };
}

/** A workspace with neither studio opened. */
export function emptyWorkspace(
  name = DEFAULT_WORKSPACE_NAME,
): WorkspaceProject {
  return {
    name,
    palette: null,
    typography: null,
    semantics: null,
    spacing: defaultSpacingScale(),
    radius: defaultRadiusScale(),
    elevation: defaultElevationScale(),
  };
}

/*
 * Replacing one slice, keeping whatever the other holds.
 *
 * A studio must never write a slice it does not own, and it cannot know what
 * the other one has been doing. So it re-reads the stored workspace and patches
 * its own half rather than persisting the copy it loaded — which narrows a
 * clobber to a single write instead of a whole session.
 */

export function withPaletteSlice(
  current: WorkspaceProject | null,
  palette: PaletteProjectData | null,
  name?: string,
): WorkspaceProject {
  const base = current ?? emptyWorkspace();
  const next = name?.trim() || base.name;
  /* A workspace that gains its first palette gains a layer with it. An edit to
     a palette that already has one changes nothing here: the references follow
     the primitives on their own, which is the point of storing a reference. */
  const semantics = base.semantics ?? semanticsForPalette(palette);
  return { ...base, name: next, palette, semantics };
}

/**
 * Replace the semantic layer, keeping the other slices.
 *
 * Its own writer for the same reason the other two have one: the editor owns
 * this slice and must not carry a stale copy of a palette somebody edited in
 * another tab back over the top of it.
 */
/**
 * Replace the spacing scale, keeping the other slices.
 *
 * Its own writer for the same reason the others have one: whoever edits this
 * must not carry a stale copy of a palette somebody changed in another tab
 * back over the top of it.
 */
export function withSpacingSlice(
  current: WorkspaceProject | null,
  spacing: SpacingScale,
): WorkspaceProject {
  return { ...(current ?? emptyWorkspace()), spacing };
}

/** Replace the radius scale, keeping the other slices. */
export function withRadiusSlice(
  current: WorkspaceProject | null,
  radius: RadiusScale,
): WorkspaceProject {
  return { ...(current ?? emptyWorkspace()), radius };
}

/** Replace the elevation scale, keeping the other slices. */
export function withElevationSlice(
  current: WorkspaceProject | null,
  elevation: ElevationScale,
): WorkspaceProject {
  return { ...(current ?? emptyWorkspace()), elevation };
}

export function withSemanticsSlice(
  current: WorkspaceProject | null,
  semantics: SemanticToken[] | null,
): WorkspaceProject {
  return { ...(current ?? emptyWorkspace()), semantics };
}

export function withTypographySlice(
  current: WorkspaceProject | null,
  typography: TypographyProjectData | null,
  name?: string,
): WorkspaceProject {
  const base = current ?? emptyWorkspace();
  const next = name?.trim() || base.name;
  return { ...base, name: next, typography };
}

/**
 * Push the workspace name down into the typography slice.
 *
 * The name belongs to the workspace. Typography keeps its own copy because
 * things outside the topbar read it — the type export and the accessibility
 * report's `systemName`. The palette slice does not, and no longer has the
 * field: nothing but the topbar ever read that copy, which is why it went.
 *
 * Applying this on load is what makes the topbars edit one name: whichever
 * studio renamed last, the others adopt it rather than quietly disagreeing
 * and overwriting on the next save.
 */
export function withSharedName(project: WorkspaceProject): WorkspaceProject {
  return {
    ...project,
    typography: project.typography
      ? {
          ...project.typography,
          system: { ...project.typography.system, name: project.name },
        }
      : null,
  };
}
