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
  renameStoredWorkspace,
  saveStoredWorkspace,
  switchStoredWorkspace,
  updateStoredWorkspace,
  updateStoredWorkspaceById,
} from "./store";
import {
  copyWorkspacePreviewImages,
  previewImageStore,
  removeWorkspacePreviewImages,
} from "../preview-images";
import type { WorkspaceProject } from "./types";
import {
  createWorkspaceHistory,
  restoreUndoable,
  type WorkspaceHistory,
} from "./workspace-history";

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
  /**
   * Patch what is stored now, rather than what this component last read.
   *
   * An edit to the parts of the document an undo owns takes a step, and `key`
   * coalesces consecutive writes of one control into a single step; anything
   * else (a rename, the colours, a view setting) takes none.
   */
  update: (
    apply: (current: WorkspaceProject | null) => WorkspaceProject,
    options?: { key?: string },
  ) => void;
  /**
   * Undo and redo, for every studio at once.
   *
   * The history lives here, above the studios, so it outlasts moving between
   * them: an edit made in Typography is undone from Spacing. It is the current
   * workspace's own, and a switch to another starts that one's.
   */
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  /**
   * Counts the times an undo or a redo has put a document back.
   *
   * For a studio that keeps its own copy of a slice and has to read it again:
   * an undo changes the stored document under it.
   */
  revision: number;
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
  /** Rename a project in the library. Returns false if storage failed. */
  rename: (id: string, name: string) => boolean;
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
  /* The current workspace's history, and whose it is. A ref: it is a mutable
     object whose identity never changes, and the buttons read two booleans. */
  const historyRef = useRef<{
    id: string | null;
    history: WorkspaceHistory;
  } | null>(null);
  const [available, setAvailable] = useState({
    canUndo: false,
    canRedo: false,
  });
  const [revision, setRevision] = useState(0);

  const refreshAvailable = useCallback(() => {
    const history = historyRef.current?.history;
    const next = {
      canUndo: history?.canUndo ?? false,
      canRedo: history?.canRedo ?? false,
    };
    setAvailable((previous) =>
      previous.canUndo === next.canUndo && previous.canRedo === next.canRedo
        ? previous
        : next,
    );
  }, []);

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
      /* A read is the baseline and no step, whatever brought it: the first
         load, a switch, another tab's write. The same workspace keeps its
         steps; another one starts its own. */
      const id = snapshot.index.currentId;
      if (!snapshot.current) historyRef.current = null;
      else if (historyRef.current?.id === id) {
        historyRef.current.history.sync(snapshot.current);
      } else {
        historyRef.current = {
          id,
          history: createWorkspaceHistory(snapshot.current),
        };
      }
      refreshAvailable();
    },
    [applyView, refreshAvailable],
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
    (
      apply: (current: WorkspaceProject | null) => WorkspaceProject,
      options?: { key?: string },
    ) => {
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
      historyRef.current?.history.commit(next, { key: options?.key });
      refreshAvailable();
    },
    [applySnapshot, refreshAvailable],
  );

  /* Puts the document one step back or forward. What is written is the stored
     document with the step's undoable parts patched in, so another tab's
     colours and this one's name are not carried away by it. */
  const step = useCallback(
    (direction: "undo" | "redo") => {
      const history = historyRef.current?.history;
      if (!history) return;
      const target = direction === "undo" ? history.undo() : history.redo();
      if (target) {
        const next = updateStoredWorkspace(
          browserWorkspaceStorage(),
          (current) => restoreUndoable(current ?? target, target),
        );
        if (next) {
          setProject(next);
          const currentId = currentIdRef.current;
          setLibrary((lib) => ({
            ...lib,
            summaries: lib.summaries.map((entry) =>
              entry.id === currentId
                ? { ...entry, name: next.name, project: next }
                : entry,
            ),
          }));
          setRevision((count) => count + 1);
        }
      }
      refreshAvailable();
    },
    [refreshAvailable],
  );
  const undo = useCallback(() => step("undo"), [step]);
  const redo = useCallback(() => step("redo"), [step]);

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
      const storage = browserWorkspaceStorage();
      const snapshot = duplicateStoredWorkspace(storage, id);
      if (!snapshot) return false;
      applySnapshot(snapshot);
      const destId = snapshot.index.currentId;
      const sections = snapshot.current?.typography?.previewSections;
      if (!destId || !sections) return true;
      void copyWorkspacePreviewImages(previewImageStore(), id, destId, sections)
        .then((nextSections) => {
          const patched = updateStoredWorkspaceById(
            storage,
            destId,
            (project) =>
              project.typography
                ? {
                    ...project,
                    typography: {
                      ...project.typography,
                      previewSections: nextSections,
                    },
                  }
                : project,
          );
          if (!patched) return;
          if (currentIdRef.current === destId) {
            setProject(patched);
            setLibrary((lib) => ({
              ...lib,
              summaries: lib.summaries.map((entry) =>
                entry.id === destId
                  ? { ...entry, name: patched.name, project: patched }
                  : entry,
              ),
            }));
          }
        })
        .catch(() => {
          /* IndexedDB missing or refused: the copy still has the token fill. */
        });
      return true;
    },
    [applySnapshot],
  );

  const remove = useCallback(
    (id: string) => {
      applySnapshot(removeStoredWorkspace(browserWorkspaceStorage(), id));
      void removeWorkspacePreviewImages(previewImageStore(), id).catch(() => {
        /* A store that will not open still deleted the project JSON. */
      });
    },
    [applySnapshot],
  );

  const rename = useCallback(
    (id: string, name: string) => {
      const storage = browserWorkspaceStorage();
      const snapshot = renameStoredWorkspace(storage, id, name);
      if (!snapshot) return false;
      applySnapshot(snapshot);
      return true;
    },
    [applySnapshot],
  );

  return {
    project,
    hasLoaded,
    library,
    save,
    update,
    undo,
    redo,
    canUndo: available.canUndo,
    canRedo: available.canRedo,
    revision,
    reload,
    switchTo,
    add,
    duplicate,
    remove,
    rename,
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
