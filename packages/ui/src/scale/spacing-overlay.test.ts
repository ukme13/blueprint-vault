import { describe, expect, it } from "vitest";
import { defaultSpacingScale } from "./spacing";
import {
  gapBands,
  paddingBands,
  activeSpacingUse,
  spacingTokenForPx,
  spacingUses,
} from "./spacing-overlay";
import type { LayoutToken } from "./layout-tokens";

describe("paddingBands", () => {
  it("gives one band per padded side, inside the box", () => {
    const bands = paddingBands(
      { x: 10, y: 20, width: 200, height: 100 },
      { top: 24, right: 16, bottom: 0, left: 16 },
    );
    expect(bands).toEqual([
      { x: 10, y: 20, width: 200, height: 24, px: 24, axis: "block" },
      { x: 10, y: 20, width: 16, height: 100, px: 16, axis: "inline" },
      { x: 194, y: 20, width: 16, height: 100, px: 16, axis: "inline" },
    ]);
  });

  it("gives none for a box with no padding", () => {
    expect(
      paddingBands(
        { x: 0, y: 0, width: 10, height: 10 },
        { top: 0, right: 0, bottom: 0, left: 0 },
      ),
    ).toEqual([]);
  });
});

describe("gapBands", () => {
  const content = { x: 0, y: 0, width: 300, height: 200 };

  it("draws a row gap across the content box between stacked children", () => {
    const bands = gapBands(
      content,
      [
        { x: 0, y: 0, width: 300, height: 40 },
        { x: 0, y: 56, width: 300, height: 40 },
      ],
      16,
      0,
    );
    expect(bands).toEqual([
      { x: 0, y: 40, width: 300, height: 16, px: 16, axis: "block" },
    ]);
  });

  it("draws a column gap down between children side by side", () => {
    const bands = gapBands(
      content,
      [
        { x: 0, y: 0, width: 100, height: 50 },
        { x: 124, y: 0, width: 100, height: 80 },
      ],
      0,
      24,
    );
    expect(bands).toEqual([
      { x: 100, y: 0, width: 24, height: 80, px: 24, axis: "inline" },
    ]);
  });

  it("marks a wrapped row by its row gap", () => {
    const bands = gapBands(
      content,
      [
        { x: 0, y: 0, width: 140, height: 40 },
        { x: 156, y: 0, width: 140, height: 40 },
        { x: 0, y: 52, width: 140, height: 40 },
      ],
      12,
      16,
    );
    expect(bands.map((band) => [band.axis, band.px])).toEqual([
      ["inline", 16],
      ["block", 12],
    ]);
  });

  it("draws nothing for space that is not the declared gap", () => {
    /* Pushed apart by justify-content: 200px between, gap 8. */
    const bands = gapBands(
      content,
      [
        { x: 0, y: 0, width: 50, height: 20 },
        { x: 250, y: 0, width: 50, height: 20 },
      ],
      0,
      8,
    );
    expect(bands).toEqual([]);
  });
});

describe("spacingTokenForPx", () => {
  it("names the step a size lands on", () => {
    expect(spacingTokenForPx(defaultSpacingScale(), 24)?.name).toBe("6");
  });

  it("names none for a size between steps", () => {
    expect(spacingTokenForPx(defaultSpacingScale(), 30)).toBeNull();
  });
});

describe("spacingUses", () => {
  const use = (
    id: string,
    kind: LayoutToken["kind"],
    value: string,
  ): LayoutToken => ({
    id,
    name: id,
    description: "",
    kind,
    byDevice: { desktop: value },
  });

  it("lists the spacing uses with their size on the frame", () => {
    const uses = spacingUses(
      defaultSpacingScale(),
      [use("inset", "spacing", "6"), use("gap", "spacing", "20px")],
      "desktop",
    );
    expect(uses.map((each) => [each.id, each.value, each.px])).toEqual([
      ["inset", "6", 24],
      ["gap", "20px", 20],
    ]);
  });

  it("leaves out radius uses, even where they hold a value", () => {
    const uses = spacingUses(
      defaultSpacingScale(),
      [use("corner", "radius", "6"), use("inset", "spacing", "6")],
      "desktop",
    );
    expect(uses.map((each) => each.id)).toEqual(["inset"]);
  });

  it("leaves out a use with no value on the frame", () => {
    const uses = spacingUses(
      defaultSpacingScale(),
      [use("inset", "spacing", "6")],
      "phone",
    );
    expect(uses).toEqual([]);
  });

  it("leaves out a step the scale does not have", () => {
    expect(
      spacingUses(
        defaultSpacingScale(),
        [use("inset", "spacing", "999")],
        "desktop",
      ),
    ).toEqual([]);
  });
});

describe("activeSpacingUse", () => {
  const uses = [
    { id: "inset", name: "Inset", value: "6", px: 24 },
    { id: "gap", name: "Gap", value: "6", px: 24 },
    { id: "wide", name: "Wide", value: "8", px: 32 },
  ];

  it("marks the use being edited when nothing was chosen", () => {
    expect(activeSpacingUse(uses, "gap")).toBe("gap");
  });

  it("marks the use that was chosen while it still holds the step", () => {
    // `inset` was set from `gap`, and both sit on 6 now.
    expect(activeSpacingUse(uses, "inset", "gap")).toBe("gap");
  });

  it("returns to the use being edited once the chosen one no longer matches", () => {
    expect(activeSpacingUse(uses, "inset", "wide")).toBe("inset");
    expect(activeSpacingUse(uses, "inset", "gone")).toBe("inset");
  });

  it("marks nothing for a use the frame has no size for", () => {
    expect(activeSpacingUse(uses, "missing", "gap")).toBeUndefined();
  });
});
