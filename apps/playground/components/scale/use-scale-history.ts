"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createScaleHistory,
  scaleSnapshotOf,
  workspaceWithScaleSnapshot,
  type ScaleSnapshot,
  type WorkspaceStore,
} from "@blueprint/ui";

/**
 * Undo and redo for the scale slices, bound to React.
 *
 * What a snapshot is, when a write coalesces, and what an undo puts back all
 * live in `@blueprint/ui`. This is the binding: a ref for the history, two
 * booleans so a button can re-render, and the calls that put a snapshot back
 * through the store.
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
  const { project, hasLoaded, update } = store;

  const history = useRef(createScaleHistory(scaleSnapshotOf(null)));
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

  const loaded = useRef(false);
  useEffect(() => {
    if (!hasLoaded || loaded.current) return;
    loaded.current = true;
    history.current.sync(scaleSnapshotOf(project));
    refresh();
  }, [hasLoaded, project, refresh]);

  const store_ = useCallback(
    (snapshot: ScaleSnapshot) => {
      update((current) => workspaceWithScaleSnapshot(current, snapshot));
      refresh();
    },
    [update, refresh],
  );

  const write = useCallback(
    (patch: Partial<ScaleSnapshot>, options?: { editKey?: string }) => {
      store_(history.current.commit(patch, { key: options?.editKey }));
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
