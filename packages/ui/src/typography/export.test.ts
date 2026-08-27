import { describe, expect, it } from "vitest";
import {
  convertLength,
  formatLength,
  formatTypeScaleCssExport,
  formatTypeScaleTailwindExport,
} from "./export";
import { ROOT_FONT_SIZE_PX, TYPE_SCALE_UNITS } from "./types";
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

describe("convertLength", () => {
  it("divides by the browser root size for rem, not the scale base", () => {
    expect(convertLength(16, "rem")).toBe(1);
    expect(convertLength(32, "rem")).toBe(2);
    // An 18px base reads as 1.125rem, because rem is relative to the root.
    expect(convertLength(18, "rem")).toBe(1.125);
  });

  it("uses 72pt per inch against 96px per inch", () => {
    expect(convertLength(16, "pt")).toBe(12);
    expect(convertLength(96, "pt")).toBe(72);
  });

  it("leaves px untouched", () => {
    expect(convertLength(23.4, "px")).toBe(23.4);
  });

  it("round-trips back to the stored px value", () => {
    TYPE_SCALE_UNITS.forEach((unit) => {
      const converted = convertLength(20, unit);
      const back =
        unit === "rem"
          ? converted * ROOT_FONT_SIZE_PX
          : unit === "pt"
            ? converted / 0.75
            : converted;
      expect(back).toBeCloseTo(20, 10);
    });
  });
});

describe("formatLength", () => {
  it("appends the unit and trims trailing zeros", () => {
    expect(formatLength(16, "rem")).toBe("1rem");
    expect(formatLength(16, "px")).toBe("16px");
    expect(formatLength(16, "pt")).toBe("12pt");
  });
});

describe("export units", () => {
  it("defaults to rem", () => {
    expect(formatTypeScaleCssExport(scale)).toContain(
      "--font-body-size: 1rem;",
    );
  });

  it("emits the requested unit for sizes and letter-spacing", () => {
    TYPE_SCALE_UNITS.forEach((unit) => {
      const output = formatTypeScaleCssExport(scale, unit);
      expect(output).toContain(`--font-body-size: ${formatLength(16, unit)};`);
      scale.roles.forEach((role) => {
        expect(output).toContain(
          `--font-${role.role}-letter-spacing: ${formatLength(role.letterSpacingPx, unit)};`,
        );
      });
    });
  });

  it("never puts a unit on line-height", () => {
    TYPE_SCALE_UNITS.forEach((unit) => {
      const output = formatTypeScaleCssExport(scale, unit);
      scale.roles.forEach((role) => {
        expect(output).toContain(
          `--font-${role.role}-line-height: ${role.lineHeight};`,
        );
      });
      expect(output).not.toMatch(/line-height: [\d.]+(rem|px|pt)/);
    });
  });

  it("applies the unit to the Tailwind export too", () => {
    expect(formatTypeScaleTailwindExport(scale, "pt")).toContain(
      "--font-body-size: 12pt;",
    );
  });

  it("does not change the stored scale when the unit changes", () => {
    const before = JSON.stringify(scale);
    TYPE_SCALE_UNITS.forEach((unit) => formatTypeScaleCssExport(scale, unit));
    expect(JSON.stringify(scale)).toBe(before);
  });
});
