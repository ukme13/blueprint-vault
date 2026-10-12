import { describe, expect, it } from "vitest";
import { defaultElevationScale } from "../scale/elevation";
import { defaultLayoutTokens } from "../scale/layout-tokens";
import {
  addLayoutToken,
  removeLayoutToken,
  setLayoutReference,
} from "../scale/layout-edit";
import { defaultPreviewDevices } from "../typography/preview-devices";
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
      layout: defaultLayoutTokens(),
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
      layout: defaultLayoutTokens(),
    });

    expect(next.name).toBe("Kept");
    expect(next.spacing.baseUnitPx).toBe(8);
  });

  it("puts a layout pointer back without touching spacing", () => {
    const history = createScaleHistory(snapshot());
    history.commit({
      layout: setLayoutReference(
        history.present.layout,
        "gap-section",
        "phone",
        "8",
      ),
    });

    const phoneGap = (
      layout: readonly { id: string; byDevice: Record<string, string> }[],
    ) => layout.find((token) => token.id === "gap-section")?.byDevice.phone;
    expect(phoneGap(history.present.layout)).toBe("8");
    expect(phoneGap(history.undo()?.layout ?? [])).toBe("16");
    expect(history.present.spacing.steps).toEqual(defaultSpacingScale().steps);
  });

  it("coalesces consecutive writes to the same layout cell", () => {
    const history = createScaleHistory(snapshot());
    const key = "layout:cell:inset-container:phone";
    history.commit(
      {
        layout: setLayoutReference(
          history.present.layout,
          "inset-container",
          "phone",
          "8",
        ),
      },
      { key },
    );
    history.commit(
      {
        layout: setLayoutReference(
          history.present.layout,
          "inset-container",
          "phone",
          "20px",
        ),
      },
      { key },
    );

    expect(history.size).toBe(1);
    expect(history.undo()?.layout[0]?.byDevice.phone).toBe("4");
  });

  it("puts a deleted use back in its old slot", () => {
    /* A custom use: a system use cannot be deleted. */
    const history = createScaleHistory(snapshot());
    const devices = defaultPreviewDevices(1.25);
    const system = history.present.layout.map((token) => token.id);
    history.commit({
      layout: addLayoutToken(
        history.present.layout,
        "spacing",
        devices,
        "Hero gap",
      ),
    });
    history.commit({
      layout: addLayoutToken(
        history.present.layout,
        "spacing",
        devices,
        "Card gap",
      ),
    });
    const before = history.present.layout.map((token) => token.id);
    expect(before).toEqual([...system, "hero-gap", "card-gap"]);

    history.commit({
      layout: removeLayoutToken(history.present.layout, "hero-gap"),
    });
    expect(history.present.layout.map((token) => token.id)).toEqual([
      ...system,
      "card-gap",
    ]);
    expect(history.undo()?.layout.map((token) => token.id)).toEqual(before);
  });

  it("does not delete a use the system relies on", () => {
    const history = createScaleHistory(snapshot());
    const before = history.present.layout.map((token) => token.id);
    expect(
      removeLayoutToken(history.present.layout, "gap-section").map(
        (token) => token.id,
      ),
    ).toEqual(before);
  });
});
