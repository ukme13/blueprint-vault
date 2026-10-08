import { describe, expect, it } from "vitest";
import { withTypographySlice, emptyWorkspace } from "./workspace";
import { seedTypographyProject, seedWorkspaceProject } from "./seed-project";
import {
  WORKSPACE_HISTORY_LIMIT,
  createWorkspaceHistory,
  restoreUndoable,
  undoableKey,
} from "./workspace-history";
import { changedSemanticTargets, originOfChange } from "./workspace-origin";
import type { WorkspaceProject } from "./types";
import { updateRoleValue } from "../typography/system";

function base(): WorkspaceProject {
  return withTypographySlice(emptyWorkspace(), seedTypographyProject("T"));
}

const withBaseUnit = (project: WorkspaceProject, baseUnitPx: number) => ({
  ...project,
  spacing: { ...project.spacing, baseUnitPx },
});

const withLineHeight = (project: WorkspaceProject, value: number) => ({
  ...project,
  typography: {
    ...project.typography!,
    system: updateRoleValue(project.typography!.system, "body", {
      lineHeight: { mode: "ratio" as const, value },
    }),
  },
});

describe("createWorkspaceHistory", () => {
  it("takes a step for an edit and puts the earlier document back", () => {
    const start = base();
    const history = createWorkspaceHistory(start);

    expect(history.commit(withBaseUnit(start, 8))).toBe(true);
    expect(history.canUndo).toBe(true);
    expect(history.undo()).toBe(start);
    expect(history.canRedo).toBe(true);
    expect(history.redo()!.spacing.baseUnitPx).toBe(8);
  });

  it("undoes across studios, latest edit first", () => {
    /* A typography edit, then a spacing edit made after moving to Spacing. */
    const start = base();
    const history = createWorkspaceHistory(start);
    const typed = withLineHeight(start, 1.9);
    const spaced = withBaseUnit(typed, 8);
    history.commit(typed);
    history.commit(spaced);

    expect(history.undo()).toBe(typed);
    expect(history.undo()).toBe(start);
    expect(history.undo()).toBeNull();
  });

  it("takes no step for a write that changed nothing, however it was read", () => {
    const start = base();
    const history = createWorkspaceHistory(start);
    /* A document read back from storage is a fresh object with the same
       content: saving what was already there is not an edit. */
    const reread = JSON.parse(JSON.stringify(start)) as WorkspaceProject;
    expect(history.commit(reread)).toBe(false);
    expect(history.canUndo).toBe(false);
  });

  it("takes no step for what an undo does not own", () => {
    const start = base();
    const history = createWorkspaceHistory(start);

    /* A rename, as the studios write it: the workspace's name, mirrored into
       the type system. */
    history.commit({
      ...start,
      name: "Renamed",
      typography: {
        ...start.typography!,
        system: { ...start.typography!.system, name: "Renamed" },
      },
    });
    history.commit({
      ...start,
      spacingPreview: { ...start.spacingPreview, ...{ device: "tablet" } },
    } as WorkspaceProject);
    history.commit({
      ...start,
      typography: { ...start.typography!, specimenText: "Other copy" },
    });
    expect(history.canUndo).toBe(false);
  });

  it("coalesces writes that share a key, and keeps the rest apart", () => {
    const start = base();
    const history = createWorkspaceHistory(start);
    let current = start;

    for (const value of [1.3, 1.4, 1.5]) {
      current = withLineHeight(current, value);
      history.commit(current, { key: "role:lineHeight:body" });
    }
    expect(history.size).toBe(1);
    expect(history.undo()).toBe(start);

    const again = createWorkspaceHistory(start);
    again.commit(withBaseUnit(start, 5), { key: "a" });
    again.commit(withBaseUnit(start, 6), { key: "b" });
    again.commit(withBaseUnit(start, 7));
    again.commit(withBaseUnit(start, 8));
    expect(again.size).toBe(4);
  });

  it("starts a new step for the first write after an undo", () => {
    const start = base();
    const history = createWorkspaceHistory(start);
    history.commit(withBaseUnit(start, 5), { key: "k" });
    history.commit(withBaseUnit(start, 6), { key: "k" });
    history.undo();
    history.redo();
    history.commit(withBaseUnit(start, 7), { key: "k" });
    expect(history.size).toBe(2);
  });

  it("drops the redo branch on a new edit", () => {
    const start = base();
    const history = createWorkspaceHistory(start);
    history.commit(withBaseUnit(start, 5));
    history.commit(withBaseUnit(start, 6));
    history.undo();
    history.commit(withBaseUnit(start, 9));
    expect(history.canRedo).toBe(false);
  });

  it("adopts a document from outside as no step, keeping its own past", () => {
    const start = base();
    const history = createWorkspaceHistory(start);
    history.commit(withBaseUnit(start, 8));

    history.sync(withBaseUnit(start, 12));
    expect(history.size).toBe(1);
    /* And what was adopted is now the baseline: writing it again is no edit. */
    expect(history.commit(withBaseUnit(start, 12))).toBe(false);
  });

  it("holds at most its limit", () => {
    expect(WORKSPACE_HISTORY_LIMIT).toBe(50);
    const start = base();
    const history = createWorkspaceHistory(start, 3);
    for (let unit = 5; unit <= 10; unit += 1) {
      history.commit(withBaseUnit(start, unit));
    }
    expect(history.size).toBe(3);
  });
});

describe("restoreUndoable", () => {
  it("puts back the undoable parts and leaves the rest as it now is", () => {
    const earlier = base();
    const now: WorkspaceProject = {
      ...withLineHeight(withBaseUnit(earlier, 8), 1.9),
      name: "Renamed since",
      typography: {
        ...withLineHeight(withBaseUnit(earlier, 8), 1.9).typography!,
        specimenText: "Typed since",
      },
    };

    const restored = restoreUndoable(now, earlier);
    /* Back: the scale and the type system. */
    expect(restored.spacing).toBe(earlier.spacing);
    expect(restored.typography!.system).toEqual({
      ...earlier.typography!.system,
      name: now.typography!.system.name,
    });
    /* Not touched: the name and the preview text. */
    expect(restored.name).toBe("Renamed since");
    expect(restored.typography!.specimenText).toBe("Typed since");
    expect(undoableKey(restored)).toBe(undoableKey(earlier));
  });

  it("adopts a type slice when the current document has none", () => {
    const withType = base();
    const without: WorkspaceProject = { ...withType, typography: null };
    expect(restoreUndoable(without, withType).typography).toBe(
      withType.typography,
    );
    /* And keeps having none when the earlier one had none. */
    expect(restoreUndoable(withType, without).typography).toBe(
      withType.typography,
    );
  });
});

describe("where an edit was made", () => {
  const withRadius = (project: WorkspaceProject, multiplier: number) => ({
    ...project,
    radius: { ...project.radius, multiplier },
  });
  const withLayoutCell = (
    project: WorkspaceProject,
    id: string,
    cell: string,
  ) => ({
    ...project,
    layout: project.layout.map((token) =>
      token.id === id
        ? { ...token, byDevice: { ...token.byDevice, desktop: cell } }
        : token,
    ),
  });

  it("reads the studio from what changed", () => {
    const start = base();
    expect(originOfChange(start, withLineHeight(start, 1.9))).toEqual({
      path: "/typography",
    });
    expect(originOfChange(start, withBaseUnit(start, 8))).toEqual({
      path: "/spacing",
    });
    expect(originOfChange(start, withRadius(start, 1.5))).toEqual({
      path: "/radius",
    });
    expect(
      originOfChange(start, {
        ...start,
        elevation: { ...start.elevation, levels: [] },
      }),
    ).toEqual({ path: "/elevation" });
    expect(
      originOfChange(start, { ...start, removedSeedRoles: ["fg.muted"] }),
    ).toEqual({ path: "/colour", query: "view=semantics" });
  });

  it("puts layout uses in Spacing, or in Radius when only radius uses moved", () => {
    const start = base();
    expect(
      originOfChange(start, withLayoutCell(start, "inset-card", "8")),
    ).toEqual({ path: "/spacing" });
    expect(
      originOfChange(start, withLayoutCell(start, "radius-button", "full")),
    ).toEqual({ path: "/radius" });
  });

  it("names no studio for a step that only moved the device ratios", () => {
    const start = base();
    expect(
      originOfChange(start, {
        ...start,
        previewDevices: start.previewDevices.map((device) => ({
          ...device,
          widthPx: device.widthPx + 1,
        })),
      }),
    ).toBeNull();
  });

  it("hands back the place of the edit being undone, and of the one redone", () => {
    const start = base();
    const history = createWorkspaceHistory(start);
    const typed = withLineHeight(start, 1.9);
    const spaced = withBaseUnit(typed, 8);
    history.commit(typed);
    history.commit(spaced);

    history.undo();
    expect(history.lastOrigin).toEqual({ path: "/spacing" });
    history.undo();
    expect(history.lastOrigin).toEqual({ path: "/typography" });
    history.redo();
    expect(history.lastOrigin).toEqual({ path: "/typography" });
    history.redo();
    expect(history.lastOrigin).toEqual({ path: "/spacing" });
  });

  it("prefers an origin the edit was given, and forgets it after a commit", () => {
    const start = base();
    const history = createWorkspaceHistory(start);
    history.commit(withLayoutCell(start, "inset-card", "8"), {
      origin: { path: "/preview" },
    });
    history.undo();
    expect(history.lastOrigin).toEqual({ path: "/preview" });
    history.redo();
    history.commit(withBaseUnit(start, 8));
    expect(history.lastOrigin).toBeNull();
  });

  it("has no place when there is nothing to undo", () => {
    const history = createWorkspaceHistory(base());
    expect(history.undo()).toBeNull();
    expect(history.lastOrigin).toBeNull();
  });
});

describe("opaque is opaque however it is written", () => {
  it("takes no step for an alpha of 1 where there was none", () => {
    const start = seedWorkspaceProject("T");
    const history = createWorkspaceHistory(start);
    const respelled: WorkspaceProject = {
      ...start,
      semantics: start.semantics!.map((token) =>
        token.id === "border.muted"
          ? { ...token, light: { ...token.light, alpha: 1 } }
          : token,
      ),
    };
    expect(history.commit(respelled)).toBe(false);
    expect(history.canUndo).toBe(false);
  });

  it("still takes a step for a real change of alpha", () => {
    const start = seedWorkspaceProject("T");
    const history = createWorkspaceHistory(start);
    const edited: WorkspaceProject = {
      ...start,
      semantics: start.semantics!.map((token) =>
        token.id === "border.subtle"
          ? { ...token, light: { ...token.light, alpha: 0.65 } }
          : token,
      ),
    };
    expect(history.commit(edited)).toBe(true);
  });
});

describe("what an undo changed in the semantic layer", () => {
  const seeded = () => seedWorkspaceProject("T");
  const withAlpha = (project: WorkspaceProject, id: string, alpha: number) => ({
    ...project,
    semantics: project.semantics!.map((token) =>
      token.id === id ? { ...token, light: { ...token.light, alpha } } : token,
    ),
  });

  it("points at the cell that differs, and at nothing else", () => {
    const start = seeded();
    expect(
      changedSemanticTargets(start, withAlpha(start, "border.subtle", 0.65)),
    ).toEqual([{ id: "border.subtle", cell: "light" }]);
    expect(changedSemanticTargets(start, start)).toEqual([]);
  });

  it("points at a row that comes back, not at one that has gone", () => {
    const start = seeded();
    const without = {
      ...start,
      semantics: start.semantics!.filter((token) => token.id !== "fg.muted"),
    };
    expect(changedSemanticTargets(without, start)).toEqual([
      { id: "fg.muted" },
    ]);
    expect(changedSemanticTargets(start, without)).toEqual([]);
  });

  it("names a name or a description that was edited", () => {
    const start = seeded();
    const renamed = {
      ...start,
      semantics: start.semantics!.map((token) =>
        token.id === "fg.muted"
          ? { ...token, description: "Changed.", name: "Muted text" }
          : token,
      ),
    };
    expect(changedSemanticTargets(start, renamed)).toEqual([
      { id: "fg.muted", cell: "name" },
      { id: "fg.muted", cell: "description" },
    ]);
  });

  it("stops at a dozen, so a bulk edit does not light the table", () => {
    const start = seeded();
    const everything = {
      ...start,
      semantics: start.semantics!.map((token) => ({
        ...token,
        description: `${token.description}!`,
      })),
    };
    expect(changedSemanticTargets(start, everything)).toHaveLength(12);
  });

  it("hands the history's targets back after an undo and a redo", () => {
    const start = seeded();
    const history = createWorkspaceHistory(start);
    history.commit(withAlpha(start, "border.subtle", 0.65));

    history.undo();
    expect(history.lastTargets).toEqual([
      { id: "border.subtle", cell: "light" },
    ]);
    history.redo();
    expect(history.lastTargets).toEqual([
      { id: "border.subtle", cell: "light" },
    ]);
    history.commit(withAlpha(start, "border.subtle", 0.3));
    expect(history.lastTargets).toEqual([]);
  });
});
