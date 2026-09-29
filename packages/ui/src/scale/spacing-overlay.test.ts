import { describe, expect, it } from "vitest";
import { defaultSpacingScale } from "./spacing";
import { gapBands, paddingBands, spacingTokenForPx } from "./spacing-overlay";

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
