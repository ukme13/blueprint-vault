import { IDBFactory } from "fake-indexeddb";
import { beforeEach, describe, expect, it } from "vitest";
import {
  seedPreviewSections,
  updateSectionFill,
} from "../typography/preview-sections";
import { seedTypographyProject } from "../workspace/seed-project";
import {
  PREVIEW_IMAGE_DATA_STORE,
  PREVIEW_IMAGE_DB_NAME,
  PREVIEW_IMAGE_DB_VERSION,
  PREVIEW_IMAGE_MAX_BYTES,
  copyWorkspacePreviewImages,
  inspectPreviewImageFile,
  previewImageStore,
  removeWorkspacePreviewImages,
  type PreviewImageFile,
  type PreviewImageStore,
} from "./preview-image-store";

let store: PreviewImageStore;
let factory: IDBFactory;

function storedFileKeys(): Promise<IDBValidKey[]> {
  return new Promise((resolve, reject) => {
    const open = factory.open(PREVIEW_IMAGE_DB_NAME, PREVIEW_IMAGE_DB_VERSION);
    open.onsuccess = () => {
      const db = open.result;
      const keys = db
        .transaction(PREVIEW_IMAGE_DATA_STORE, "readonly")
        .objectStore(PREVIEW_IMAGE_DATA_STORE)
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

function file(over: Partial<PreviewImageFile> = {}): PreviewImageFile {
  return {
    id: "hero-img",
    workspaceId: "ws-one",
    sectionId: "landing-hero",
    fileName: "hero.png",
    mimeType: "image/png",
    size: 4,
    addedAt: 1_700_000_000_000,
    data: bytes([1, 2, 3, 4]),
    ...over,
  };
}

const read = (buffer: ArrayBuffer) => [...new Uint8Array(buffer)];

beforeEach(() => {
  factory = new IDBFactory();
  store = previewImageStore(factory);
});

describe("inspectPreviewImageFile", () => {
  it("refuses a file over the cap and a non-image type", () => {
    expect(
      inspectPreviewImageFile({
        type: "image/png",
        size: PREVIEW_IMAGE_MAX_BYTES + 1,
      }),
    ).toBe("too-large");
    expect(inspectPreviewImageFile({ type: "application/pdf", size: 12 })).toBe(
      "not-image",
    );
    expect(
      inspectPreviewImageFile({ type: "image/jpeg", size: 12 }),
    ).toBeNull();
  });
});

describe("previewImageStore", () => {
  it("gives back the file it was given, bytes intact", async () => {
    await store.put(file());
    const stored = await store.get("hero-img");
    expect(stored).not.toBeNull();
    expect(read(stored!.data)).toEqual([1, 2, 3, 4]);
    expect(stored!.workspaceId).toBe("ws-one");
    expect(stored!.sectionId).toBe("landing-hero");
  });

  it("lists metadata without the bytes", async () => {
    await store.put(file());
    const [entry] = await store.list();
    expect(entry).toEqual({
      id: "hero-img",
      workspaceId: "ws-one",
      sectionId: "landing-hero",
      fileName: "hero.png",
      mimeType: "image/png",
      size: 4,
      addedAt: 1_700_000_000_000,
    });
    expect("data" in entry!).toBe(false);
  });

  it("removes the bytes with the entry", async () => {
    await store.put(file());
    await store.remove("hero-img");
    expect(await store.get("hero-img")).toBeNull();
    expect(await storedFileKeys()).toEqual([]);
  });

  it("says so when there is no IndexedDB", async () => {
    const missing = previewImageStore(undefined as unknown as IDBFactory);
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

describe("preview images and the workspace JSON", () => {
  it("stores only an image id on the project, never the bytes", async () => {
    await store.put(file());
    const sections = updateSectionFill(seedPreviewSections(), "landing-hero", {
      kind: "image",
      imageId: "hero-img",
      fallbackTokenId: "surface.base",
    });
    const json = JSON.stringify({
      ...seedTypographyProject("Test"),
      previewSections: sections,
    });
    expect(json).toContain('"imageId":"hero-img"');
    expect(json).not.toContain("hero.png");
    expect(JSON.parse(json).previewSections[1].fill).toEqual({
      kind: "image",
      imageId: "hero-img",
      fallbackTokenId: "surface.base",
    });
    expect(JSON.parse(json).previewSections[1].fill).not.toHaveProperty("data");
  });

  it("copies blobs under a new workspace id and drops them on delete", async () => {
    await store.put(file());
    const source = updateSectionFill(seedPreviewSections(), "landing-hero", {
      kind: "image",
      imageId: "hero-img",
      fallbackTokenId: "surface.base",
    });
    const copied = await copyWorkspacePreviewImages(
      store,
      "ws-one",
      "ws-two",
      source,
    );
    const destFill = copied.find(
      (section) => section.id === "landing-hero",
    )?.fill;
    expect(destFill?.kind).toBe("image");
    if (destFill?.kind !== "image") throw new Error("expected image fill");
    expect(destFill.imageId).not.toBe("hero-img");
    const destFile = await store.get(destFill.imageId);
    expect(destFile?.workspaceId).toBe("ws-two");
    expect(read(destFile!.data)).toEqual([1, 2, 3, 4]);
    expect(await store.get("hero-img")).not.toBeNull();

    await removeWorkspacePreviewImages(store, "ws-one");
    expect(await store.get("hero-img")).toBeNull();
    expect(await store.get(destFill.imageId)).not.toBeNull();
  });
});
