import {
  LEGACY_PALETTE_STORAGE_KEY,
  LEGACY_TYPOGRAPHY_STORAGE_KEY,
  WORKSPACE_STORAGE_KEY,
  loadWorkspace,
  readWorkspaceProject,
  retireLegacyKeys,
  withSharedName,
} from "./workspace";
import type { WorkspaceProject } from "./types";

/**
 * The index of named workspaces in this browser.
 *
 * The current document is a different key, so a shade edit does not rewrite
 * every project. Home reads this; studios read only `currentId`.
 */
export const LIBRARY_STORAGE_KEY = "blueprint.library.v1";

/** How many workspaces this browser will hold. localStorage is not large. */
export const LIBRARY_CAPACITY = 8;

/** Storage this module needs. A test can pass a Map wrapped as these three. */
export type LibraryStorage = Pick<
  Storage,
  "getItem" | "setItem" | "removeItem"
>;

/** Ids are minted in the browser; tests pass a factory so they are stable. */
export type WorkspaceIdFactory = () => string;

export function workspaceDocumentKey(id: string): string {
  return `blueprint.workspace.${id}`;
}

export function createWorkspaceId(): string {
  return crypto.randomUUID();
}

export interface WorkspaceLibraryIndex {
  currentId: string | null;
  ids: string[];
}

export interface WorkspaceLibrarySummary {
  id: string;
  name: string;
  project: WorkspaceProject;
}

export interface LibrarySnapshot {
  index: WorkspaceLibraryIndex;
  current: WorkspaceProject | null;
  summaries: WorkspaceLibrarySummary[];
}

const EMPTY_INDEX: WorkspaceLibraryIndex = { currentId: null, ids: [] };

function parseJson(source: string | null): unknown {
  if (!source) return null;
  try {
    return JSON.parse(source);
  } catch {
    return null;
  }
}

function parseIndex(raw: string | null): WorkspaceLibraryIndex | null {
  const value = parseJson(raw);
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as { currentId?: unknown; ids?: unknown };
  if (record.currentId !== null && typeof record.currentId !== "string") {
    return null;
  }
  if (
    !Array.isArray(record.ids) ||
    record.ids.some((id) => typeof id !== "string")
  ) {
    return null;
  }
  const ids = record.ids as string[];
  const currentId = record.currentId as string | null;
  if (currentId && !ids.includes(currentId)) {
    return { currentId: ids[0] ?? null, ids };
  }
  return { currentId, ids };
}

function readIndex(storage: LibraryStorage): WorkspaceLibraryIndex | null {
  return parseIndex(storage.getItem(LIBRARY_STORAGE_KEY));
}

function writeIndex(
  storage: LibraryStorage,
  index: WorkspaceLibraryIndex,
): void {
  storage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(index));
}

function readDocument(
  storage: LibraryStorage,
  id: string,
): WorkspaceProject | null {
  return readWorkspaceProject(
    parseJson(storage.getItem(workspaceDocumentKey(id))),
  );
}

function writeDocument(
  storage: LibraryStorage,
  id: string,
  project: WorkspaceProject,
): void {
  storage.setItem(workspaceDocumentKey(id), JSON.stringify(project));
}

function cloneProject(project: WorkspaceProject): WorkspaceProject {
  return readWorkspaceProject(JSON.parse(JSON.stringify(project))) ?? project;
}

function snapshotFromIndex(
  storage: LibraryStorage,
  index: WorkspaceLibraryIndex,
): LibrarySnapshot {
  const summaries: WorkspaceLibrarySummary[] = [];
  for (const id of index.ids) {
    const project = readDocument(storage, id);
    if (!project) continue;
    summaries.push({ id, name: project.name, project });
  }
  return {
    index,
    current: index.currentId ? readDocument(storage, index.currentId) : null,
    summaries,
  };
}

function documentReadsBack(storage: LibraryStorage, id: string): boolean {
  return readDocument(storage, id) !== null;
}

/**
 * Drop `blueprint.workspace.v1` once a per-id copy reads back.
 *
 * Same rule as the palette keys: the source stays until the destination
 * stands on its own. After that this key is never written again.
 */
function retireCopiedV1(storage: LibraryStorage): void {
  const index = readIndex(storage);
  if (!index?.currentId) return;
  if (!documentReadsBack(storage, index.currentId)) return;
  if (storage.getItem(WORKSPACE_STORAGE_KEY) === null) return;
  try {
    storage.removeItem(WORKSPACE_STORAGE_KEY);
  } catch {
    /* A key that will not go is the next load's to retire. */
  }
}

function mintId(
  createId: WorkspaceIdFactory,
  taken: readonly string[],
): string {
  let id = createId();
  while (taken.includes(id)) {
    id = createId();
  }
  return id;
}

/**
 * If the library key is missing and an older document is still under
 * `blueprint.workspace.v1` (or the two studio keys before that), copy it
 * onto a minted id and start the index.
 *
 * Missing is not the same as empty: deleting the last card writes
 * `{ currentId: null, ids: [] }`, and a leftover v1 after that must not
 * come back.
 */
function migrateToLibrary(
  storage: LibraryStorage,
  createId: WorkspaceIdFactory,
): void {
  if (storage.getItem(LIBRARY_STORAGE_KEY) !== null) {
    retireCopiedV1(storage);
    const index = readIndex(storage);
    if (index && (index.currentId || index.ids.length > 0)) {
      const present = index.ids.some((id) => documentReadsBack(storage, id));
      retireLegacyKeys(storage, present);
    }
    return;
  }

  const project = loadWorkspace({
    workspace: storage.getItem(WORKSPACE_STORAGE_KEY),
    legacyPalette: storage.getItem(LEGACY_PALETTE_STORAGE_KEY),
    legacyTypography: storage.getItem(LEGACY_TYPOGRAPHY_STORAGE_KEY),
  }).project;
  if (!project) return;

  const id = mintId(createId, []);
  writeDocument(storage, id, project);
  writeIndex(storage, { currentId: id, ids: [id] });
  retireCopiedV1(storage);
  if (documentReadsBack(storage, id)) {
    retireLegacyKeys(storage, true);
  }
}

/** Read the library, migrating the single-document key the first time. */
export function loadLibrary(
  storage: LibraryStorage,
  createId: WorkspaceIdFactory = createWorkspaceId,
): LibrarySnapshot {
  migrateToLibrary(storage, createId);
  return snapshotFromIndex(storage, readIndex(storage) ?? EMPTY_INDEX);
}

/**
 * Current document only. A shade edit must not read every project.
 */
export function loadCurrentWorkspace(
  storage: LibraryStorage,
  createId: WorkspaceIdFactory = createWorkspaceId,
): { index: WorkspaceLibraryIndex; current: WorkspaceProject | null } {
  migrateToLibrary(storage, createId);
  const index = readIndex(storage) ?? EMPTY_INDEX;
  return {
    index,
    current: index.currentId ? readDocument(storage, index.currentId) : null,
  };
}

/**
 * Persist the current document only.
 *
 * No current id means this is the first project: add it. Never writes the
 * retired v1 key.
 */
export function saveCurrentWorkspace(
  storage: LibraryStorage,
  project: WorkspaceProject,
  createId: WorkspaceIdFactory = createWorkspaceId,
): boolean {
  try {
    const snapshot = loadCurrentWorkspace(storage, createId);
    if (snapshot.index.currentId) {
      writeDocument(storage, snapshot.index.currentId, project);
      return true;
    }
    return addWorkspace(storage, project, createId) !== null;
  } catch {
    return false;
  }
}

/** Patch whatever is stored as current, not what a caller remembers. */
export function updateCurrentWorkspace(
  storage: LibraryStorage,
  apply: (current: WorkspaceProject | null) => WorkspaceProject,
  createId: WorkspaceIdFactory = createWorkspaceId,
): WorkspaceProject | null {
  const next = apply(loadCurrentWorkspace(storage, createId).current);
  saveCurrentWorkspace(storage, next, createId);
  return next;
}

/**
 * Add a project. It becomes current. Returns null at the cap, without
 * writing.
 */
export function addWorkspace(
  storage: LibraryStorage,
  project: WorkspaceProject,
  createId: WorkspaceIdFactory = createWorkspaceId,
): LibrarySnapshot | null {
  const { index: currentIndex } = loadCurrentWorkspace(storage, createId);
  if (currentIndex.ids.length >= LIBRARY_CAPACITY) return null;

  const id = mintId(createId, currentIndex.ids);
  const index: WorkspaceLibraryIndex = {
    currentId: id,
    ids: [...currentIndex.ids, id],
  };
  writeDocument(storage, id, project);
  writeIndex(storage, index);
  if (documentReadsBack(storage, id)) {
    retireLegacyKeys(storage, true);
  }
  return snapshotFromIndex(storage, index);
}

/** Make `id` current. Unknown ids are a no-op. */
export function switchWorkspace(
  storage: LibraryStorage,
  id: string,
  createId: WorkspaceIdFactory = createWorkspaceId,
): LibrarySnapshot {
  const snapshot = loadLibrary(storage, createId);
  if (!snapshot.index.ids.includes(id)) return snapshot;
  const index: WorkspaceLibraryIndex = {
    ...snapshot.index,
    currentId: id,
  };
  writeIndex(storage, index);
  return snapshotFromIndex(storage, index);
}

/**
 * Copy a project, land it next to the source as `{name} copy`, and make it
 * current. Null at the cap, or when the source will not read.
 */
export function duplicateWorkspace(
  storage: LibraryStorage,
  id: string,
  createId: WorkspaceIdFactory = createWorkspaceId,
): LibrarySnapshot | null {
  const snapshot = loadLibrary(storage, createId);
  if (snapshot.index.ids.length >= LIBRARY_CAPACITY) return null;

  const source = readDocument(storage, id);
  if (!source) return null;

  const copyId = mintId(createId, snapshot.index.ids);
  const copy = withSharedName({
    ...cloneProject(source),
    name: `${source.name} copy`,
  });
  const sourceIndex = snapshot.index.ids.indexOf(id);
  const ids = [
    ...snapshot.index.ids.slice(0, sourceIndex + 1),
    copyId,
    ...snapshot.index.ids.slice(sourceIndex + 1),
  ];
  const index: WorkspaceLibraryIndex = { currentId: copyId, ids };
  writeDocument(storage, copyId, copy);
  writeIndex(storage, index);
  return snapshotFromIndex(storage, index);
}

/**
 * Patch one named document. Duplicate's image remap writes the copy, which
 * may already have stopped being current.
 */
export function updateWorkspaceDocument(
  storage: LibraryStorage,
  id: string,
  apply: (project: WorkspaceProject) => WorkspaceProject,
): WorkspaceProject | null {
  const current = readDocument(storage, id);
  if (!current) return null;
  const next = apply(current);
  writeDocument(storage, id, next);
  return next;
}

/**
 * Delete a project. The last one leaves an empty library, not a missing key.
 * Font bytes stay: another card may still name that family.
 */
export function removeWorkspace(
  storage: LibraryStorage,
  id: string,
  createId: WorkspaceIdFactory = createWorkspaceId,
): LibrarySnapshot {
  const snapshot = loadLibrary(storage, createId);
  if (!snapshot.index.ids.includes(id)) return snapshot;

  const ids = snapshot.index.ids.filter((each) => each !== id);
  try {
    storage.removeItem(workspaceDocumentKey(id));
  } catch {
    /* A document that will not go is still absent from the index. */
  }
  const currentId =
    snapshot.index.currentId === id
      ? (ids[0] ?? null)
      : snapshot.index.currentId;
  const index: WorkspaceLibraryIndex = { currentId, ids };
  writeIndex(storage, index);
  return snapshotFromIndex(storage, index);
}
