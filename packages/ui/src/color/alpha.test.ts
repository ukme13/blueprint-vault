import { describe, expect, it } from "vitest";
import { clampAlpha, formatAlpha, parseAlpha } from "./alpha";

describe("semantic reference alpha input", () => {
  it("formats an internal alpha as a compact percentage", () => {
    expect(formatAlpha(0)).toBe("0%");
    expect(formatAlpha(0.125)).toBe("12.5%");
    expect(formatAlpha(1)).toBe("100%");
  });

  it("parses percentage input into the stored 0 to 1 range", () => {
    expect(parseAlpha("16%")).toBe(0.16);
    expect(parseAlpha(" 65.5 %  ")).toBe(0.655);
    expect(parseAlpha("0")).toBe(0);
    expect(parseAlpha("100")).toBe(1);
  });

  it("rejects values outside the field range instead of silently changing them", () => {
    expect(parseAlpha("-1%")).toBeNull();
    expect(parseAlpha("100.01%")).toBeNull();
    expect(parseAlpha("transparent")).toBeNull();
  });

  it("clamps raw values at the model boundary", () => {
    expect(clampAlpha(-0.2)).toBe(0);
    expect(clampAlpha(0.43)).toBe(0.43);
    expect(clampAlpha(1.2)).toBe(1);
    expect(clampAlpha(Number.NaN)).toBe(1);
  });
});
