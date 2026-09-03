import {
  LEGACY_PALETTE_STORAGE_KEY,
  LEGACY_STORAGE_KEYS,
  LEGACY_TYPOGRAPHY_STORAGE_KEY,
  WORKSPACE_STORAGE_KEY,
  loadWorkspace,
  retireLegacyKeys,
} from "./workspace";
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
 * Read the workspace, retiring the keys it grew out of.
 *
 * The retirement belongs with the read because every read comes through here.
 * The input is gathered before the removal, so this load still sees whatever
 * it needed; and nothing is removed until the workspace key reads back on its
 * own, so a migration that has not been persisted yet keeps its source.
 */
export function loadStoredWorkspace(
  storage: WorkspaceStorage | null,
): WorkspaceProject | null {
  if (!storage) return null;
  try {
    const input = {
      workspace: storage.getItem(WORKSPACE_STORAGE_KEY),
      legacyPalette: storage.getItem(LEGACY_PALETTE_STORAGE_KEY),
      legacyTypography: storage.getItem(LEGACY_TYPOGRAPHY_STORAGE_KEY),
    };
    retireLegacyKeys(storage);
    return loadWorkspace(input).project;
  } catch {
    /* Unreadable storage reads as an empty one. */
    return null;
  }
}

/**
 * Persist a whole workspace.
 *
 * Returns whether it landed. Callers have never acted on the failure and
 * should not start: a storage that will not take a write is not something a
 * studio can resolve, and losing the session is worse than losing the save.
 * The answer is here for tests, and for whatever ends up reporting it.
 */
export function saveStoredWorkspace(
  storage: WorkspaceStorage | null,
  project: WorkspaceProject,
): boolean {
  if (!storage) return false;
  try {
    storage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(project));
    return true;
  } catch {
    return false;
  }
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
): WorkspaceProject | null {
  if (!storage) return null;
  /* Whether this write is the one that creates the workspace key, read
     before anything else touches storage. */
  const isFirstWrite = storage.getItem(WORKSPACE_STORAGE_KEY) === null;
  const next = apply(loadStoredWorkspace(storage));
  if (!saveStoredWorkspace(storage, next)) return next;
  /* The old keys go with the write that first creates the workspace. The
     load above retires them only when a workspace already reads back, so
     that first write used to leave them — and they were being cleared by
     whichever *next* load happened along, which was the palette studio
     writing its semantics slice on mount. When that write moved onto the
     store, nothing followed, and a migrated project kept its legacy keys.

     Only on that first write, and without `retireLegacyKeys`. That function
     re-reads and re-seeds the whole workspace to prove the key holds one;
     here the save that just succeeded is the proof. And any work at all on
     every write is paid on every keystroke and every step of a drag in the
     typography studio, whose keyboard reorder is timed close enough that
     the re-parse stalled it four runs out of four and two `removeItem`s
     still cost it one in four. Nothing on the ordinary write costs nothing. */
  if (isFirstWrite) {
    for (const key of LEGACY_STORAGE_KEYS) {
      try {
        storage.removeItem(key);
      } catch {
        /* A key that will not go is the next load's to retire. */
      }
    }
  }
  return next;
}
