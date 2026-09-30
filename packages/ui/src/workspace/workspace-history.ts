import { createHistory, type History } from "../history";
import type { WorkspaceProject } from "./types";

/**
 * Undo for the workspace: one history for every studio.
 *
 * The studios used to keep one each, in a ref that went when the studio did,
 * so an edit made in Typography could not be undone from Spacing. This one
 * lives in the workspace store, above every studio, and outlasts navigation.
 *
 * It holds whole documents, by reference (a document is never written into,
 * only replaced), but a step is only taken when the parts an undo owns
 * changed, and an undo puts back only those parts. What is left alone is
 * everything an undo should not reach: the name, the colours, the text typed
 * into a preview, a view setting. Without that a step would be taken for a
 * rename and an undo would quietly revert somebody's colours.
 *
 * See docs/roadmap/scale-studio.md.
 */

/** How many undo steps the workspace keeps. */
export const WORKSPACE_HISTORY_LIMIT = 50;

export type WorkspaceEditKey = string | undefined;

/**
 * The parts of a document an undo owns.
 *
 * The type system (not its name, which is the workspace's, nor the preview
 * text and settings beside it in the same slice), the scales and the layout uses that point at them, the device
 * ratios the system's own mirrors, and the semantic layer with what goes
 * with it. The palette, the name and the view settings are not here.
 */
function undoableParts(project: WorkspaceProject) {
  /* Without its name: the workspace's name is mirrored into the system, so a
     rename would otherwise read as an edit of the type scale. */
  const system = project.typography?.system;
  return {
    typographySystem: system ? { ...system, name: undefined } : null,
    spacing: project.spacing,
    radius: project.radius,
    elevation: project.elevation,
    layout: project.layout,
    previewDevices: project.previewDevices,
    semantics: project.semantics,
    removedSeedRoles: project.removedSeedRoles,
    buttonSchemes: project.buttonSchemes,
  };
}

/**
 * A comparable form of the undoable parts.
 *
 * By value, not by reference: a document read back from storage is a fresh
 * object every time, so every write would otherwise look like an edit, and
 * saving what was already there would take a step.
 */
export function undoableKey(project: WorkspaceProject): string {
  return JSON.stringify(undoableParts(project));
}

/**
 * The current document with an earlier one's undoable parts put back.
 *
 * Patched onto `current`, not swapped for `target`: the name, the palette and
 * the rest have moved on since, and an undo takes back what was edited, not
 * what happened to sit beside it.
 */
export function restoreUndoable(
  current: WorkspaceProject,
  target: WorkspaceProject,
): WorkspaceProject {
  return {
    ...current,
    typography: target.typography
      ? current.typography
        ? {
            ...current.typography,
            /* The name it has now: it follows the workspace's, not a step. */
            system: {
              ...target.typography.system,
              name: current.typography.system.name,
            },
          }
        : target.typography
      : current.typography,
    spacing: target.spacing,
    radius: target.radius,
    elevation: target.elevation,
    layout: target.layout,
    previewDevices: target.previewDevices,
    semantics: target.semantics,
    removedSeedRoles: target.removedSeedRoles,
    buttonSchemes: target.buttonSchemes,
  };
}

export interface WorkspaceHistory {
  /**
   * Record the document after an edit this session made.
   *
   * A step is taken only if the undoable parts changed; `key` coalesces
   * consecutive writes of the same control, as a slider that commits on every
   * tick would otherwise put each tick in the stack. A write with no key never
   * coalesces, and neither does the first after an undo, a redo or a sync.
   * Returns whether it was recorded.
   */
  commit(
    project: WorkspaceProject,
    options?: { key?: WorkspaceEditKey },
  ): boolean;
  /**
   * Adopt a document this session did not produce, as no step.
   *
   * The first read on load, or another tab's write. Undo means "take back what
   * I did".
   */
  sync(project: WorkspaceProject): void;
  /** The document to put back one step, or null. */
  undo(): WorkspaceProject | null;
  /** The document to put forward one step, or null. */
  redo(): WorkspaceProject | null;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly size: number;
}

interface Entry {
  project: WorkspaceProject;
  key: string;
}

const entryOf = (project: WorkspaceProject): Entry => ({
  project,
  key: undoableKey(project),
});

export function createWorkspaceHistory(
  initial: WorkspaceProject,
  limit = WORKSPACE_HISTORY_LIMIT,
): WorkspaceHistory {
  const history: History<Entry> = createHistory({
    limit,
    initial: entryOf(initial),
  });

  let openEdit: WorkspaceEditKey;

  return {
    commit(project, options) {
      const entry = entryOf(project);
      if (entry.key === history.present?.key) return false;
      const key = options?.key;
      const coalesces = key !== undefined && key === openEdit;
      openEdit = key;
      if (coalesces) history.replaceTop(entry);
      else history.push(entry);
      return true;
    },

    sync(project) {
      openEdit = undefined;
      history.sync(entryOf(project));
    },

    undo() {
      openEdit = undefined;
      return history.undo()?.project ?? null;
    },

    redo() {
      openEdit = undefined;
      return history.redo()?.project ?? null;
    },

    get canUndo() {
      return history.canUndo;
    },
    get canRedo() {
      return history.canRedo;
    },
    get size() {
      return history.size;
    },
  };
}
