/*
 * Where an uploaded `/preview` section image lives.
 *
 * IndexedDB rather than the workspace JSON: a photo is too large for
 * localStorage, and a project file is a document, not a payload. The section
 * fill stores an image id; the bytes stay in this browser. See the fonts
 * store, which is the same split.
 */

import type { PreviewSection } from "../typography/preview-sections";

export const PREVIEW_IMAGE_DB_NAME = "blueprint-preview-images";
export const PREVIEW_IMAGE_DB_VERSION = 1;
export const PREVIEW_IMAGE_META_STORE = "image-meta";
export const PREVIEW_IMAGE_DATA_STORE = "image-data";

/** Two megabytes: enough for a section band, not a dump of a camera roll. */
export const PREVIEW_IMAGE_MAX_BYTES = 2 * 1024 * 1024;

export interface PreviewImageMeta {
  id: string;
  workspaceId: string;
  sectionId: string;
  fileName: string;
  mimeType: string;
  size: number;
  addedAt: number;
}

export interface PreviewImageFile extends PreviewImageMeta {
  data: ArrayBuffer;
}

export interface PreviewImageStore {
  put(file: PreviewImageFile): Promise<void>;
  get(id: string): Promise<PreviewImageFile | null>;
  remove(id: string): Promise<void>;
  list(): Promise<PreviewImageMeta[]>;
  clear(): Promise<void>;
}

export type PreviewImageRefusal = "too-large" | "not-image";

export function inspectPreviewImageFile(file: {
  type: string;
  size: number;
}): PreviewImageRefusal | null {
  if (file.size > PREVIEW_IMAGE_MAX_BYTES) return "too-large";
  if (!file.type.startsWith("image/")) return "not-image";
  return null;
}

export function createPreviewImageId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `img-${Math.random().toString(36).slice(2, 10)}`;
}

function request<T>(source: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    source.onsuccess = () => resolve(source.result);
    source.onerror = () => reject(source.error);
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

function resolveFactory(factory?: IDBFactory): IDBFactory {
  const resolved = factory ?? globalThis.indexedDB;
  if (!resolved) {
    throw new Error("IndexedDB is not available in this environment.");
  }
  return resolved;
}

function openDatabase(factory?: IDBFactory): Promise<IDBDatabase> {
  const open = resolveFactory(factory).open(
    PREVIEW_IMAGE_DB_NAME,
    PREVIEW_IMAGE_DB_VERSION,
  );
  open.onupgradeneeded = () => {
    const db = open.result;
    if (!db.objectStoreNames.contains(PREVIEW_IMAGE_META_STORE)) {
      db.createObjectStore(PREVIEW_IMAGE_META_STORE, { keyPath: "id" });
    }
    if (!db.objectStoreNames.contains(PREVIEW_IMAGE_DATA_STORE)) {
      db.createObjectStore(PREVIEW_IMAGE_DATA_STORE);
    }
  };
  return request(open);
}

export function previewImageStore(factory?: IDBFactory): PreviewImageStore {
  async function withStores<T>(
    mode: IDBTransactionMode,
    run: (meta: IDBObjectStore, data: IDBObjectStore) => Promise<T> | T,
  ): Promise<T> {
    const db = await openDatabase(factory);
    try {
      const transaction = db.transaction(
        [PREVIEW_IMAGE_META_STORE, PREVIEW_IMAGE_DATA_STORE],
        mode,
      );
      const result = await run(
        transaction.objectStore(PREVIEW_IMAGE_META_STORE),
        transaction.objectStore(PREVIEW_IMAGE_DATA_STORE),
      );
      await transactionDone(transaction);
      return result;
    } finally {
      db.close();
    }
  }

  return {
    async put(file) {
      const { data, ...meta } = file;
      await withStores("readwrite", (metaStore, dataStore) => {
        metaStore.put(meta);
        dataStore.put(data, file.id);
      });
    },

    async get(id) {
      return withStores("readonly", async (metaStore, dataStore) => {
        const meta = await request<PreviewImageMeta | undefined>(
          metaStore.get(id),
        );
        if (!meta) return null;
        const data = await request<ArrayBuffer | undefined>(dataStore.get(id));
        return data ? { ...meta, data } : null;
      });
    },

    async remove(id) {
      await withStores("readwrite", (metaStore, dataStore) => {
        metaStore.delete(id);
        dataStore.delete(id);
      });
    },

    async list() {
      return withStores("readonly", (metaStore) =>
        request<PreviewImageMeta[]>(metaStore.getAll()),
      );
    },

    async clear() {
      await withStores("readwrite", (metaStore, dataStore) => {
        metaStore.clear();
        dataStore.clear();
      });
    },
  };
}

/**
 * Copy every image this workspace still names onto a new workspace id.
 *
 * Duplicate would otherwise keep pointing at the source's ids, so deleting
 * the original would blank the copy.
 */
export async function copyWorkspacePreviewImages(
  store: PreviewImageStore,
  sourceWorkspaceId: string,
  destWorkspaceId: string,
  sections: readonly PreviewSection[],
): Promise<PreviewSection[]> {
  const next: PreviewSection[] = [];
  for (const section of sections) {
    if (section.fill.kind !== "image") {
      next.push(section);
      continue;
    }
    const stored = await store.get(section.fill.imageId);
    if (!stored || stored.workspaceId !== sourceWorkspaceId) {
      next.push({
        ...section,
        fill: {
          kind: "token" as const,
          tokenId: section.fill.fallbackTokenId,
        },
      });
      continue;
    }
    const imageId = createPreviewImageId();
    await store.put({
      ...stored,
      id: imageId,
      workspaceId: destWorkspaceId,
    });
    next.push({
      ...section,
      fill: { ...section.fill, imageId },
    });
  }
  return next;
}

/** Drop images that belong only to this workspace. Fonts stay; these do not. */
export async function removeWorkspacePreviewImages(
  store: PreviewImageStore,
  workspaceId: string,
): Promise<void> {
  const listed = await store.list();
  await Promise.all(
    listed
      .filter((entry) => entry.workspaceId === workspaceId)
      .map((entry) => store.remove(entry.id)),
  );
}
