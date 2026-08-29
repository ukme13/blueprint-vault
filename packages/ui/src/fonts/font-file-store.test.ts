import { IDBFactory } from "fake-indexeddb";
import { beforeEach, describe, expect, it } from "vitest";
import {
  FONT_DATA_STORE,
  FONT_DB_NAME,
  FONT_DB_VERSION,
  fontFileStore,
  type FontFile,
  type FontFileStore,
} from "./font-file-store";

/* A fresh factory per test rather than a shared global: these open and close a
   real connection each call, and a leaked database between cases would make
   one test depend on another having run. */
let store: FontFileStore;
let factory: IDBFactory;

/* Reads the file store directly, because the public API cannot see an orphan:
   get() reports a miss when the metadata is gone whether or not the bytes are
   still there. Leaving them is the thing the plan forbids, so the test has to
   look where they would be. */
function storedFileKeys(): Promise<IDBValidKey[]> {
  return new Promise((resolve, reject) => {
    const open = factory.open(FONT_DB_NAME, FONT_DB_VERSION);
    open.onsuccess = () => {
      const db = open.result;
      const keys = db
        .transaction(FONT_DATA_STORE, "readonly")
        .objectStore(FONT_DATA_STORE)
        .getAllKeys();
      keys.onsuccess = () => {
        resolve(keys.result);
        db.close();
      };
      keys.onerror = () => reject(keys.error);
    };
    open.onerror = () => reject(open.error);
  });
}

function bytes(values: number[]): ArrayBuffer {
  return new Uint8Array(values).buffer;
}

function file(over: Partial<FontFile> = {}): FontFile {
  return {
    id: "main",
    fileName: "Brand-Regular.woff2",
    mimeType: "font/woff2",
    size: 4,
    addedAt: 1_700_000_000_000,
    data: bytes([1, 2, 3, 4]),
    ...over,
  };
}

const read = (buffer: ArrayBuffer) => [...new Uint8Array(buffer)];

beforeEach(() => {
  factory = new IDBFactory();
  store = fontFileStore(factory);
});

describe("fontFileStore", () => {
  it("has nothing in it to begin with", async () => {
    expect(await store.list()).toEqual([]);
    expect(await store.get("main")).toBeNull();
  });

  it("gives back the file it was given, bytes intact", async () => {
    await store.put(file());
    const stored = await store.get("main");
    expect(stored).not.toBeNull();
    expect(read(stored!.data)).toEqual([1, 2, 3, 4]);
    expect(stored!.fileName).toBe("Brand-Regular.woff2");
    expect(stored!.mimeType).toBe("font/woff2");
  });

  it("survives a reconnection, which is the point of storing it", async () => {
    const factory = new IDBFactory();
    await fontFileStore(factory).put(file());
    // A different store object over the same database, as a reload would be.
    const stored = await fontFileStore(factory).get("main");
    expect(read(stored!.data)).toEqual([1, 2, 3, 4]);
  });

  it("keeps one file per font id, replacing rather than accumulating", async () => {
    await store.put(file());
    await store.put(file({ fileName: "Brand-Bold.woff2", data: bytes([9]) }));

    const stored = await store.get("main");
    expect(stored!.fileName).toBe("Brand-Bold.woff2");
    expect(read(stored!.data)).toEqual([9]);
    expect(await store.list()).toHaveLength(1);
  });

  it("holds a file per font entry", async () => {
    await store.put(file({ id: "main" }));
    await store.put(file({ id: "display", fileName: "Display.woff2" }));

    const listed = await store.list();
    expect(listed.map((entry) => entry.id).sort()).toEqual(["display", "main"]);
  });

  it("lists metadata without the bytes", async () => {
    await store.put(file());
    const [entry] = await store.list();
    expect(entry).toEqual({
      id: "main",
      fileName: "Brand-Regular.woff2",
      mimeType: "font/woff2",
      size: 4,
      addedAt: 1_700_000_000_000,
    });
    // Listing is what runs on every load; it must not pull the file.
    expect("data" in entry!).toBe(false);
  });

  it("removes the bytes with the entry, not just the metadata", async () => {
    await store.put(file());
    await store.remove("main");

    expect(await store.get("main")).toBeNull();
    expect(await store.list()).toEqual([]);
    /* The one that matters. An orphaned file is a copy of someone's licensed
       font that nothing references and nobody chose to keep, and every public
       method would report it gone. */
    expect(await storedFileKeys()).toEqual([]);
  });

  it("leaves the other entries alone when one is removed", async () => {
    await store.put(file({ id: "main" }));
    await store.put(file({ id: "display" }));
    await store.remove("main");

    expect(await store.get("display")).not.toBeNull();
    expect(await store.list()).toHaveLength(1);
    expect(await storedFileKeys()).toEqual(["display"]);
  });

  it("ignores a removal of something it does not hold", async () => {
    await expect(store.remove("never-added")).resolves.toBeUndefined();
  });

  it("empties completely", async () => {
    await store.put(file({ id: "main" }));
    await store.put(file({ id: "display" }));
    await store.clear();

    expect(await store.list()).toEqual([]);
    expect(await store.get("display")).toBeNull();
    expect(await storedFileKeys()).toEqual([]);
  });

  it("stores a file large enough that localStorage could not have held it", async () => {
    // 6MB, past the ~5MB localStorage ceiling the plan cites as one reason for
    // this store existing at all.
    const large = new Uint8Array(6 * 1024 * 1024);
    large[0] = 42;
    large[large.length - 1] = 7;
    await store.put(file({ data: large.buffer, size: large.byteLength }));

    const stored = await store.get("main");
    expect(stored!.data.byteLength).toBe(6 * 1024 * 1024);
    const view = new Uint8Array(stored!.data);
    expect(view[0]).toBe(42);
    expect(view[view.length - 1]).toBe(7);
  });

  it("says so when there is no IndexedDB, rather than failing further in", async () => {
    // What a server render would hit.
    const missing = fontFileStore(undefined as unknown as IDBFactory);
    const previous = globalThis.indexedDB;
    // @ts-expect-error deliberately removing the global for this case
    delete globalThis.indexedDB;
    try {
      await expect(missing.list()).rejects.toThrow(
        /IndexedDB is not available/,
      );
    } finally {
      globalThis.indexedDB = previous;
    }
  });
});
