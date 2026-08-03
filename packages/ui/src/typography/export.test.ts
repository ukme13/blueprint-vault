import { describe, expect, it } from "vitest";
import {
  formatTypeScaleCssExport,
  formatTypeScaleTailwindExport,
} from "./export";
import { generateTypeScale } from "./scale";

const scale = generateTypeScale({
  fontFamily: "Inter, sans-serif",
  baseFontSizePx: 16,
  ratio: 1.25,
  stepCount: 5,
});

describe("formatTypeScaleCssExport", () => {
  it("emits a :root block with the font family, step, and role tokens", () => {
    const output = formatTypeScaleCssExport(scale);

    expect(output.startsWith(":root {")).toBe(true);
    expect(output).toContain("--font-family-base: Inter, sans-serif;");
    expect(output).toContain(`--font-size-${scale.steps[0]!.step}:`);
    scale.roles.forEach((role) => {
      expect(output).toContain(`--font-${role.role}-size:`);
      expect(output).toContain(
        `--font-${role.role}-weight: ${role.fontWeight};`,
      );
      expect(output).toContain(
        `--font-${role.role}-line-height: ${role.lineHeight};`,
      );
      expect(output).toContain(`--font-${role.role}-letter-spacing:`);
    });
    expect(output.trim().endsWith("}")).toBe(true);
  });
});

describe("formatTypeScaleTailwindExport", () => {
  it("emits an @theme block with the same tokens", () => {
    const output = formatTypeScaleTailwindExport(scale);

    expect(output.startsWith("@theme {")).toBe(true);
    expect(output).toContain("--font-family-base: Inter, sans-serif;");
    expect(output).toContain(`--font-size-${scale.steps[0]!.step}:`);
  });
});
