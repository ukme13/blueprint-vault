import { describe, expect, it } from "vitest";
import { defaultElevationScale } from "../scale/elevation";
import { defaultRadiusScale } from "../scale/radius";
import { defaultSpacingScale } from "../scale/spacing";
import {
  createScaleHistory,
  scaleSnapshotOf,
  workspaceWithScaleSnapshot,
} from "./scale-history";
import { emptyWorkspace } from "./workspace";

function snapshot() {
  return scaleSnapshotOf(emptyWorkspace());
}

describe("createScaleHistory", () => {
  it("records a spacing prune as one step and puts the step back", () => {
    const history = createScaleHistory(snapshot());
    const start = history.present.spacing.steps;
    expect(start).toContain(10);

    history.commit({
      spacing: {
        ...history.present.spacing,
        steps: start.filter((step) => step !== 10),
      },
    });

    expect(history.present.spacing.steps).not.toContain(10);
    expect(history.size).toBe(1);

    const undone = history.undo();
    expect(undone?.spacing.steps).toContain(10);
    expect(history.canUndo).toBe(false);
  });

  it("coalesces one slider drag into one undo", () => {
    const history = createScaleHistory(snapshot());
    history.commit(
      { radius: { ...history.present.radius, multiplier: 1.25 } },
      { key: "radius:multiplier" },
    );
    history.commit(
      { radius: { ...history.present.radius, multiplier: 1.5 } },
      { key: "radius:multiplier" },
    );

    expect(history.size).toBe(1);
    expect(history.undo()?.radius.multiplier).toBe(1);
  });

  it("starts a new step when the key changes", () => {
    const history = createScaleHistory(snapshot());
    history.commit(
      { radius: { ...history.present.radius, multiplier: 1.25 } },
      { key: "radius:multiplier" },
    );
    history.commit(
      {
        spacing: {
          ...history.present.spacing,
          baseUnitPx: 8,
        },
      },
      { key: "spacing:base" },
    );

    expect(history.size).toBe(2);
    expect(history.undo()?.spacing.baseUnitPx).toBe(
      defaultSpacingScale().baseUnitPx,
    );
    expect(history.present.radius.multiplier).toBe(1.25);
  });

  it("does not record a sync from another tab", () => {
    const history = createScaleHistory(snapshot());
    history.commit({
      spacing: { ...history.present.spacing, baseUnitPx: 8 },
    });
    const before = history.size;
    history.sync({
      spacing: { ...defaultSpacingScale(), baseUnitPx: 2 },
      radius: defaultRadiusScale(),
      elevation: defaultElevationScale(),
    });

    expect(history.size).toBe(before);
    expect(history.present.spacing.baseUnitPx).toBe(2);
    expect(history.undo()?.spacing.baseUnitPx).toBe(
      defaultSpacingScale().baseUnitPx,
    );
  });

  it("writes the three slices back without touching the name", () => {
    const current = { ...emptyWorkspace(), name: "Kept" };
    const next = workspaceWithScaleSnapshot(current, {
      spacing: { baseUnitPx: 8, density: 1, steps: [1, 2] },
      radius: defaultRadiusScale(),
      elevation: defaultElevationScale(),
    });

    expect(next.name).toBe("Kept");
    expect(next.spacing.baseUnitPx).toBe(8);
  });
});
