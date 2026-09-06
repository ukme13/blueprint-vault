"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createSemanticsHistory,
  semanticsSnapshotOf,
  workspaceWithSnapshot,
  type SemanticsSnapshot,
  type SemanticToken,
  type WorkspaceStore,
} from "@blueprint/ui";

/**
 * Undo and redo for the semantic slice, bound to React.
 *
 * Everything that decides anything is in `@blueprint/ui` — what a snapshot is,
 * when a write is a step and when it replaces one, how deep the history goes,
 * what an undo puts back. This is the binding the architecture rule allows an
 * app to hold: a ref for the history object, two booleans of state so a button
 * can re-render, and the calls that put a snapshot back through the store.
 * There is no rule here to get wrong on its own, which is why the awkward cases
 * are all tested in the package without a browser.
 *
 * See docs/roadmap/semantic-table-editor.md, stage 3.
 */

export interface SemanticsHistoryBinding {
  /**
   * Write the layer, recording one step.
   *
   * `editKey` is how a caller says this write continues the one before it: an
   * in-place rename commits on every keystroke and passes the same key each
   * time, so the whole edit is one undo. A different key, or none, starts a
   * step — which is what ends an edit when somebody moves to the next cell,
   * without the editor having to announce that it ended.
   *
   * `justRemoved` carries the ids a delete took out, so the removed-seed list
   * moves with the layer it belongs to.
   */
  write: (
    tokens: SemanticToken[] | null,
    options?: { editKey?: string; justRemoved?: readonly string[] },
  ) => void;
  /**
   * Undo and redo, ready for a keyboard.
   *
   * Stage 4 binds Ctrl+Z and Ctrl+Shift+Z to these two and nothing else. There
   * is deliberately no key handler in this file: a shortcut belongs to the
   * component that owns the focus it applies to.
   */
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export function useSemanticsHistory(
  store: WorkspaceStore,
): SemanticsHistoryBinding {
  const { project, hasLoaded, update } = store;

  /* A ref, not state: the history is a mutable object whose identity never
     changes, and holding it in state would replace it on every keystroke. */
  const history = useRef(
    createSemanticsHistory({ tokens: null, removedSeedRoles: [] }),
  );
  const [available, setAvailable] = useState({
    canUndo: false,
    canRedo: false,
  });

  const refresh = useCallback(() => {
    setAvailable({
      canUndo: history.current.canUndo,
      canRedo: history.current.canRedo,
    });
  }, []);

  /* The first read is the baseline, not a step: the layer as it was found is
     what an undo runs out at, and recording it would let somebody undo the
     act of opening the studio. `sync` is also the door a cross-tab reconcile
     comes through, and it never records either — undo means "take back what I
     did", and undoing another tab's write would throw their work away. */
  const loaded = useRef(false);
  useEffect(() => {
    if (!hasLoaded || loaded.current) return;
    loaded.current = true;
    history.current.sync(semanticsSnapshotOf(project));
    refresh();
  }, [hasLoaded, project, refresh]);

  const store_ = useCallback(
    (snapshot: SemanticsSnapshot) => {
      /* Through the store's `update`, so the write still re-reads what is
         stored before patching its own slice. An undo that carried this page's
         copy of the workspace would put a stale palette back with it. */
      update((current) => workspaceWithSnapshot(current, snapshot));
      refresh();
    },
    [update, refresh],
  );

  const write = useCallback(
    (
      tokens: SemanticToken[] | null,
      options?: { editKey?: string; justRemoved?: readonly string[] },
    ) => {
      store_(
        history.current.commit(tokens, {
          key: options?.editKey,
          justRemoved: options?.justRemoved,
        }),
      );
    },
    [store_],
  );

  const undo = useCallback(() => {
    const snapshot = history.current.undo();
    if (snapshot) store_(snapshot);
    else refresh();
  }, [store_, refresh]);

  const redo = useCallback(() => {
    const snapshot = history.current.redo();
    if (snapshot) store_(snapshot);
    else refresh();
  }, [store_, refresh]);

  return { write, undo, redo, ...available };
}
