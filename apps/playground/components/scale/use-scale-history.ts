"use client";

import { useCallback } from "react";
import {
  scaleSnapshotOf,
  workspaceWithScaleSnapshot,
  type ScaleSnapshot,
  type WorkspaceStore,
} from "@blueprint/ui";

/**
 * Undo and redo for the scale slices, through the workspace's history.
 *
 * The history itself is the store's, shared by every studio and kept when one
 * is left. What is left here is the write: a patch of the scale slices,
 * applied to what is stored now, with the control it came from as its key so
 * a slider dragged is one step.
 */

export interface ScaleHistoryBinding {
  write: (
    patch: Partial<ScaleSnapshot>,
    options?: { editKey?: string },
  ) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export function useScaleHistory(store: WorkspaceStore): ScaleHistoryBinding {
  const { update, undo, redo, canUndo, canRedo } = store;

  const write = useCallback(
    (patch: Partial<ScaleSnapshot>, options?: { editKey?: string }) => {
      update(
        (current) =>
          workspaceWithScaleSnapshot(current, {
            ...scaleSnapshotOf(current),
            ...patch,
          }),
        { key: options?.editKey },
      );
    },
    [update],
  );

  return { write, undo, redo, canUndo, canRedo };
}
