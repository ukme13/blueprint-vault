import { createHistory, type History } from "../history";
import type { WorkspaceProject } from "./types";
import { undoableParts } from "./undoable-parts";
import {
  changedSemanticTargets,
  originOfChange,
  type WorkspaceOrigin,
  type WorkspaceTarget,
} from "./workspace-origin";

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
   *
   * `origin` is where the edit was made, for a place that is not a studio the
   * change would name (the Preview's tags set layout uses). Without it the
   * origin is read from what changed.
   */
  commit(
    project: WorkspaceProject,
    options?: { key?: WorkspaceEditKey; origin?: WorkspaceOrigin },
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
  /**
   * Where the edit the last undo or redo moved over was made, or null.
   *
   * Undoing takes back the edit that was made last, so it is that edit's
   * place; redoing puts one back, and it is that one's. Read straight after
   * the call. Null after a commit or a sync.
   */
  readonly lastOrigin: WorkspaceOrigin | null;
  /**
   * What the last undo or redo changed in the semantic layer, to point at.
   * Empty when it changed nothing there, and after a commit or a sync.
   */
  readonly lastTargets: readonly WorkspaceTarget[];
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly size: number;
}

interface Entry {
  project: WorkspaceProject;
  key: string;
  /** Where the edit that made this version was made. */
  origin: WorkspaceOrigin | null;
}

const entryOf = (
  project: WorkspaceProject,
  origin: WorkspaceOrigin | null = null,
): Entry => ({
  project,
  key: undoableKey(project),
  origin,
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
  let lastOrigin: WorkspaceOrigin | null = null;
  let lastTargets: readonly WorkspaceTarget[] = [];

  return {
    commit(project, options) {
      const previous = history.present;
      const entry = entryOf(project);
      if (entry.key === previous?.key) return false;
      lastOrigin = null;
      lastTargets = [];
      entry.origin =
        options?.origin ??
        (previous ? originOfChange(previous.project, project) : null);
      const key = options?.key;
      const coalesces = key !== undefined && key === openEdit;
      openEdit = key;
      if (coalesces) history.replaceTop(entry);
      else history.push(entry);
      return true;
    },

    sync(project) {
      openEdit = undefined;
      lastOrigin = null;
      lastTargets = [];
      history.sync(entryOf(project));
    },

    undo() {
      openEdit = undefined;
      /* The version being left is the edit being taken back. */
      const leaving = history.present?.origin ?? null;
      const left = history.present?.project;
      const target = history.undo();
      lastOrigin = target ? leaving : null;
      lastTargets =
        left && target ? changedSemanticTargets(left, target.project) : [];
      return target?.project ?? null;
    },

    redo() {
      openEdit = undefined;
      const left = history.present?.project;
      const target = history.redo();
      lastOrigin = target?.origin ?? null;
      lastTargets =
        left && target ? changedSemanticTargets(left, target.project) : [];
      return target?.project ?? null;
    },

    get lastOrigin() {
      return lastOrigin;
    },

    get lastTargets() {
      return lastTargets;
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
