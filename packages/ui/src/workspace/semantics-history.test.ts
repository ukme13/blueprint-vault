import { describe, expect, it } from "vitest";
import { generatePalettes } from "../color/palette";
import { deleteTokens, dropButtonScheme } from "../color/selection-ops";
import { seedSemanticTokens, type SemanticToken } from "../color/semantic";
import {
  createSemanticsHistory,
  SEMANTICS_HISTORY_LIMIT,
  semanticsSnapshotOf,
  workspaceWithSnapshot,
  type SemanticsSnapshot,
} from "./semantics-history";
import { readWorkspaceProject } from "./workspace";
import {
  formatBlueprintWorkspace,
  parseBlueprintWorkspace,
} from "./workspace-file";
import { defaultElevationScale } from "../scale/elevation";
import { defaultRadiusScale } from "../scale/radius";
import { defaultSpacingScale } from "../scale/spacing";
import { normalizeButtonSchemes } from "../button-tones";
import type { ColorTrack } from "../color/types";
import type { WorkspaceProject } from "./types";

const LIGHTNESS = [
  97.5, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50, 45, 40, 35, 30, 25, 20, 15, 10,
  5,
];

const TRACKS = [
  { id: "t-primary", name: "primary", seedHex: "#7646ab" },
  { id: "t-secondary", name: "secondary", seedHex: "#4a6fa5" },
  { id: "t-neutral", name: "neutral", seedHex: "#737373" },
  { id: "t-success", name: "success", seedHex: "#2f7d32" },
  { id: "t-warning", name: "warning", seedHex: "#b87503" },
  { id: "t-error", name: "error", seedHex: "#b02b1b" },
  { id: "t-info", name: "info", seedHex: "#2878b8" },
];

function palette(): ColorTrack[] {
  return generatePalettes({ tracks: TRACKS, lightnessValues: LIGHTNESS });
}

function workspace(over: Partial<WorkspaceProject> = {}): WorkspaceProject {
  return {
    name: "Brand",
    palette: {
      tracks: TRACKS.map((track) => ({
        ...track,
        adjustments: { anchors: {}, manualOverrides: {} },
      })),
      lightnessPattern: "custom",
      lightnessValues: LIGHTNESS,
    },
    typography: null,
    semantics: seedSemanticTokens(palette()),
    removedSeedRoles: [],
    buttonSchemes: normalizeButtonSchemes(undefined),
    spacing: defaultSpacingScale(),
    radius: defaultRadiusScale(),
    elevation: defaultElevationScale(),
    ...over,
  };
}

const ids = (snapshot: SemanticsSnapshot) =>
  (snapshot.tokens ?? []).map((token) => token.id);

/** A small layer whose order is the thing being checked. */
function ordered(): SemanticToken[] {
  const reference = (weight: number) => ({ trackId: "t-neutral", weight });
  return ["alpha", "beta", "gamma", "delta", "epsilon"].map((name, at) => ({
    id: `brand.${name}`,
    name,
    description: "",
    light: reference(100 + at * 100),
    dark: reference(900 - at * 100),
  }));
}

describe("a snapshot is the layer and the removed list together", () => {
  it("restores both when it is put back", () => {
    const before = workspace();
    const snapshot = semanticsSnapshotOf(before);
    const after = workspaceWithSnapshot(before, {
      tokens: [],
      removedSeedRoles: ["border.subtle"],
      buttonSchemes: normalizeButtonSchemes(undefined),
    });

    expect(after.semantics).toEqual([]);
    expect(after.removedSeedRoles).toEqual(["border.subtle"]);
    /* And every other slice is where it was: this writes one slice. */
    expect(after.palette).toBe(before.palette);
    expect(snapshot.removedSeedRoles).toEqual([]);
  });

  it("does not reconcile the list on the way back in", () => {
    /* The difference between undo and an edit. `withSemanticsSlice`
       reconciles, because a new edit has to; an undo is restoring a pair that
       was already consistent when it was recorded. Reconciling here would drop
       the removal the moment its token came back — which is the step being
       undone. */
    const tokens = seedSemanticTokens(palette());
    const after = workspaceWithSnapshot(workspace(), {
      tokens,
      removedSeedRoles: ["border.subtle"],
      buttonSchemes: normalizeButtonSchemes(undefined),
    });

    expect(
      ids({
        tokens,
        removedSeedRoles: [],
        buttonSchemes: [],
      }),
    ).toContain("border.subtle");
    expect(after.removedSeedRoles).toEqual(["border.subtle"]);
  });
});

describe("undo over the selection operations", () => {
  it("restores order as well as content after a multi-delete", () => {
    /* Content alone is the easy half. A history that rebuilt the layer by
       adding the deleted tokens back would put them at the end, and a table
       somebody arranged would come back rearranged — an undo that looks like
       it worked. */
    const layer = ordered();
    const history = createSemanticsHistory({
      tokens: layer,
      removedSeedRoles: [],
      buttonSchemes: normalizeButtonSchemes(undefined),
    });

    const gone = deleteTokens(layer, ["brand.beta", "brand.delta"]);
    expect(gone.refusals).toEqual([]);

    history.commit(gone.layer, { justRemoved: gone.removed });

    expect(ids(history.undo()!)).toEqual([
      "brand.alpha",
      "brand.beta",
      "brand.gamma",
      "brand.delta",
      "brand.epsilon",
    ]);
  });

  it("takes back a whole selection in one step, not one token at a time", () => {
    const layer = ordered();
    const history = createSemanticsHistory({
      tokens: layer,
      removedSeedRoles: [],
      buttonSchemes: normalizeButtonSchemes(undefined),
    });
    const gone = deleteTokens(layer, [
      "brand.beta",
      "brand.gamma",
      "brand.delta",
    ]);

    history.commit(gone.layer, { justRemoved: gone.removed });

    expect(history.size).toBe(1);
    expect(ids(history.undo()!)).toHaveLength(5);
    expect(history.canUndo).toBe(false);
  });
});

describe("what counts as a step", () => {
  const snapshot = (tokens: SemanticToken[]): SemanticsSnapshot => ({
    tokens,
    removedSeedRoles: [],
    buttonSchemes: normalizeButtonSchemes(undefined),
  });

  it("coalesces consecutive writes under the same edit key", () => {
    /* An in-place rename commits on every keystroke. Without this, one undo
       takes back one letter. */
    const layer = ordered();
    const history = createSemanticsHistory(snapshot(layer));

    for (const label of ["A", "Al", "Alp", "Alpha"]) {
      history.commit(
        layer.map((token) =>
          token.id === "brand.alpha" ? { ...token, name: label } : token,
        ),
        { key: "rename:brand.alpha" },
      );
    }

    expect(history.size).toBe(1);
    expect(history.undo()!.tokens![0]!.name).toBe("alpha");
  });

  it("starts a new step for a different edit key", () => {
    /* A boolean "continues the previous edit" cannot tell the fourth keystroke
       in one cell from the first keystroke in the next, so it would fold two
       renames into one undo. The key can. */
    const layer = ordered();
    const history = createSemanticsHistory(snapshot(layer));

    history.commit(layer, { key: "rename:brand.alpha" });
    history.commit(layer, { key: "rename:brand.alpha" });
    history.commit(layer, { key: "rename:brand.beta" });

    expect(history.size).toBe(2);
  });

  it("does not coalesce across an unkeyed write", () => {
    /* A delete between two keystrokes is a step, and the keystroke after it
       must not reach back over the delete to replace the value before it. */
    const layer = ordered();
    const history = createSemanticsHistory(snapshot(layer));

    history.commit(layer, { key: "rename:brand.alpha" });
    history.commit(deleteTokens(layer, ["brand.beta"]).layer);
    history.commit(layer, { key: "rename:brand.alpha" });

    expect(history.size).toBe(3);
  });

  it("does not record a slice that arrived from another tab", () => {
    /* The store re-reads before every write, so another tab's edit reaches
       this one through a reconcile rather than through an edit. Undo means
       "take back what I did"; undoing their write would throw their work away
       with nothing to tell it from an ordinary undo. */
    const layer = ordered();
    const history = createSemanticsHistory(snapshot(layer));

    history.commit(deleteTokens(layer, ["brand.beta"]).layer);
    const before = history.size;

    history.sync(snapshot(deleteTokens(layer, ["brand.epsilon"]).layer));

    expect(history.size).toBe(before);
    expect(history.canRedo).toBe(false);
    /* And this session's own step is still its own to take back. */
    expect(ids(history.undo()!)).toHaveLength(5);
  });

  it("ends an open edit when a slice arrives from elsewhere", () => {
    /* Coalescing across somebody else's write would replace a value their tab
       put there. */
    const layer = ordered();
    const history = createSemanticsHistory(snapshot(layer));

    history.commit(layer, { key: "rename:brand.alpha" });
    history.sync(snapshot(layer));
    history.commit(layer, { key: "rename:brand.alpha" });

    expect(history.size).toBe(2);
  });

  it("keeps at most the limit, under ten times as many writes", () => {
    const layer = ordered();
    const history = createSemanticsHistory(snapshot(layer), 6);

    /* Sixty distinct writes, so nothing coalesces and every one is a step. */
    for (let at = 0; at < 60; at += 1) {
      history.commit(
        layer.map((token) =>
          token.id === "brand.alpha" ? { ...token, name: `pass ${at}` } : token,
        ),
      );
    }

    expect(history.size).toBe(6);
  });

  it("defaults to a limit somebody can actually reach the end of", () => {
    expect(SEMANTICS_HISTORY_LIMIT).toBe(50);
  });
});

describe("an undone delete survives a reload", () => {
  /**
   * Delete a seed role, then undo it, then read the workspace back.
   *
   * `border.subtle` because it is one of the two seed roles nothing reads by
   * name, so it is deletable at all.
   */
  function undoneDelete(): WorkspaceProject {
    const start = workspace();
    const history = createSemanticsHistory(semanticsSnapshotOf(start));

    const gone = deleteTokens(start.semantics!, ["border.subtle"]);
    expect(gone.removed).toEqual(["border.subtle"]);

    const deleted = history.commit(gone.layer, { justRemoved: gone.removed });
    expect(deleted.removedSeedRoles).toEqual(["border.subtle"]);

    return workspaceWithSnapshot(start, history.undo()!);
  }

  it("puts the role back and forgets that it was removed", () => {
    const after = undoneDelete();

    expect(after.semantics!.map((token) => token.id)).toContain(
      "border.subtle",
    );
    /* The half a token array alone cannot carry. Leave the id on the list and
       the next read takes the role straight back out. */
    expect(after.removedSeedRoles).toEqual([]);
  });

  it("still has the role after a round trip through the file", () => {
    const after = parseBlueprintWorkspace(
      formatBlueprintWorkspace(undoneDelete()),
    );

    expect(after.semantics!.map((token) => token.id)).toContain(
      "border.subtle",
    );
    expect(after.removedSeedRoles).toEqual([]);
  });

  it("and after a round trip through storage", () => {
    /* Both doors, because they are two readers of one document and the
       removed list is honoured in each of them. */
    const raw = JSON.parse(JSON.stringify(undoneDelete())) as Record<
      string,
      unknown
    >;
    const after = readWorkspaceProject(raw)!;

    expect(after.semantics!.map((token) => token.id)).toContain(
      "border.subtle",
    );
    expect(after.removedSeedRoles).toEqual([]);
  });

  it("undoes one of two deletions back to a list that is not empty", () => {
    /* Both free seed roles deleted, then one undone. The list has to come back
       holding the *other* one — an undo that took the workspace's current list
       instead of the snapshot's would give an empty list here and still pass
       every case where only one role was ever deleted. */
    const start = workspace();
    const history = createSemanticsHistory(semanticsSnapshotOf(start));

    const first = deleteTokens(start.semantics!, ["border.subtle"]);
    const afterFirst = history.commit(first.layer, {
      justRemoved: first.removed,
    });

    const second = deleteTokens(afterFirst.tokens!, ["border.muted"]);
    history.commit(second.layer, { justRemoved: second.removed });

    const undone = history.undo()!;
    expect(undone.removedSeedRoles).toEqual(["border.subtle"]);

    const after = parseBlueprintWorkspace(
      formatBlueprintWorkspace(workspaceWithSnapshot(start, undone)),
    );
    const ids = after.semantics!.map((token) => token.id);
    expect(ids).toContain("border.muted");
    expect(ids).not.toContain("border.subtle");
  });

  it("redoing puts the deletion back, list and all", () => {
    const start = workspace();
    const history = createSemanticsHistory(semanticsSnapshotOf(start));
    const gone = deleteTokens(start.semantics!, ["border.subtle"]);

    history.commit(gone.layer, { justRemoved: gone.removed });
    history.undo();

    const redone = workspaceWithSnapshot(start, history.redo()!);
    const after = parseBlueprintWorkspace(formatBlueprintWorkspace(redone));

    expect(after.semantics!.map((token) => token.id)).not.toContain(
      "border.subtle",
    );
    expect(after.removedSeedRoles).toEqual(["border.subtle"]);
  });

  it("puts the scheme back with the eight roles when a dropped tone is undone", () => {
    const start = workspace();
    const history = createSemanticsHistory(semanticsSnapshotOf(start));
    const dropped = dropButtonScheme(
      start.semantics!,
      start.buttonSchemes,
      "info",
    );

    history.commit(dropped.edit.layer, {
      justRemoved: dropped.edit.removed,
      buttonSchemes: dropped.buttonSchemes,
    });
    expect(history.present.buttonSchemes).not.toContain("info");
    expect(history.present.tokens!.map((token) => token.id)).not.toContain(
      "status.info",
    );

    const undone = history.undo()!;
    expect(undone.buttonSchemes).toContain("info");
    expect(undone.tokens!.map((token) => token.id)).toContain("status.info");
    expect(undone.removedSeedRoles).not.toContain("status.info");
  });
});
