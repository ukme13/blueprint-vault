import {
  addWorkspace,
  createWorkspaceId,
  duplicateWorkspace,
  loadCurrentWorkspace,
  loadLibrary,
  removeWorkspace,
  saveCurrentWorkspace,
  switchWorkspace,
  updateCurrentWorkspace,
  updateWorkspaceDocument,
  type WorkspaceIdFactory,
} from "./library";
import type { WorkspaceProject } from "./types";

/**
 * The one place the workspace is read from and written to.
 *
 * Four modules used to do this, and the interesting part is that they did it
 * identically: `readStorageKeys` and `loadStoredWorkspace` were the same
 * function copied three times, with a fourth inlined in the preview. A copy is
 * only as good as the last time somebody remembered to update all of them, and
 * the read has real rules in it — which keys are consulted, in what order, and
 * when the old ones are allowed to go.
 *
 * Storage is a parameter rather than a global so this is testable against a
 * fake, and so the same functions can back something other than localStorage
 * later without every studio learning about it.
 *
 * The current document is `blueprint.workspace.{id}`. The library index is
 * a second key, so a shade edit does not rewrite every project.
 */
export type WorkspaceStorage = Pick<
  Storage,
  "getItem" | "setItem" | "removeItem"
>;

/**
 * The browser's storage, or null where there is none.
 *
 * Null rather than a throw: a server render has no localStorage and that is
 * not an error, it is the reason every studio reads in an effect.
 */
export function browserWorkspaceStorage(): WorkspaceStorage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    /* Storage disabled by policy. Reading it throws rather than returning
       null, and a studio that cannot save is still a studio. */
    return null;
  }
}

/**
 * Read the current workspace, migrating the single-document key if that is
 * still all this browser has.
 */
export function loadStoredWorkspace(
  storage: WorkspaceStorage | null,
  createId: WorkspaceIdFactory = createWorkspaceId,
): WorkspaceProject | null {
  if (!storage) return null;
  try {
    return loadCurrentWorkspace(storage, createId).current;
  } catch {
    /* Unreadable storage reads as an empty one. */
    return null;
  }
}

/**
 * Persist the current workspace.
 *
 * Returns whether it landed. Callers have never acted on the failure and
 * should not start: a storage that will not take a write is not something a
 * studio can resolve, and losing the session is worse than losing the save.
 * The answer is here for tests, and for whatever ends up reporting it.
 */
export function saveStoredWorkspace(
  storage: WorkspaceStorage | null,
  project: WorkspaceProject,
  createId: WorkspaceIdFactory = createWorkspaceId,
): boolean {
  if (!storage) return false;
  return saveCurrentWorkspace(storage, project, createId);
}

/**
 * Read the stored workspace, patch it, and write it back.
 *
 * Read rather than reused from state, because the other studio owns the other
 * slices and may have written since this page loaded — which is what stops one
 * studio persisting a stale copy of a slice it does not own.
 */
export function updateStoredWorkspace(
  storage: WorkspaceStorage | null,
  apply: (current: WorkspaceProject | null) => WorkspaceProject,
  createId: WorkspaceIdFactory = createWorkspaceId,
): WorkspaceProject | null {
  if (!storage) return null;
  return updateCurrentWorkspace(storage, apply, createId);
}

export function loadStoredLibrary(
  storage: WorkspaceStorage | null,
  createId: WorkspaceIdFactory = createWorkspaceId,
) {
  if (!storage) {
    return {
      index: { currentId: null, ids: [] as string[] },
      current: null,
      summaries: [],
    };
  }
  try {
    return loadLibrary(storage, createId);
  } catch {
    return {
      index: { currentId: null, ids: [] as string[] },
      current: null,
      summaries: [],
    };
  }
}

export function addStoredWorkspace(
  storage: WorkspaceStorage | null,
  project: WorkspaceProject,
  createId: WorkspaceIdFactory = createWorkspaceId,
) {
  if (!storage) return null;
  try {
    return addWorkspace(storage, project, createId);
  } catch {
    return null;
  }
}

export function switchStoredWorkspace(
  storage: WorkspaceStorage | null,
  id: string,
  createId: WorkspaceIdFactory = createWorkspaceId,
) {
  if (!storage) return null;
  try {
    return switchWorkspace(storage, id, createId);
  } catch {
    return null;
  }
}

export function duplicateStoredWorkspace(
  storage: WorkspaceStorage | null,
  id: string,
  createId: WorkspaceIdFactory = createWorkspaceId,
) {
  if (!storage) return null;
  try {
    return duplicateWorkspace(storage, id, createId);
  } catch {
    return null;
  }
}

export function updateStoredWorkspaceById(
  storage: WorkspaceStorage | null,
  id: string,
  apply: (current: WorkspaceProject) => WorkspaceProject,
): WorkspaceProject | null {
  if (!storage) return null;
  try {
    return updateWorkspaceDocument(storage, id, apply);
  } catch {
    return null;
  }
}

export function removeStoredWorkspace(
  storage: WorkspaceStorage | null,
  id: string,
  createId: WorkspaceIdFactory = createWorkspaceId,
) {
  if (!storage) return null;
  try {
    return removeWorkspace(storage, id, createId);
  } catch {
    return null;
  }
}
