"use client";

import { useCallback } from "react";
import {
  withMotionScale,
  type MotionScale,
  type WorkspaceStore,
} from "@blueprint/ui";

/**
 * Undo and redo for the motion scale, through the workspace's history.
 *
 * The history is the store's, shared by every studio: a pace changed here is
 * taken back from Spacing, and the person is taken here to see it. What is
 * left is the write, with the control it came from as its key, so a slider
 * dragged or a handle pulled is one step.
 */
export interface MotionHistoryBinding {
  write: (motion: MotionScale, options?: { editKey?: string }) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export function useMotionHistory(store: WorkspaceStore): MotionHistoryBinding {
  const { update, undo, redo, canUndo, canRedo } = store;

  const write = useCallback(
    (motion: MotionScale, options?: { editKey?: string }) => {
      update((current) => withMotionScale(current, motion), {
        key: options?.editKey,
      });
    },
    [update],
  );

  return { write, undo, redo, canUndo, canRedo };
}
