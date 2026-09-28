import { describe, expect, it } from "vitest";
import {
  defaultSpacingPreviewSettings,
  normalizeSpacingPreviewSettings,
} from "../scale/spacing";
import { scaleSnapshotOf, workspaceWithScaleSnapshot } from "./scale-history";
import {
  emptyWorkspace,
  readWorkspaceProject,
  withSpacingPreview,
} from "./workspace";

const DEFAULTS = {
  slots: { inset: 6, stack: 2, columns: 4 },
  showSpacing: true,
  unit: "px",
};

describe("spacing preview settings", () => {
  it("defaults to inset 6, stack 2, columns 4, marks shown, px", () => {
    expect(defaultSpacingPreviewSettings()).toEqual(DEFAULTS);
  });

  it("gives a workspace saved before them the defaults", () => {
    const older: Record<string, unknown> = { ...emptyWorkspace() };
    delete older.spacingPreview;
    expect(readWorkspaceProject(older)?.spacingPreview).toEqual(DEFAULTS);
  });

  it("keeps what is stored, and fills only the gaps", () => {
    expect(
      normalizeSpacingPreviewSettings({
        slots: { inset: 8, stack: "wide", columns: -1 },
        unit: "rem",
      }),
    ).toEqual({
      slots: { inset: 8, stack: 2, columns: 4 },
      showSpacing: true,
      unit: "rem",
    });
    expect(normalizeSpacingPreviewSettings({ showSpacing: false })).toEqual({
      ...DEFAULTS,
      showSpacing: false,
    });
  });

  it("falls back whole on something that is not settings at all", () => {
    for (const value of [null, "px", 4, [1, 2], { unit: "em", slots: [] }]) {
      expect(normalizeSpacingPreviewSettings(value)).toEqual(DEFAULTS);
    }
  });

  it("round-trips through a stored workspace", () => {
    const project = withSpacingPreview(emptyWorkspace(), {
      slots: { inset: 8, stack: 3, columns: 6 },
      unit: "rem",
      showSpacing: false,
    });
    const stored = readWorkspaceProject(JSON.parse(JSON.stringify(project)));
    expect(stored?.spacingPreview).toEqual(project.spacingPreview);
  });

  it("patches one setting and keeps the others", () => {
    const next = withSpacingPreview(emptyWorkspace(), { unit: "rem" });
    expect(next.spacingPreview).toEqual({ ...DEFAULTS, unit: "rem" });
  });

  it("is left alone by undo: a scale snapshot never carries it", () => {
    const set = withSpacingPreview(emptyWorkspace(), { unit: "rem" });
    const undone = workspaceWithScaleSnapshot(
      set,
      scaleSnapshotOf(emptyWorkspace()),
    );
    expect(undone.spacingPreview.unit).toBe("rem");
    expect(scaleSnapshotOf(set)).not.toHaveProperty("spacingPreview");
  });
});
