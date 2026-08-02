import { describe, expect, it } from "vitest";
import type { ShadeItem } from "./types";
import { assessTrackTransitions } from "./transitions";

function shade(
  weight: number,
  L: number,
  C: number,
  H: number,
  options: Partial<ShadeItem> = {},
): ShadeItem {
  return {
    weight,
    L,
    C,
    H,
    hex: "#000000",
    isAnchor: false,
    isOverridden: false,
    anchorType: null,
    ...options,
  };
}

describe("track transition warnings", () => {
  it("returns no warnings for a smooth ordered track", () => {
    const warnings = assessTrackTransitions([
      shade(100, 0.9, 0.04, 250),
      shade(200, 0.7, 0.08, 250, {
        isAnchor: true,
        anchorType: "source",
      }),
      shade(300, 0.5, 0.06, 250),
    ]);

    expect(warnings).toEqual([]);
  });

  it("finds a broken light-to-dark order", () => {
    const warnings = assessTrackTransitions([
      shade(100, 0.8, 0.08, 40),
      shade(200, 0.82, 0.08, 40),
    ]);

    expect(warnings).toContainEqual({
      code: "lightness-order",
      message: "Shade 200 is not darker than 100.",
      weights: [100, 200],
    });
  });

  it("finds a large hue change between colourful anchors", () => {
    const warnings = assessTrackTransitions([
      shade(200, 0.8, 0.12, 20, {
        isAnchor: true,
        anchorType: "custom",
      }),
      shade(600, 0.4, 0.15, 130, {
        isAnchor: true,
        anchorType: "source",
      }),
    ]);

    expect(warnings.map((warning) => warning.code)).toContain("hue-jump");
  });

  it("ignores hue changes when an anchor is nearly neutral", () => {
    const warnings = assessTrackTransitions([
      shade(200, 0.8, 0.01, 20, {
        isAnchor: true,
        anchorType: "custom",
      }),
      shade(600, 0.4, 0.15, 130, {
        isAnchor: true,
        anchorType: "source",
      }),
    ]);

    expect(warnings.map((warning) => warning.code)).not.toContain("hue-jump");
  });

  it("finds an uneven manual shade", () => {
    const warnings = assessTrackTransitions([
      shade(100, 0.9, 0.05, 250),
      shade(200, 0.55, 0.2, 20, { isOverridden: true }),
      shade(300, 0.7, 0.05, 250),
    ]);

    expect(warnings).toContainEqual({
      code: "manual-jump",
      message: "Manual shade 200 creates an uneven transition.",
      weights: [200],
    });
  });
});
