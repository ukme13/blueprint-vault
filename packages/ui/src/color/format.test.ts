import { describe, expect, it } from "vitest";
import { formatColour, isColourFormat, parseColour } from "./format";

describe("colour formats", () => {
  it("formats one colour as HEX, RGB, and OKLCH", () => {
    expect(formatColour("#6b57e1", "hex")).toBe("#6B57E1");
    expect(formatColour("#6b57e1", "rgb")).toBe("rgb(107 87 225)");
    expect(formatColour("#6b57e1", "oklch")).toBe("oklch(55.4% 0.201 284.3)");
  });

  it("parses editable values back to HEX", () => {
    expect(parseColour("#6B57E1", "hex")).toBe("#6b57e1");
    expect(parseColour("rgb(107, 87, 225)", "rgb")).toBe("#6b57e1");
    expect(parseColour("oklch(55% 0.201 284)", "oklch")).toMatch(
      /^#[0-9a-f]{6}$/,
    );
  });

  it("rejects invalid values and recognises supported formats", () => {
    expect(() => parseColour("rgb(300 0 0)", "rgb")).toThrow(
      "between 0 and 255",
    );
    expect(() => parseColour("no colour", "oklch")).toThrow("Invalid OKLCH");
    expect(isColourFormat("oklch")).toBe(true);
    expect(isColourFormat("hsl")).toBe(false);
  });
});
