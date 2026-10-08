import { describe, expect, it } from "vitest";
import { APCA_LC, apcaContrast, assessApca } from "./apca";

describe("apcaContrast", () => {
  it("matches the reference values for black and white", () => {
    /* APCA-W3 0.0.98G-4g: black on white is Lc 106.04, white on black -107.88. */
    expect(apcaContrast("#000000", "#ffffff")).toBeCloseTo(106.04, 1);
    expect(apcaContrast("#ffffff", "#000000")).toBeCloseTo(-107.88, 1);
  });

  it("is positive for dark text and negative for light text", () => {
    expect(apcaContrast("#333333", "#ffffff")).toBeGreaterThan(0);
    expect(apcaContrast("#ffffff", "#333333")).toBeLessThan(0);
  });

  it("is not the same either way round", () => {
    const forward = Math.abs(apcaContrast("#6b57e1", "#ffffff"));
    const reverse = Math.abs(apcaContrast("#ffffff", "#6b57e1"));
    expect(forward).not.toBeCloseTo(reverse, 0);
  });

  it("is zero for a colour on itself and for pairs too close to tell apart", () => {
    expect(apcaContrast("#808080", "#808080")).toBe(0);
    expect(apcaContrast("#808080", "#818181")).toBe(0);
  });

  it("reads a mid grey on white as the published figure", () => {
    /* #777 on white is about Lc 71.6 in the reference calculator. */
    expect(apcaContrast("#777777", "#ffffff")).toBeCloseTo(71.6, 0);
  });
});

describe("assessApca", () => {
  it("grades by the three tiers, on the size of the Lc", () => {
    expect(APCA_LC).toEqual({ bodyText: 75, largeText: 60, uiComponent: 45 });

    const strong = assessApca("#000000", "#ffffff");
    expect(strong).toMatchObject({
      bodyText: true,
      largeText: true,
      uiComponent: true,
    });

    /* Between 60 and 75: headlines and UI, not body copy. */
    const middling = assessApca("#808080", "#ffffff");
    expect(middling.magnitude).toBeGreaterThanOrEqual(60);
    expect(middling.magnitude).toBeLessThan(75);
    expect(middling).toMatchObject({
      bodyText: false,
      largeText: true,
      uiComponent: true,
    });

    /* Between 45 and 60: a UI component only. */
    const weak = assessApca("#989898", "#ffffff");
    expect(weak.magnitude).toBeGreaterThanOrEqual(45);
    expect(weak.magnitude).toBeLessThan(60);
    expect(weak).toMatchObject({
      bodyText: false,
      largeText: false,
      uiComponent: true,
    });

    const none = assessApca("#cccccc", "#ffffff");
    expect(none.uiComponent).toBe(false);
  });

  it("grades light text on dark by its size, not its sign", () => {
    const reversed = assessApca("#ffffff", "#000000");
    expect(reversed.lc).toBeLessThan(0);
    expect(reversed.bodyText).toBe(true);
  });
});
