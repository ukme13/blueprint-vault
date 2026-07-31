import { describe, expect, it } from "vitest";
import {
  formatPaletteCss,
  generateLightnessArray,
  generatePalette,
  generatePaletteFromPreset,
  generateStableWeights,
  normalizeTrackName,
} from "./palette";
import { BLUEPRINT_20_PRESET } from "./presets";

describe("stable shade weights", () => {
  it("keeps the existing 15-shade token sequence", () => {
    expect(generateStableWeights(15)).toEqual([
      50, 125, 175, 250, 300, 375, 425, 500, 575, 625, 700, 750, 825, 875, 950,
    ]);
  });

  it("creates unique 25-interval weights with fixed boundaries", () => {
    const weights = generateStableWeights(21);

    expect(weights[0]).toBe(50);
    expect(weights.at(-1)).toBe(950);
    expect(new Set(weights).size).toBe(weights.length);
    expect(weights.every((weight) => weight % 25 === 0)).toBe(true);
  });

  it("supports a single shade and rejects unsupported counts", () => {
    expect(generateStableWeights(1)).toEqual([50]);
    expect(() => generateStableWeights(0)).toThrow("Shade count");
    expect(() => generateStableWeights(38)).toThrow("Shade count");
    expect(() => generateStableWeights(2.5)).toThrow("Shade count");
  });
});

describe("lightness distribution", () => {
  it("generates the current linear distribution", () => {
    expect(generateLightnessArray(5, 90, 10, "linear")).toEqual([
      90, 70, 50, 30, 10,
    ]);
  });

  it("preserves the boundaries and midpoint for ease-in-out", () => {
    const lightness = generateLightnessArray(5, 90, 10, "ease-in-out");

    expect(lightness[0]).toBe(90);
    expect(lightness[2]).toBeCloseTo(50);
    expect(lightness.at(-1)).toBe(10);
  });

  it("uses linear values as the initial custom distribution", () => {
    expect(generateLightnessArray(3, 100, 0, "custom")).toEqual([100, 50, 0]);
  });

  it("rejects invalid lightness settings", () => {
    expect(() => generateLightnessArray(5, 101, 10, "linear")).toThrow(
      "Maximum lightness",
    );
    expect(() => generateLightnessArray(5, 10, 20, "linear")).toThrow(
      "greater than or equal",
    );
  });
});

describe("palette generation", () => {
  it("generates the Blueprint 20 preset with stable token names", () => {
    const palette = generatePaletteFromPreset(
      { id: "primary", name: "primary", seedHex: "#7646ab" },
      BLUEPRINT_20_PRESET,
    );

    expect(palette.shades).toHaveLength(20);
    expect(palette.shades.map((shade) => shade.weight)).toEqual(
      BLUEPRINT_20_PRESET.weights,
    );
    expect(palette.shades[0]!.weight).toBe(25);
    expect(palette.shades[0]!.L).toBeCloseTo(0.975);
    expect(palette.shades.at(-1)!.weight).toBe(950);
    expect(palette.shades.at(-1)!.L).toBeCloseTo(0.05);
  });

  it("rejects invalid preset weights", () => {
    const track = { id: "primary", name: "primary", seedHex: "#7646ab" };

    expect(() => generatePalette(track, [90, 10], [25])).toThrow("same length");
    expect(() => generatePalette(track, [90, 10], [25, 25])).toThrow(
      "unique 25-interval",
    );
  });

  it("keeps the source colour as one auto-docked anchor", () => {
    const lightness = generateLightnessArray(15, 96, 6, "linear");
    const palette = generatePalette(
      { id: "primary", name: "primary", seedHex: "#7646ab" },
      lightness,
    );
    const anchors = palette.shades.filter((shade) => shade.isAnchor);

    expect(palette.shades).toHaveLength(15);
    expect(anchors).toHaveLength(1);
    expect(anchors[0]!.hex).toBe("#7646ab");
    expect(palette.shades[0]!.C).toBeCloseTo(0.01);
    expect(palette.shades.at(-1)!.C).toBeCloseTo(0.025);
    expect(palette.shades.every((shade) => shade.H === anchors[0]!.H)).toBe(
      true,
    );
  });

  it("normalizes semantic danger colours to Astryx error", () => {
    expect(normalizeTrackName(" Danger ")).toBe("error");

    const palette = generatePalette(
      { id: "danger", name: "Danger", seedHex: "#B02B1B" },
      [90, 50, 10],
    );

    expect(palette.name).toBe("error");
    expect(palette.seedHex).toBe("#b02b1b");
  });

  it("formats reusable CSS custom properties", () => {
    const palette = generatePalette(
      { id: "info", name: "info", seedHex: "#3498db" },
      [90, 50, 10],
    );
    const css = formatPaletteCss([palette]);

    expect(css).toContain("/* Palette: INFO */");
    expect(css).toContain("--color-info-50: oklch(");
    expect(css).toContain("--color-info-950: oklch(");
  });
});
