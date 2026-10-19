import { describe, expect, it } from "vitest";
import {
  hexToHsl,
  hexToRgb,
  hslToHex,
  hslToRgb,
  isOklchInSrgb,
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

  it("identifies OKLCH colours outside sRGB", () => {
    expect(isOklchInSrgb(0.55, 0.15, 284)).toBe(true);
    expect(isOklchInSrgb(0.7, 0.5, 40)).toBe(false);
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

describe("HSL conversion", () => {
  it("reads the primaries and secondaries by their hue", () => {
    expect(hexToHsl("#ff0000")).toEqual([0, 1, 0.5]);
    expect(hexToHsl("#00ff00")).toEqual([120, 1, 0.5]);
    expect(hexToHsl("#0000ff")).toEqual([240, 1, 0.5]);
    expect(hexToHsl("#ffff00")[0]).toBe(60);
    expect(hexToHsl("#00ffff")[0]).toBe(180);
    expect(hexToHsl("#ff00ff")[0]).toBe(300);
  });

  it("gives a grey no hue and no saturation", () => {
    expect(hexToHsl("#000000")).toEqual([0, 0, 0]);
    expect(hexToHsl("#ffffff")).toEqual([0, 0, 1]);
    const [hue, saturation, lightness] = hexToHsl("#808080");
    expect(hue).toBe(0);
    expect(saturation).toBe(0);
    expect(lightness).toBeCloseTo(128 / 255, 10);
  });

  it("reads a mid colour as CSS does", () => {
    const [hue, saturation, lightness] = hexToHsl("#6b57e1");
    expect(hue).toBeCloseTo(248.7, 1);
    expect(saturation).toBeCloseTo(0.697, 3);
    expect(lightness).toBeCloseTo(0.612, 3);
  });

  it("writes HSL back to HEX", () => {
    expect(hslToHex(0, 1, 0.5)).toBe("#ff0000");
    expect(hslToHex(210, 1, 0.5)).toBe("#0080ff");
    expect(hslToHex(120, 0, 0.5)).toBe("#808080");
    expect(hslToHex(0, 0, 1)).toBe("#ffffff");
    expect(hslToHex(0, 0.5, 0)).toBe("#000000");
  });

  it("wraps the hue and holds saturation and lightness in range", () => {
    expect(hslToHex(360, 1, 0.5)).toBe(hslToHex(0, 1, 0.5));
    expect(hslToHex(-120, 1, 0.5)).toBe(hslToHex(240, 1, 0.5));
    expect(hslToRgb(90, 2, 0.5)).toEqual(hslToRgb(90, 1, 0.5));
    expect(hslToHex(90, 1, 2)).toBe("#ffffff");
  });

  it("round-trips every HEX through HSL", () => {
    for (let red = 0; red < 256; red += 17) {
      for (let green = 0; green < 256; green += 15) {
        for (let blue = 0; blue < 256; blue += 13) {
          const hex = rgbToHex(red / 255, green / 255, blue / 255);
          expect(hslToHex(...hexToHsl(hex))).toBe(hex);
        }
      }
    }
  });

  it("refuses a channel that is not a number", () => {
    expect(() => hslToHex(Number.NaN, 1, 0.5)).toThrow(TypeError);
  });
});
