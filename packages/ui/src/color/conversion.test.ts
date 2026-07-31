import { describe, expect, it } from "vitest";
import {
  hexToRgb,
  normalizeHex,
  oklchToHex,
  rgbToHex,
  rgbToOklch,
} from "./conversion";

describe("HEX and RGB conversion", () => {
  it("normalizes three- and six-character HEX colours", () => {
    expect(normalizeHex("#AbC")).toBe("#aabbcc");
    expect(normalizeHex("7646AB")).toBe("#7646ab");
  });

  it("converts HEX channels to normalized RGB values", () => {
    expect(hexToRgb("#ff8000")).toEqual([1, 128 / 255, 0]);
  });

  it("converts normalized RGB values back to HEX", () => {
    expect(rgbToHex(1, 128 / 255, 0)).toBe("#ff8000");
  });

  it("rejects invalid HEX input", () => {
    expect(() => normalizeHex("#12")).toThrow("Invalid HEX colour");
    expect(() => hexToRgb("not-a-colour")).toThrow("Invalid HEX colour");
  });

  it("clamps RGB values to the sRGB range", () => {
    expect(rgbToHex(2, -1, 0.5)).toBe("#ff0080");
  });
});

describe("OKLCH conversion", () => {
  it("returns the expected OKLCH values for red", () => {
    const [lightness, chroma, hue] = rgbToOklch(1, 0, 0);

    expect(lightness).toBeCloseTo(0.627955, 5);
    expect(chroma).toBeCloseTo(0.257683, 5);
    expect(hue).toBeCloseTo(29.2339, 3);
  });

  it.each(["#000000", "#ffffff", "#7646ab", "#008080"])(
    "round-trips %s through OKLCH",
    (hex) => {
      const oklch = rgbToOklch(...hexToRgb(hex));
      expect(oklchToHex(...oklch)).toBe(hex);
    },
  );

  it("clips out-of-gamut OKLCH values to a valid HEX colour", () => {
    expect(oklchToHex(0.7, 0.5, 40)).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("rejects non-finite colour channels", () => {
    expect(() => rgbToOklch(Number.NaN, 0, 0)).toThrow(
      "Red must be a finite number",
    );
    expect(() => oklchToHex(0.5, Number.POSITIVE_INFINITY, 0)).toThrow(
      "Chroma must be a finite number",
    );
  });
});
