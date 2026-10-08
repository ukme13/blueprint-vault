import { describe, expect, it } from "vitest";
import { swatchContrast } from "./contrast-reading";

describe("swatchContrast", () => {
  it("reads a WCAG 2 ratio to one place", () => {
    expect(swatchContrast("wcag2", "#000000", "#ffffff")).toEqual({
      label: "21.0",
      description: "contrast 21.0 to 1",
    });
  });

  it("reads WCAG 3 as the size of the Lc, with the sign left out", () => {
    expect(swatchContrast("wcag3", "#000000", "#ffffff")).toEqual({
      label: "106",
      description: "APCA contrast Lc 106",
    });
    /* Light on dark is negative in APCA; the swatch shows how much, not which way. */
    expect(swatchContrast("wcag3", "#ffffff", "#000000").label).toBe("108");
  });

  it("is the same pair in both, so the two figures can be compared", () => {
    const wcag2 = swatchContrast("wcag2", "#777777", "#ffffff").label;
    const wcag3 = swatchContrast("wcag3", "#777777", "#ffffff").label;
    expect(wcag2).toBe("4.5");
    expect(wcag3).toBe("71");
  });
});
