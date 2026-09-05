import { describe, expect, it } from "vitest";
import { generatePalette } from "./palette";
import {
  formatPaletteCssExport,
  formatPaletteDesignTokens,
  formatPaletteTailwindExport,
  type PaletteProjectData,
} from "./export";

const project: PaletteProjectData = {
  tracks: [
    {
      id: "primary",
      name: "primary",
      seedHex: "#7646ab",
      adjustments: {
        anchors: { 200: "#d8c65a" },
        manualOverrides: { 300: "#123456" },
      },
    },
  ],
  lightnessPattern: "custom",
  lightnessValues: [90, 82, 74, 66, 58, 50, 42, 34, 26, 18],
};

const palette = generatePalette(project.tracks[0]!, project.lightnessValues);

describe("palette developer exports", () => {
  it("formats CSS and Tailwind CSS using the requested colour format", () => {
    expect(formatPaletteCssExport([palette], "hex")).toContain(
      "--color-primary-50: #",
    );
    expect(formatPaletteTailwindExport([palette], "oklch")).toContain(
      "@theme static {\n  --color-primary-50: oklch(",
    );
  });

  it("formats Design Tokens Community Group JSON", () => {
    const tokens = JSON.parse(formatPaletteDesignTokens([palette], "rgb"));
    expect(tokens.palette.$type).toBe("color");
    expect(tokens.palette.primary[50].$value).toMatch(/^rgb\(/);
  });
});
