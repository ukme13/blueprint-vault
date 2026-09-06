import { createHistory, type History } from "../history";
import type { SemanticToken } from "../color/semantic";
import { rememberRemovedSeedRoles } from "../color/semantic";
import type { WorkspaceProject } from "./types";
import { emptyWorkspace } from "./workspace";

/**
 * Undo for the semantic slice.
 *
 * The generic history holds values; this says which value. Everything below is
 * pure and free of React, so the studio's hook is the twenty lines that bind
 * it to state and nothing else — which is the architecture rule, and also what
 * makes the awkward cases testable without a browser.
 *
 * See docs/roadmap/semantic-table-editor.md.
 */

/**
 * One undoable state of the semantic slice.
 *
 * The layer **and** the removed-seed list, because the two are one fact.
 * Undoing a delete has to put the token back *and* forget that it was removed:
 * a history that held only the token array would restore the role, leave
 * `border.subtle` on the removed list, and the next read would take it straight
 * back out again — an undo that appears to work and is gone after a reload.
 *
 * That is the whole reason this type exists rather than `SemanticToken[]`.
 */
export interface SemanticsSnapshot {
  tokens: SemanticToken[] | null;
  removedSeedRoles: string[];
}

/** How many undo steps the semantic slice keeps. */
export const SEMANTICS_HISTORY_LIMIT = 50;

/** The slice as it stands in a workspace. */
export function semanticsSnapshotOf(
  project: WorkspaceProject | null,
): SemanticsSnapshot {
  return {
    tokens: project?.semantics ?? null,
    removedSeedRoles: project?.removedSeedRoles ?? [],
  };
}

/**
 * A workspace with this snapshot in it.
 *
 * The list is written as the snapshot holds it rather than recomputed. That is
 * the difference between undo and another edit: `withSemanticsSlice` reconciles
 * a list against a layer because a *new* edit has to, and an undo is restoring
 * a pair that was already consistent when it was recorded. Recomputing here
 * would drop a removal the moment its token came back, which is exactly the
 * step being undone.
 */
export function workspaceWithSnapshot(
  current: WorkspaceProject | null,
  snapshot: SemanticsSnapshot,
): WorkspaceProject {
  return {
    ...(current ?? emptyWorkspace()),
    semantics: snapshot.tokens,
    removedSeedRoles: snapshot.removedSeedRoles,
  };
}

/**
 * The snapshot an edit produces, list and all.
 *
 * The same reconciliation `withSemanticsSlice` does, done here so a caller
 * records exactly what it is about to store. Two paths computing the list
 * separately is how a history ends up holding a state the workspace never had.
 */
export function snapshotAfterEdit(
  previous: SemanticsSnapshot,
  tokens: SemanticToken[] | null,
  justRemoved: readonly string[] = [],
): SemanticsSnapshot {
  return {
    tokens,
    removedSeedRoles: rememberRemovedSeedRoles(
      previous.removedSeedRoles,
      tokens,
      justRemoved,
    ),
  };
}

/**
 * How one write relates to the write before it.
 *
 * A plain boolean was the first shape and it is not enough. "This continues
 * the previous edit" is true of the fourth keystroke in a cell and equally
 * true of the first keystroke in the *next* cell, so a boolean coalesces two
 * different edits into one step and makes one undo take back both.
 *
 * A key says *which* edit. Consecutive writes carrying the same key replace
 * the top; a different key, or none, starts a step. `rename:surface.raised`
 * coalesces with itself and not with `rename:surface.base`, and moving to the
 * next cell begins a new step without the editor having to announce that the
 * old one ended.
 */
export type EditKey = string | undefined;

export interface SemanticsHistory {
  /**
   * Record an edit this session made, and return the snapshot to store.
   *
   * Takes the layer rather than a snapshot, and works the removed-seed list out
   * from the step before it. A caller that assembled its own snapshot could
   * reconcile the list differently from the way it will be reconciled on the
   * next read, and the history would then hold a state the workspace never had.
   */
  commit(
    tokens: SemanticToken[] | null,
    options?: { key?: EditKey; justRemoved?: readonly string[] },
  ): SemanticsSnapshot;
  /** The slice as it stands, which is what the next edit is computed from. */
  readonly present: SemanticsSnapshot;
  /**
   * Adopt a slice this session did not produce.
   *
   * Another tab writing the same workspace, or the first read on load. Not a
   * step: undo means "take back what I did", and undoing another tab's write
   * would throw their work away with nothing to tell it from an ordinary undo.
   */
  sync(snapshot: SemanticsSnapshot): SemanticsSnapshot;
  undo(): SemanticsSnapshot | null;
  redo(): SemanticsSnapshot | null;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  /** Steps held. Bounded by the limit; the guard reads this. */
  readonly size: number;
}

/**
 * A history for the semantic slice, with the coalescing rule applied.
 *
 * Wraps the generic one rather than reimplementing it, so the bounded depth,
 * the discarded redo branch and the trimming are all the tested behaviour of
 * `createHistory` and this file only decides *when* to push versus replace.
 */
export function createSemanticsHistory(
  initial: SemanticsSnapshot,
  limit = SEMANTICS_HISTORY_LIMIT,
): SemanticsHistory {
  const history: History<SemanticsSnapshot> = createHistory({
    limit,
    initial,
  });

  /* The key of the edit the present belongs to. Reset by anything that is not
     a keyed write, so a coalescing edit cannot reach back across a delete that
     happened between two keystrokes. */
  let openEdit: EditKey;

  return {
    get present() {
      return history.present ?? initial;
    },

    commit(tokens, options) {
      const key = options?.key;
      const next = snapshotAfterEdit(
        history.present ?? initial,
        tokens,
        options?.justRemoved,
      );
      const coalesces = key !== undefined && key === openEdit;
      openEdit = key;
      return coalesces ? history.replaceTop(next) : history.push(next);
    },

    sync(snapshot) {
      /* The open edit ends here too. A write that arrived from elsewhere sits
         between this keystroke and the next, and coalescing across it would
         replace a value somebody else's tab put there. */
      openEdit = undefined;
      return history.sync(snapshot);
    },

    undo() {
      openEdit = undefined;
      return history.undo();
    },

    redo() {
      openEdit = undefined;
      return history.redo();
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
