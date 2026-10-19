import { describe, expect, it } from "vitest";
import {
  COLOUR_FORMAT_LABELS,
  COLOUR_FORMATS,
  formatColour,
  isColourFormat,
  isWholeColourDraft,
  parseColour,
} from "./format";

describe("colour formats", () => {
  it("formats one colour as HEX, RGB, HSL and OKLCH", () => {
    expect(formatColour("#6b57e1", "hex")).toBe("#6B57E1");
    expect(formatColour("#6b57e1", "rgb")).toBe("rgb(107 87 225)");
    expect(formatColour("#6b57e1", "hsl")).toBe("hsl(248.7 69.7% 61.2%)");
    expect(formatColour("#6b57e1", "oklch")).toBe("oklch(55.4% 0.201 284.3)");
  });

  it("parses editable values back to HEX", () => {
    expect(parseColour("#6B57E1", "hex")).toBe("#6b57e1");
    expect(parseColour("rgb(107, 87, 225)", "rgb")).toBe("#6b57e1");
    expect(parseColour("hsl(248.7 69.7% 61.2%)", "hsl")).toBe("#6b57e1");
    expect(parseColour("oklch(55% 0.201 284)", "oklch")).toMatch(
      /^#[0-9a-f]{6}$/,
    );
  });

  it("applies a HEX as typed only once it has six digits", () => {
    expect(isWholeColourDraft("#111", "hex")).toBe(false);
    expect(isWholeColourDraft("111", "hex")).toBe(false);
    expect(isWholeColourDraft("#11100", "hex")).toBe(false);
    expect(isWholeColourDraft("#111000", "hex")).toBe(true);
    expect(isWholeColourDraft("111000", "hex")).toBe(true);
    expect(isWholeColourDraft(" #D8C65A ", "hex")).toBe(true);
    expect(isWholeColourDraft("#11100g", "hex")).toBe(false);
  });

  it("leaves the other formats to parse or not", () => {
    expect(isWholeColourDraft("rgb(1 2 3)", "rgb")).toBe(true);
    expect(isWholeColourDraft("oklch(10% 0 0", "oklch")).toBe(true);
  });

  it("rejects invalid values and recognises supported formats", () => {
    expect(() => parseColour("rgb(300 0 0)", "rgb")).toThrow(
      "between 0 and 255",
    );
    expect(() => parseColour("no colour", "oklch")).toThrow("Invalid OKLCH");
    expect(isColourFormat("oklch")).toBe(true);
    expect(isColourFormat("hsl")).toBe(true);
    expect(isColourFormat("cmyk")).toBe(false);
  });

  describe("HSL", () => {
    it("is in the list of formats, labelled HSL", () => {
      expect(COLOUR_FORMATS).toContain("hsl");
      expect(COLOUR_FORMAT_LABELS.hsl).toBe("HSL");
    });

    it("writes whole channels without a trailing zero, and the grey as zero hue", () => {
      expect(formatColour("#0080ff", "hsl")).toBe("hsl(209.9 100% 50%)");
      expect(formatColour("#ff0000", "hsl")).toBe("hsl(0 100% 50%)");
      expect(formatColour("#808080", "hsl")).toBe("hsl(0 0% 50.2%)");
      expect(formatColour("#000", "hsl")).toBe("hsl(0 0% 0%)");
    });

    it("parses the CSS spellings: spaces, commas, a degree unit", () => {
      expect(parseColour("hsl(210 100% 50%)", "hsl")).toBe("#0080ff");
      expect(parseColour("hsl(210, 100%, 50%)", "hsl")).toBe("#0080ff");
      expect(parseColour("hsl(210deg 100% 50%)", "hsl")).toBe("#0080ff");
      expect(parseColour("210 100 50", "hsl")).toBe("#0080ff");
    });

    it("rejects what is not a colour, or is out of range", () => {
      expect(() => parseColour("hsl(210 100%)", "hsl")).toThrow("Invalid HSL");
      expect(() => parseColour("no colour", "hsl")).toThrow("Invalid HSL");
      expect(() => parseColour("hsl(361 50% 50%)", "hsl")).toThrow(RangeError);
      expect(() => parseColour("hsl(10 101% 50%)", "hsl")).toThrow(RangeError);
      expect(() => parseColour("hsl(10 50% -1%)", "hsl")).toThrow(RangeError);
    });

    it("comes back close to the colour it was written from", () => {
      for (const hex of ["#6b57e1", "#ff5c40", "#112d4a", "#41d762"]) {
        const text = formatColour(hex, "hsl");
        const back = parseColour(text, "hsl");
        const channels = (value: string) =>
          [1, 3, 5].map((at) => parseInt(value.slice(at, at + 2), 16));
        channels(hex).forEach((channel, index) => {
          expect(
            Math.abs(channel - channels(back)[index]!),
          ).toBeLessThanOrEqual(1);
        });
      }
    });
  });
});
