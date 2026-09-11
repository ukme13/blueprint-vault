import { describe, expect, it } from "vitest";
import {
  convertLength,
  formatLength,
  formatLetterSpacing,
  formatTypeScaleCssExport,
  formatTypeScaleTailwindExport,
} from "./export";
import { ROOT_FONT_SIZE_PX, TYPE_SCALE_UNITS, clampRemRootPx } from "./types";
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

    expect(output.startsWith("@theme static {")).toBe(true);
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

  it("divides by a configured rem root rather than always 16", () => {
    expect(convertLength(18, "rem", 18)).toBe(1);
    expect(convertLength(16, "rem", 18)).toBeCloseTo(16 / 18, 10);
  });

  it("falls back to 16 when the rem root is not a usable number", () => {
    expect(convertLength(16, "rem", 0)).toBe(1);
    expect(convertLength(16, "rem", Number.NaN)).toBe(1);
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
    expect(convertLength(20, "rem", 18) * 18).toBeCloseTo(20, 10);
  });
});

describe("formatLength", () => {
  it("appends the unit and trims trailing zeros", () => {
    expect(formatLength(16, "rem")).toBe("1rem");
    expect(formatLength(16, "px")).toBe("16px");
    expect(formatLength(16, "pt")).toBe("12pt");
  });

  it("divides rem by the configured root", () => {
    expect(formatLength(18, "rem", 18)).toBe("1rem");
    expect(formatLength(16, "rem", 18)).toBe("0.8889rem");
  });
});

describe("formatLetterSpacing", () => {
  it("divides stored px by the size it ships against", () => {
    expect(formatLetterSpacing(-0.5, 56)).toBe("-0.0089em");
    expect(formatLetterSpacing(0.2, 12)).toBe("0.0167em");
    expect(formatLetterSpacing(0, 16)).toBe("0em");
  });

  it("does not invent a value when the size is zero", () => {
    expect(formatLetterSpacing(-0.5, 0)).toBe("0em");
  });
});

describe("export units", () => {
  it("defaults to rem", () => {
    expect(formatTypeScaleCssExport(scale)).toContain(
      "--font-body-size: 1rem;",
    );
  });

  it("emits the requested unit for sizes and em for letter-spacing", () => {
    TYPE_SCALE_UNITS.forEach((unit) => {
      const output = formatTypeScaleCssExport(scale, unit);
      expect(output).toContain(`--font-body-size: ${formatLength(16, unit)};`);
      scale.roles.forEach((role) => {
        const step = scale.steps.find(
          (candidate) => candidate.step === role.step,
        )!;
        expect(output).toContain(
          `--font-${role.role}-letter-spacing: ${formatLetterSpacing(role.letterSpacingPx, step.fontSizePx)};`,
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

  it("comments on a non-default rem root and leaves 16 unspoken", () => {
    expect(formatTypeScaleCssExport(scale, "rem", 18)).toContain(
      "/* Lengths in rem assume html { font-size: 18px }. */",
    );
    expect(formatTypeScaleCssExport(scale, "rem", 18)).toContain(
      "--font-body-size: 0.8889rem;",
    );
    expect(formatTypeScaleCssExport(scale)).not.toContain("assume html");
    expect(formatTypeScaleCssExport(scale, "px", 18)).not.toContain(
      "assume html",
    );
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

describe("clampRemRootPx", () => {
  it("keeps a value in range, rounded to an integer", () => {
    expect(clampRemRootPx(18)).toBe(18);
    expect(clampRemRootPx(16.4)).toBe(16);
  });

  it("clamps to 10 and 24", () => {
    expect(clampRemRootPx(4)).toBe(10);
    expect(clampRemRootPx(40)).toBe(24);
  });

  it("falls back to 16 when the value is not a number", () => {
    expect(clampRemRootPx(Number.NaN)).toBe(ROOT_FONT_SIZE_PX);
    expect(clampRemRootPx(Number.POSITIVE_INFINITY)).toBe(ROOT_FONT_SIZE_PX);
  });
});
