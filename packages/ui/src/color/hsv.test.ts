import { describe, expect, it } from "vitest";
import { hexToHsv, hsvToHex, hsvToRgb, rgbToHsv } from "./hsv";

describe("RGB and HSV conversion", () => {
  it.each([
    { rgb: [1, 0, 0] as const, hue: 0 },
    { rgb: [0, 1, 0] as const, hue: 120 },
    { rgb: [0, 0, 1] as const, hue: 240 },
  ])("converts a primary RGB colour to hue $hue", ({ rgb, hue }) => {
    expect(rgbToHsv(rgb[0], rgb[1], rgb[2])).toEqual({
      hue,
      saturation: 1,
      value: 1,
    });
  });

  it("handles colours without saturation", () => {
    expect(rgbToHsv(1, 1, 1)).toEqual({
      hue: 0,
      saturation: 0,
      value: 1,
    });
    expect(rgbToHsv(0, 0, 0)).toEqual({
      hue: 0,
      saturation: 0,
      value: 0,
    });
  });

  it("normalizes hue and clamps saturation and value", () => {
    expect(hsvToRgb({ hue: 420, saturation: 2, value: 2 })).toEqual([1, 1, 0]);
    expect(hsvToHex({ hue: -120, saturation: 1, value: 1 })).toBe("#0000ff");
  });

  it.each(["#000000", "#ffffff", "#7646ab", "#a9ab46", "#008080"])(
    "round-trips %s through HSV",
    (hex) => {
      expect(hsvToHex(hexToHsv(hex))).toBe(hex);
    },
  );

  it("rejects non-finite channels", () => {
    expect(() => rgbToHsv(Number.NaN, 0, 0)).toThrow(
      "Red must be a finite number",
    );
    expect(() =>
      hsvToHex({ hue: 0, saturation: Number.POSITIVE_INFINITY, value: 1 }),
    ).toThrow("Saturation must be a finite number");
  });
});
