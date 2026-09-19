"use client";

import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { WorkspaceLibrarySummary } from "./library";
import {
  addStoredWorkspace,
  browserWorkspaceStorage,
  duplicateStoredWorkspace,
  loadStoredLibrary,
  removeStoredWorkspace,
  saveStoredWorkspace,
  switchStoredWorkspace,
  updateStoredWorkspace,
} from "./store";
import type { WorkspaceProject } from "./types";

export interface WorkspaceLibraryView {
  currentId: string | null;
  summaries: WorkspaceLibrarySummary[];
}

export interface WorkspaceStore {
  /** The current workspace, or null when there is none. */
  project: WorkspaceProject | null;
  /**
   * Whether the first read has happened.
   *
   * Not the same question as `project !== null`: a browser with nothing saved
   * and a browser that has not been read yet both hold null, and only one of
   * them should be shown an empty studio.
   */
  hasLoaded: boolean;
  /** Named workspaces in this browser, for Home. */
  library: WorkspaceLibraryView;
  /** Replace the current document. */
  save: (project: WorkspaceProject) => void;
  /** Patch what is stored now, rather than what this component last read. */
  update: (
    apply: (current: WorkspaceProject | null) => WorkspaceProject,
  ) => void;
  /** Read again, for a tab that has learnt storage changed under it. */
  reload: () => void;
  /** Make this id current. Unknown ids are ignored. */
  switchTo: (id: string) => void;
  /**
   * Add a project. It becomes current. False at the cap, without writing.
   */
  add: (project: WorkspaceProject) => boolean;
  /**
   * Copy a project, land it next to the source, make it current.
   * False at the cap or when the source will not read.
   */
  duplicate: (id: string) => boolean;
  /** Delete a project. The last one returns an empty Home. */
  remove: (id: string) => void;
}

const EMPTY_LIBRARY: WorkspaceLibraryView = {
  currentId: null,
  summaries: [],
};

const WorkspaceStoreContext = createContext<WorkspaceStore | null>(null);

function viewFromSnapshot(snapshot: {
  index: { currentId: string | null };
  summaries: WorkspaceLibrarySummary[];
}): WorkspaceLibraryView {
  return {
    currentId: snapshot.index.currentId,
    summaries: snapshot.summaries,
  };
}

/**
 * The workspace, bound to React.
 *
 * One store for the tree: the rail name, Home, and the studios all read and
 * write the same current document. Home also lists the library. Separate hook
 * instances used to each keep their own copy, so a rename in one place was
 * invisible to the others until reload.
 *
 * The read is in an effect because there is no localStorage during a server
 * render, and reading one in a state initializer desyncs hydration — which is
 * the note every studio carries at its own read.
 */
function useWorkspaceStoreState(): WorkspaceStore {
  const [project, setProject] = useState<WorkspaceProject | null>(null);
  const [library, setLibrary] = useState<WorkspaceLibraryView>(EMPTY_LIBRARY);
  const [hasLoaded, setHasLoaded] = useState(false);
  const currentIdRef = useRef<string | null>(null);

  const applyView = useCallback((view: WorkspaceLibraryView) => {
    currentIdRef.current = view.currentId;
    setLibrary(view);
  }, []);

  const applySnapshot = useCallback(
    (
      snapshot: {
        index: { currentId: string | null };
        current: WorkspaceProject | null;
        summaries: WorkspaceLibrarySummary[];
      } | null,
    ) => {
      if (!snapshot) return;
      setProject(snapshot.current);
      applyView(viewFromSnapshot(snapshot));
    },
    [applyView],
  );

  const reload = useCallback(() => {
    applySnapshot(loadStoredLibrary(browserWorkspaceStorage()));
    setHasLoaded(true);
  }, [applySnapshot]);

  useEffect(() => {
    /* Reading storage must happen in an effect: a useState initializer would
       run during SSR, where window does not exist, and desync hydration. The
       cascading render the rule warns about is the one this is for. */
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
  }, [reload]);

  const save = useCallback(
    (next: WorkspaceProject) => {
      const storage = browserWorkspaceStorage();
      saveStoredWorkspace(storage, next);
      setProject(next);
      const currentId = currentIdRef.current;
      if (!currentId) {
        applySnapshot(loadStoredLibrary(storage));
        return;
      }
      setLibrary((lib) => ({
        ...lib,
        summaries: lib.summaries.map((entry) =>
          entry.id === currentId
            ? { ...entry, name: next.name, project: next }
            : entry,
        ),
      }));
    },
    [applySnapshot],
  );

  const update = useCallback(
    (apply: (current: WorkspaceProject | null) => WorkspaceProject) => {
      const storage = browserWorkspaceStorage();
      const next = updateStoredWorkspace(storage, apply);
      if (!next) return;
      setProject(next);
      const currentId = currentIdRef.current;
      if (!currentId) {
        applySnapshot(loadStoredLibrary(storage));
        return;
      }
      setLibrary((lib) => ({
        ...lib,
        summaries: lib.summaries.map((entry) =>
          entry.id === currentId
            ? { ...entry, name: next.name, project: next }
            : entry,
        ),
      }));
    },
    [applySnapshot],
  );

  const switchTo = useCallback(
    (id: string) => {
      applySnapshot(switchStoredWorkspace(browserWorkspaceStorage(), id));
    },
    [applySnapshot],
  );

  const add = useCallback(
    (next: WorkspaceProject) => {
      const snapshot = addStoredWorkspace(browserWorkspaceStorage(), next);
      if (!snapshot) return false;
      applySnapshot(snapshot);
      return true;
    },
    [applySnapshot],
  );

  const duplicate = useCallback(
    (id: string) => {
      const snapshot = duplicateStoredWorkspace(browserWorkspaceStorage(), id);
      if (!snapshot) return false;
      applySnapshot(snapshot);
      return true;
    },
    [applySnapshot],
  );

  const remove = useCallback(
    (id: string) => {
      applySnapshot(removeStoredWorkspace(browserWorkspaceStorage(), id));
    },
    [applySnapshot],
  );

  return {
    project,
    hasLoaded,
    library,
    save,
    update,
    reload,
    switchTo,
    add,
    duplicate,
    remove,
  };
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
