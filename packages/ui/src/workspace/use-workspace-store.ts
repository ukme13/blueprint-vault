"use client";

import { useCallback, useEffect, useState } from "react";
import {
  browserWorkspaceStorage,
  loadStoredWorkspace,
  saveStoredWorkspace,
  updateStoredWorkspace,
} from "./store";
import type { WorkspaceProject } from "./types";

export interface WorkspaceStore {
  /** The stored workspace, or null when there is none. */
  project: WorkspaceProject | null;
  /**
   * Whether the first read has happened.
   *
   * Not the same question as `project !== null`: a browser with nothing saved
   * and a browser that has not been read yet both hold null, and only one of
   * them should be shown an empty studio.
   */
  hasLoaded: boolean;
  /** Replace the whole workspace. */
  save: (project: WorkspaceProject) => void;
  /** Patch what is stored now, rather than what this component last read. */
  update: (
    apply: (current: WorkspaceProject | null) => WorkspaceProject,
  ) => void;
  /** Read again, for a tab that has learnt storage changed under it. */
  reload: () => void;
}

/**
 * The workspace, bound to React.
 *
 * Every read goes through `store`, which is the only thing that touches
 * storage. This adds what React needs on top of it and nothing else: when the
 * first read is allowed to happen, and how a write gets back into state.
 *
 * The read is in an effect because there is no localStorage during a server
 * render, and reading one in a state initializer desyncs hydration — which is
 * the note every studio carries at its own read.
 */
export function useWorkspaceStore(): WorkspaceStore {
  const [project, setProject] = useState<WorkspaceProject | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  const reload = useCallback(() => {
    setProject(loadStoredWorkspace(browserWorkspaceStorage()));
    setHasLoaded(true);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const save = useCallback((next: WorkspaceProject) => {
    saveStoredWorkspace(browserWorkspaceStorage(), next);
    setProject(next);
  }, []);

  const update = useCallback(
    (apply: (current: WorkspaceProject | null) => WorkspaceProject) => {
      const next = updateStoredWorkspace(browserWorkspaceStorage(), apply);
      /* Only when the write had somewhere to go. State following a write that
         never landed is a studio showing something storage does not have. */
      if (next) setProject(next);
    },
    [],
  );

  return { project, hasLoaded, save, update, reload };
}
