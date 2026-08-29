/*
 * Where an uploaded font file lives.
 *
 * IndexedDB rather than localStorage, for two reasons that point the same way.
 * localStorage holds strings in about 5MB total and one weight of a text face
 * is commonly 100KB to several MB, so a couple of families would not fit. And
 * keeping the bytes out of the project object is the rule the uploaded-fonts
 * plan hangs on — the file stays in this browser, and the project carries only
 * the family name. See docs/roadmap/uploaded-fonts.md.
 */

/* Exported because where the bytes live is part of the contract, not an
   implementation detail: anything offering to clear a browser of this app's
   data has to know, and so does a test asserting nothing was left behind. */
export const FONT_DB_NAME = "blueprint-fonts";
export const FONT_DB_VERSION = 1;

/* Two stores rather than one. Listing what is held happens on every load and
   only needs the names; reading a record in IndexedDB deserialises all of it,
   so a single store would pull every font's bytes to render a list of them. */
export const FONT_META_STORE = "font-meta";
export const FONT_DATA_STORE = "font-data";

/** What is known about a stored file without reading the file. */
export interface FontFileMeta {
  /** The id of the font entry this belongs to. */
  id: string;
  fileName: string;
  mimeType: string;
  /** Bytes, kept so a size can be shown without loading the file. */
  size: number;
  /** Epoch milliseconds, so "added" can be shown and ordered. */
  addedAt: number;
}

export interface FontFile extends FontFileMeta {
  /** ArrayBuffer rather than Blob: it is what FontFace takes directly. */
  data: ArrayBuffer;
}

export interface FontFileStore {
  put(file: FontFile): Promise<void>;
  get(id: string): Promise<FontFile | null>;
  remove(id: string): Promise<void>;
  /** Metadata for everything held, without reading any of the files. */
  list(): Promise<FontFileMeta[]>;
  clear(): Promise<void>;
}

/** Rejects rather than resolving undefined, so callers see the real error. */
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
    /* Reached on the server, or in a browser with storage disabled. Saying so
       beats a TypeError from somewhere further in. */
    throw new Error("IndexedDB is not available in this environment.");
  }
  return resolved;
}

function openDatabase(factory?: IDBFactory): Promise<IDBDatabase> {
  const open = resolveFactory(factory).open(FONT_DB_NAME, FONT_DB_VERSION);
  open.onupgradeneeded = () => {
    const db = open.result;
    if (!db.objectStoreNames.contains(FONT_META_STORE)) {
      db.createObjectStore(FONT_META_STORE, { keyPath: "id" });
    }
    if (!db.objectStoreNames.contains(FONT_DATA_STORE)) {
      db.createObjectStore(FONT_DATA_STORE);
    }
  };
  return request(open);
}

/**
 * The store, bound to a database connection opened per call.
 *
 * The factory is injectable so tests can hand in a fresh one; in a browser it
 * defaults to the global. Nothing is opened until a method is called, which
 * keeps the module importable where IndexedDB does not exist — this package is
 * consumed by a server-rendered app.
 */
export function fontFileStore(factory?: IDBFactory): FontFileStore {
  async function withStores<T>(
    mode: IDBTransactionMode,
    run: (meta: IDBObjectStore, data: IDBObjectStore) => Promise<T> | T,
  ): Promise<T> {
    const db = await openDatabase(factory);
    try {
      const transaction = db.transaction(
        [FONT_META_STORE, FONT_DATA_STORE],
        mode,
      );
      const result = await run(
        transaction.objectStore(FONT_META_STORE),
        transaction.objectStore(FONT_DATA_STORE),
      );
      /* Awaited even for reads: a transaction that aborts after the request
         resolved would otherwise be reported as a success. */
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
        /* One transaction over both stores, so a file can never be left
           without its metadata or the other way round. */
        metaStore.put(meta);
        dataStore.put(data, file.id);
      });
    },

    async get(id) {
      return withStores("readonly", async (metaStore, dataStore) => {
        const meta = await request<FontFileMeta | undefined>(metaStore.get(id));
        if (!meta) return null;
        const data = await request<ArrayBuffer | undefined>(dataStore.get(id));
        /* Metadata without its file is not half an answer, it is a miss:
           whoever asked wanted the bytes. */
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
        request<FontFileMeta[]>(metaStore.getAll()),
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
