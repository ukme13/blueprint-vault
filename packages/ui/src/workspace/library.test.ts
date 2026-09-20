import { describe, expect, it } from "vitest";
import {
  LIBRARY_CAPACITY,
  LIBRARY_STORAGE_KEY,
  addWorkspace,
  duplicateWorkspace,
  loadLibrary,
  removeWorkspace,
  renameWorkspace,
  saveCurrentWorkspace,
  switchWorkspace,
  updateCurrentWorkspace,
  workspaceDocumentKey,
} from "./library";
import { seedWorkspaceProject } from "./seed-project";
import {
  LEGACY_PALETTE_STORAGE_KEY,
  WORKSPACE_STORAGE_KEY,
  emptyWorkspace,
} from "./workspace";

function fakeStorage(seed: Record<string, string> = {}) {
  const items = new Map(Object.entries(seed));
  return {
    items,
    refuseWrites: false,
    getItem: (key: string) => items.get(key) ?? null,
    setItem(key: string, value: string) {
      if (this.refuseWrites) throw new Error("quota");
      items.set(key, value);
    },
    removeItem: (key: string) => void items.delete(key),
  };
}

function ids(labels: string[]) {
  const queue = [...labels];
  return () => {
    const next = queue.shift();
    if (!next) throw new Error("out of ids");
    return next;
  };
}

const named = (name: string) => ({ ...emptyWorkspace(), name });

function readIndex(storage: ReturnType<typeof fakeStorage>) {
  const raw = storage.getItem(LIBRARY_STORAGE_KEY);
  return raw
    ? (JSON.parse(raw) as { currentId: string | null; ids: string[] })
    : null;
}

describe("migrating the single-document key", () => {
  it("copies blueprint.workspace.v1 onto a minted id and stops writing it", () => {
    const storage = fakeStorage({
      [WORKSPACE_STORAGE_KEY]: JSON.stringify(named("Mine")),
    });

    const snapshot = loadLibrary(storage, ids(["abc"]));

    expect(snapshot.index).toEqual({ currentId: "abc", ids: ["abc"] });
    expect(snapshot.current?.name).toBe("Mine");
    expect(storage.getItem(workspaceDocumentKey("abc"))).toBeTruthy();
    expect(storage.getItem(WORKSPACE_STORAGE_KEY)).toBeNull();
    expect(storage.getItem(LIBRARY_STORAGE_KEY)).toBeTruthy();
  });

  it("leaves the old key until the copy reads back", () => {
    const storage = fakeStorage({
      [WORKSPACE_STORAGE_KEY]: JSON.stringify(named("Mine")),
    });
    const originalSetItem = storage.setItem.bind(storage);
    storage.setItem = (key: string, value: string) => {
      if (key === workspaceDocumentKey("abc")) {
        originalSetItem(key, "{ not json");
        return;
      }
      originalSetItem(key, value);
    };

    loadLibrary(storage, ids(["abc"]));

    expect(storage.getItem(WORKSPACE_STORAGE_KEY)).toBeTruthy();
  });

  it("does not resurrect v1 after the last project is deleted", () => {
    const storage = fakeStorage();
    addWorkspace(storage, named("Mine"), ids(["abc"]));
    removeWorkspace(storage, "abc", ids([]));
    storage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(named("Ghost")));

    const snapshot = loadLibrary(storage, ids(["zzz"]));

    expect(snapshot.index).toEqual({ currentId: null, ids: [] });
    expect(snapshot.current).toBeNull();
    expect(storage.getItem(workspaceDocumentKey("zzz"))).toBeNull();
  });
});

describe("adding", () => {
  it("does not overwrite another workspace", () => {
    const storage = fakeStorage();
    addWorkspace(storage, named("First"), ids(["one"]));
    addWorkspace(storage, named("Second"), ids(["two"]));

    const snapshot = loadLibrary(storage, ids([]));
    expect(snapshot.summaries.map((entry) => entry.name)).toEqual([
      "First",
      "Second",
    ]);
    expect(
      JSON.parse(storage.getItem(workspaceDocumentKey("one")) ?? "{}").name,
    ).toBe("First");
    expect(snapshot.index.currentId).toBe("two");
  });

  it("refuses a ninth project", () => {
    const storage = fakeStorage();
    const labels = Array.from(
      { length: LIBRARY_CAPACITY },
      (_, i) => `id-${i}`,
    );
    for (const label of labels) {
      expect(addWorkspace(storage, named(label), ids([label]))).not.toBeNull();
    }

    expect(addWorkspace(storage, named("Too many"), ids(["nope"]))).toBeNull();
    expect(loadLibrary(storage, ids([])).index.ids).toHaveLength(
      LIBRARY_CAPACITY,
    );
    expect(storage.getItem(workspaceDocumentKey("nope"))).toBeNull();
  });
});

describe("switching", () => {
  it("changes current without rewriting the other document", () => {
    const storage = fakeStorage();
    addWorkspace(storage, named("First"), ids(["one"]));
    addWorkspace(storage, named("Second"), ids(["two"]));
    const before = storage.getItem(workspaceDocumentKey("one"));

    const snapshot = switchWorkspace(storage, "one", ids([]));

    expect(snapshot.index.currentId).toBe("one");
    expect(snapshot.current?.name).toBe("First");
    expect(storage.getItem(workspaceDocumentKey("one"))).toBe(before);
  });
});

describe("removing", () => {
  it("delete last leaves an empty library", () => {
    const storage = fakeStorage();
    addWorkspace(storage, named("Mine"), ids(["abc"]));

    const snapshot = removeWorkspace(storage, "abc", ids([]));

    expect(snapshot.index).toEqual({ currentId: null, ids: [] });
    expect(snapshot.current).toBeNull();
    expect(snapshot.summaries).toEqual([]);
    expect(readIndex(storage)).toEqual({ currentId: null, ids: [] });
    expect(storage.getItem(workspaceDocumentKey("abc"))).toBeNull();
  });
});

describe("duplicating", () => {
  it("copies slices and lands next to the source as a named copy", () => {
    const storage = fakeStorage();
    const source = seedWorkspaceProject("Brand");
    addWorkspace(storage, source, ids(["one"]));
    addWorkspace(storage, named("Other"), ids(["two"]));

    const snapshot = duplicateWorkspace(storage, "one", ids(["copy"]));

    expect(snapshot).not.toBeNull();
    expect(snapshot!.index.ids).toEqual(["one", "copy", "two"]);
    expect(snapshot!.index.currentId).toBe("copy");
    expect(snapshot!.current?.name).toBe("Brand copy");
    expect(snapshot!.current?.palette?.tracks.map((track) => track.id)).toEqual(
      source.palette?.tracks.map((track) => track.id),
    );
    expect(snapshot!.current?.typography).not.toBeNull();
    expect(
      JSON.parse(storage.getItem(workspaceDocumentKey("one")) ?? "{}").name,
    ).toBe("Brand");
  });
});

describe("updating the current document", () => {
  it("writes only the current id", () => {
    const storage = fakeStorage();
    addWorkspace(storage, named("First"), ids(["one"]));
    addWorkspace(storage, named("Second"), ids(["two"]));
    switchWorkspace(storage, "one", ids([]));
    const otherBefore = storage.getItem(workspaceDocumentKey("two"));

    updateCurrentWorkspace(storage, (current) => ({
      ...(current ?? named("First")),
      name: "Renamed",
    }));

    expect(
      JSON.parse(storage.getItem(workspaceDocumentKey("one")) ?? "{}").name,
    ).toBe("Renamed");
    expect(storage.getItem(workspaceDocumentKey("two"))).toBe(otherBefore);
    expect(storage.getItem(WORKSPACE_STORAGE_KEY)).toBeNull();
  });
});

describe("saving", () => {
  it("mints a library entry when nothing is stored yet", () => {
    const storage = fakeStorage();
    expect(saveCurrentWorkspace(storage, named("Mine"), ids(["abc"]))).toBe(
      true,
    );
    expect(loadLibrary(storage, ids([])).current?.name).toBe("Mine");
    expect(storage.getItem(WORKSPACE_STORAGE_KEY)).toBeNull();
  });

  it("retires the palette key once a library document reads back", () => {
    const storage = fakeStorage({
      [LEGACY_PALETTE_STORAGE_KEY]: JSON.stringify({
        name: "Legacy",
        tracks: [{ id: "primary", name: "primary", seedHex: "#7646ab" }],
        lightnessPattern: "custom",
        lightnessValues: [97.5, 5],
      }),
    });

    loadLibrary(storage, ids(["abc"]));

    expect(storage.getItem(LEGACY_PALETTE_STORAGE_KEY)).toBeNull();
    expect(loadLibrary(storage, ids([])).current?.name).toBe("Legacy");
  });
});

describe("renaming a workspace", () => {
  it("renames a project and updates the library summary and current snapshot", () => {
    const storage = fakeStorage({
      [LIBRARY_STORAGE_KEY]: JSON.stringify({
        currentId: "one",
        ids: ["one", "two"],
      }),
      [workspaceDocumentKey("one")]: JSON.stringify(named("First")),
      [workspaceDocumentKey("two")]: JSON.stringify(named("Second")),
    });

    const snapshot = renameWorkspace(storage, "one", "First Renamed");

    expect(snapshot.summaries.find((s) => s.id === "one")?.name).toBe(
      "First Renamed",
    );
    expect(snapshot.current?.name).toBe("First Renamed");
    expect(
      JSON.parse(storage.getItem(workspaceDocumentKey("one")) ?? "{}").name,
    ).toBe("First Renamed");
  });

  it("renames a background project without changing current", () => {
    const storage = fakeStorage({
      [LIBRARY_STORAGE_KEY]: JSON.stringify({
        currentId: "one",
        ids: ["one", "two"],
      }),
      [workspaceDocumentKey("one")]: JSON.stringify(named("First")),
      [workspaceDocumentKey("two")]: JSON.stringify(named("Second")),
    });

    const snapshot = renameWorkspace(storage, "two", "Second Renamed");

    expect(snapshot.summaries.find((s) => s.id === "two")?.name).toBe(
      "Second Renamed",
    );
    expect(snapshot.current?.name).toBe("First");
    expect(
      JSON.parse(storage.getItem(workspaceDocumentKey("two")) ?? "{}").name,
    ).toBe("Second Renamed");
  });
});

describe("timestamps", () => {
  it("records updatedAt when writing a project and includes it in summaries", () => {
    const before = Date.now();
    const storage = fakeStorage();
    const created = addWorkspace(storage, named("Timestamped"), ids(["ts-1"]));
    const after = Date.now();
    const ts = created?.summaries[0]?.updatedAt;
    expect(typeof ts).toBe("number");
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });
});
