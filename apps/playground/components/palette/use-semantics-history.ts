"use client";

import { useCallback } from "react";
import {
  semanticsSnapshotOf,
  snapshotAfterEdit,
  workspaceWithSnapshot,
  type ButtonScheme,
  type SemanticToken,
  type WorkspaceStore,
} from "@blueprint/ui";

/**
 * Undo and redo for the semantic slice, through the workspace's history.
 *
 * The history is the store's, shared by every studio, so an edit here can be
 * undone from another studio and the reverse. What is left is the write: the
 * layer, with what an edit does to the removed-seed list and the button
 * schemes, applied to what is stored now. `editKey` is how a caller says this
 * write continues the one before it: an in-place rename commits on every
 * keystroke and passes the same key each time, so the whole edit is one undo.
 * A different key, or none, starts a step.
 */

export interface SemanticsHistoryBinding {
  write: (
    tokens: SemanticToken[] | null,
    options?: {
      editKey?: string;
      justRemoved?: readonly string[];
      buttonSchemes?: readonly ButtonScheme[];
    },
  ) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export function useSemanticsHistory(
  store: WorkspaceStore,
): SemanticsHistoryBinding {
  const { update, undo, redo, canUndo, canRedo } = store;

  const write = useCallback(
    (
      tokens: SemanticToken[] | null,
      options?: {
        editKey?: string;
        justRemoved?: readonly string[];
        buttonSchemes?: readonly ButtonScheme[];
      },
    ) => {
      /* Through `update`, so the write re-reads what is stored before patching
         its own slice: an edit that carried this page's copy of the workspace
         would put a stale palette back with it. */
      update(
        (current) =>
          workspaceWithSnapshot(
            current,
            snapshotAfterEdit(
              semanticsSnapshotOf(current),
              tokens,
              options?.justRemoved,
              options?.buttonSchemes,
            ),
          ),
        { key: options?.editKey },
      );
    },
    [update],
  );

  return { write, undo, redo, canUndo, canRedo };
}
