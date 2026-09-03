import { describe, expect, it } from "vitest";
import {
  loadStoredWorkspace,
  saveStoredWorkspace,
  updateStoredWorkspace,
} from "./store";
import {
  LEGACY_PALETTE_STORAGE_KEY,
  LEGACY_TYPOGRAPHY_STORAGE_KEY,
  WORKSPACE_STORAGE_KEY,
} from "./workspace";
import { emptyWorkspace } from "./workspace";

/** A storage that behaves, and can be told to stop. */
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

const named = (name: string) => ({ ...emptyWorkspace(), name });

describe("reading", () => {
  it("reads nothing out of an empty storage", () => {
    expect(loadStoredWorkspace(fakeStorage())).toBeNull();
  });

  it("reads nothing where there is no storage at all", () => {
    /* A server render, which is why every studio reads in an effect. */
    expect(loadStoredWorkspace(null)).toBeNull();
  });

  it("reads back what was saved", () => {
    const storage = fakeStorage();
    saveStoredWorkspace(storage, named("Mine"));
    expect(loadStoredWorkspace(storage)?.name).toBe("Mine");
  });

  it("retires the legacy keys once the workspace key stands on its own", () => {
    const storage = fakeStorage({
      [LEGACY_PALETTE_STORAGE_KEY]: "{}",
      [LEGACY_TYPOGRAPHY_STORAGE_KEY]: "{}",
    });
    saveStoredWorkspace(storage, named("Mine"));

    loadStoredWorkspace(storage);

    expect(storage.getItem(LEGACY_PALETTE_STORAGE_KEY)).toBeNull();
    expect(storage.getItem(LEGACY_TYPOGRAPHY_STORAGE_KEY)).toBeNull();
  });

  it("keeps the legacy keys while the workspace key holds nothing", () => {
    /* A migration that has not been persisted yet still needs its source. */
    const storage = fakeStorage({ [LEGACY_PALETTE_STORAGE_KEY]: "{}" });

    loadStoredWorkspace(storage);

    expect(storage.getItem(LEGACY_PALETTE_STORAGE_KEY)).toBe("{}");
  });

  it("reads unreadable storage as an empty one", () => {
    const storage = fakeStorage({ [WORKSPACE_STORAGE_KEY]: "{ not json" });
    expect(loadStoredWorkspace(storage)).toBeNull();
  });
});

describe("writing", () => {
  it("says so when a write lands", () => {
    expect(saveStoredWorkspace(fakeStorage(), named("Mine"))).toBe(true);
  });

  it("says so when storage refuses, rather than throwing at the studio", () => {
    const storage = fakeStorage();
    storage.refuseWrites = true;
    expect(saveStoredWorkspace(storage, named("Mine"))).toBe(false);
  });

  it("writes nothing where there is no storage", () => {
    expect(saveStoredWorkspace(null, named("Mine"))).toBe(false);
  });
});

describe("updating", () => {
  it("hands the patch what is stored now, not what a caller remembers", () => {
    /* The rule the studios split on: the other one owns the other slices and
       may have written since this page loaded. */
    const storage = fakeStorage();
    saveStoredWorkspace(storage, named("Written elsewhere"));

    const seen: (string | null)[] = [];
    updateStoredWorkspace(storage, (current) => {
      seen.push(current?.name ?? null);
      return named("Mine");
    });

    expect(seen).toEqual(["Written elsewhere"]);
    expect(loadStoredWorkspace(storage)?.name).toBe("Mine");
  });

  it("passes null when there is nothing stored yet", () => {
    const storage = fakeStorage();
    let sawNull = false;
    updateStoredWorkspace(storage, (current) => {
      sawNull = current === null;
      return named("First");
    });
    expect(sawNull).toBe(true);
  });

  it("does not run the patch where there is no storage", () => {
    let ran = false;
    updateStoredWorkspace(null, () => {
      ran = true;
      return named("Mine");
    });
    expect(ran).toBe(false);
  });
});

describe("retiring the keys a workspace replaced", () => {
  it("retires them on the write that first creates the workspace", () => {
    /* A migrated project used to keep its legacy keys until whatever load
       happened to come next — which was the palette studio writing its
       semantics slice on mount. When that write moved onto the store, nothing
       followed. The write that makes the workspace real is the one that
       should clear what it replaced, and nothing else should have to. */
    const storage = fakeStorage({ [LEGACY_PALETTE_STORAGE_KEY]: "{}" });
    expect(storage.getItem(WORKSPACE_STORAGE_KEY)).toBeNull();

    updateStoredWorkspace(storage, () => named("Migrated"));

    expect(storage.getItem(WORKSPACE_STORAGE_KEY)).not.toBeNull();
    expect(storage.getItem(LEGACY_PALETTE_STORAGE_KEY)).toBeNull();
  });
});
