"use client";

import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
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

const WorkspaceStoreContext = createContext<WorkspaceStore | null>(null);

/**
 * The workspace, bound to React.
 *
 * One store for the tree: the rail name, Home, and the studios all read and
 * write the same document. Separate hook instances used to each keep their
 * own copy, so a rename in one place was invisible to the others until reload.
 *
 * The read is in an effect because there is no localStorage during a server
 * render, and reading one in a state initializer desyncs hydration — which is
 * the note every studio carries at its own read.
 */
function useWorkspaceStoreState(): WorkspaceStore {
  const [project, setProject] = useState<WorkspaceProject | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  const reload = useCallback(() => {
    setProject(loadStoredWorkspace(browserWorkspaceStorage()));
    setHasLoaded(true);
  }, []);

  useEffect(() => {
    /* Reading storage must happen in an effect: a useState initializer would
       run during SSR, where window does not exist, and desync hydration. The
       cascading render the rule warns about is the one this is for. */
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

/** One workspace store for Home, the rail, and the studios. */
export function WorkspaceStoreProvider({ children }: { children: ReactNode }) {
  const store = useWorkspaceStoreState();
  return createElement(
    WorkspaceStoreContext.Provider,
    { value: store },
    children,
  );
}

/** The workspace, bound to React. Must sit under `WorkspaceStoreProvider`. */
export function useWorkspaceStore(): WorkspaceStore {
  const store = useContext(WorkspaceStoreContext);
  if (!store) {
    throw new Error(
      "useWorkspaceStore must be used within WorkspaceStoreProvider",
    );
  }
  return store;
}
