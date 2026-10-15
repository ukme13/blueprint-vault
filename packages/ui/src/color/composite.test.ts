import { describe, expect, it } from "vitest";
import { composite } from "./composite";
import { contrastRatio } from "./accessibility";

describe("compositing a translucent colour", () => {
  it("puts half a colour halfway between it and the surface", () => {
    /* The value that tells the three candidate spaces apart. Gamma-encoded
       sRGB — what a compositor actually does — gives #808080. Linear-light
       would give #bcbcbc, and interpolating in OKLab would give roughly
       #777777. Only the first describes a page a browser renders. */
    expect(composite({ hex: "#000000", alpha: 0.5 }, "#ffffff")).toBe(
      "#808080",
    );
    expect(composite({ hex: "#ffffff", alpha: 0.5 }, "#000000")).toBe(
      "#808080",
    );
  });

  it("is the surface at nothing and the colour at everything", () => {
    /* The two ends, which is where an off-by-one in the mix hides: a formula
       that reversed the operands still passes the midpoint. */
    expect(composite({ hex: "#ea580c", alpha: 0 }, "#fafafa")).toBe("#fafafa");
    expect(composite({ hex: "#ea580c", alpha: 1 }, "#fafafa")).toBe("#ea580c");
  });

  it("mixes each channel in proportion", () => {
    /* 20% of #ff0000 over #0000ff: red rises to a fifth, blue falls to four
       fifths, green stays at nothing. 0.2 * 255 = 51 = 0x33, and
       0.8 * 255 = 204 = 0xcc. */
    expect(composite({ hex: "#ff0000", alpha: 0.2 }, "#0000ff")).toBe(
      "#3300cc",
    );
  });

  it("matches what the compositor was measured doing", () => {
    /* Chromium 151, canvas in the default srgb colour space: white filled,
       then rgba(0,0,0,0.12) over it, reads back 224 on every channel. This
       rounds where the compositor truncates, so 0.5 lands one step apart and
       is checked above; 0.12 lands exactly. */
    expect(composite({ hex: "#000000", alpha: 0.12 }, "#ffffff")).toBe(
      "#e0e0e0",
    );
  });

  it("returns an opaque colour, so a ratio can be taken of it", () => {
    /* The reason the function exists. A hex with eight digits would be a
       colour WCAG has no opinion about. */
    const over = composite({ hex: "#000000", alpha: 0.5 }, "#ffffff");
    expect(over).toMatch(/^#[0-9a-f]{6}$/);
    expect(contrastRatio(over, "#ffffff")).toBeGreaterThan(1);
  });

  it("is a different colour on a different surface", () => {
    /* The claim the report rests on: the same token, two grounds, two
       colours — and therefore two verdicts. */
    const onWhite = composite({ hex: "#000000", alpha: 0.5 }, "#ffffff");
    const onCream = composite({ hex: "#000000", alpha: 0.5 }, "#f5efe0");

    expect(onWhite).not.toBe(onCream);
    expect(contrastRatio(onWhite, "#ffffff")).not.toBeCloseTo(
      contrastRatio(onCream, "#f5efe0"),
      2,
    );
  });

  it("treats an impossible alpha as the nearest possible one", () => {
    /* Stored data, not a caller's argument: a file can say 1.4 and a reader
       that threw would cost somebody their whole layer. The out-of-range
       value is reported where the reference is resolved; here it just has to
       produce a colour. */
    expect(composite({ hex: "#000000", alpha: 1.4 }, "#ffffff")).toBe(
      "#000000",
    );
    expect(composite({ hex: "#000000", alpha: -1 }, "#ffffff")).toBe("#ffffff");
    expect(composite({ hex: "#000000", alpha: Number.NaN }, "#ffffff")).toBe(
      "#000000",
    );
  });
});
