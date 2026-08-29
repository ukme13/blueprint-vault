import { describe, expect, it } from "vitest";
import {
  findShade,
  generatePalettes,
  clampLightnessValue,
  formatPaletteCss,
  generateLightnessArray,
  generatePalette,
  generatePaletteFromPreset,
  generateStableWeights,
  isValidLightnessSequence,
  normalizeTrackName,
  resizeLightnessArray,
} from "./palette";
import { BLUEPRINT_20_PRESET } from "./presets";
import { oklchToHex } from "./conversion";

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

  it("validates strictly descending custom lightness values", () => {
    expect(isValidLightnessSequence([97.5, 95, 90], 3)).toBe(true);
    expect(isValidLightnessSequence([97.5, 95, 95], 3)).toBe(false);
    expect(isValidLightnessSequence([97.5, 95], 3)).toBe(false);
    expect(isValidLightnessSequence([101, 95, 90], 3)).toBe(false);
  });

  it("prevents an edited lightness value from crossing its neighbours", () => {
    const values = [90, 70, 50, 30, 10];

    expect(clampLightnessValue(values, 2, 80)).toBe(69.5);
    expect(clampLightnessValue(values, 2, 20)).toBe(30.5);
    expect(clampLightnessValue(values, 0, 101)).toBe(100);
    expect(clampLightnessValue(values, 4, -1)).toBe(0);
  });

  it("resizes custom lightness values without changing their boundaries", () => {
    const original = [90, 50, 10];

    expect(resizeLightnessArray([90, 50, 10], 5)).toEqual([90, 70, 50, 30, 10]);
    expect(resizeLightnessArray([90, 70, 50, 30, 10], 3)).toEqual([90, 50, 10]);
    expect(resizeLightnessArray(original, 3)).not.toBe(original);
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
    expect(anchors[0]!.anchorType).toBe("source");
    expect(palette.adjustments).toEqual({
      anchors: {},
      manualOverrides: {},
    });
  });

  it("preserves custom anchors and smooths through the full row", () => {
    const track = { id: "primary", name: "primary", seedHex: "#7646ab" };
    const base = generatePaletteFromPreset(track, BLUEPRINT_20_PRESET);
    const anchored = generatePaletteFromPreset(
      {
        ...track,
        adjustments: {
          anchors: { 200: "#d8c65a" },
          manualOverrides: {},
        },
      },
      BLUEPRINT_20_PRESET,
    );
    const customAnchor = anchored.shades.find((shade) => shade.weight === 200)!;
    const sourceAnchor = anchored.shades.find(
      (shade) => shade.anchorType === "source",
    )!;
    const shadeBetween = anchored.shades.find((shade) => shade.weight === 350)!;
    const baseBefore = base.shades.find((shade) => shade.weight === 150)!;
    const anchoredBefore = anchored.shades.find(
      (shade) => shade.weight === 150,
    )!;

    expect(customAnchor.hex).toBe("#d8c65a");
    expect(customAnchor.anchorType).toBe("custom");
    expect(sourceAnchor.hex).toBe("#7646ab");
    expect(shadeBetween.H).not.toBe(base.shades[7]!.H);
    expect(anchoredBefore.hex).not.toBe(baseBefore.hex);
    expect(anchored.shades[0]!.hex).toBe(base.shades[0]!.hex);
    expect(anchored.shades.at(-1)!.hex).toBe(base.shades.at(-1)!.hex);
  });

  it("interpolates hue through the shortest path around the hue circle", () => {
    const seedHex = oklchToHex(0.5, 0.1, 10);
    const anchorHex = oklchToHex(0.3, 0.1, 350);
    const palette = generatePaletteFromPreset(
      {
        id: "wrap",
        name: "wrap",
        seedHex,
        adjustments: {
          anchors: { 700: anchorHex },
          manualOverrides: {},
        },
      },
      BLUEPRINT_20_PRESET,
    );
    const midpoint = palette.shades.find((shade) => shade.weight === 600)!;

    expect(Math.min(midpoint.H, 360 - midpoint.H)).toBeLessThan(3);
  });

  it("applies manual overrides after anchor smoothing", () => {
    const palette = generatePaletteFromPreset(
      {
        id: "primary",
        name: "primary",
        seedHex: "#7646ab",
        adjustments: {
          anchors: { 200: "#d8c65a" },
          manualOverrides: { 350: "#123456" },
        },
      },
      BLUEPRINT_20_PRESET,
    );
    const overridden = palette.shades.find((shade) => shade.weight === 350)!;

    expect(overridden.hex).toBe("#123456");
    expect(overridden.isOverridden).toBe(true);
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

describe("generatePalettes and findShade", () => {
  const project = {
    tracks: [
      { id: "primary", name: "primary", seedHex: "#7646ab" },
      { id: "neutral", name: "neutral", seedHex: "#737373" },
    ],
    lightnessValues: [97.5, 90, 80, 70, 60, 50, 40, 30, 20, 5],
  };

  it("generates every track of a project", () => {
    const palettes = generatePalettes(project);
    expect(palettes.map((track) => track.id)).toEqual(["primary", "neutral"]);
    expect(palettes[0]!.shades).toHaveLength(10);
  });

  it("has nothing to generate without a lightness ramp", () => {
    expect(generatePalettes({ ...project, lightnessValues: [] })).toEqual([]);
  });

  it("finds a shade by track and weight", () => {
    const palettes = generatePalettes(project);
    const weight = palettes[0]!.shades[3]!.weight;
    expect(findShade(palettes, "primary", weight)?.hex).toBe(
      palettes[0]!.shades[3]!.hex,
    );
  });

  it("returns null for a track or weight the palette no longer has", () => {
    const palettes = generatePalettes(project);
    expect(findShade(palettes, "gone", 500)).toBeNull();
    expect(findShade(palettes, "primary", 12345)).toBeNull();
  });
});
