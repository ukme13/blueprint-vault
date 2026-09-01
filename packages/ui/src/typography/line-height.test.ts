import { describe, expect, it } from "vitest";
import {
  computeLineHeight,
  formatLineHeightInput,
  LINE_HEIGHT_GRID_PX,
  MAX_LINE_HEIGHT_RATIO,
  parseLineHeightInput,
  readLineHeightConfig,
  snapLineHeightPx,
} from "./line-height";
import { TYPOGRAPHY_THRESHOLDS } from "./validation";

describe("auto mode", () => {
  it("snaps up to the 4px grid and derives the ratio from what it landed on", () => {
    /* 18 x 1.5 is 27, which is on no grid at all. This is the case the whole
       feature exists for: an even font size times a tidy ratio is only even
       when the size divides by four. */
    const auto = computeLineHeight(18, { mode: "auto" }, 1.5);

    expect(auto.computedLineHeightPx).toBe(28);
    expect(auto.computedLineHeightRatio).toBeCloseTo(28 / 18, 4);
  });

  it("leaves a value already on the grid alone", () => {
    const auto = computeLineHeight(16, { mode: "auto" }, 1.5);

    expect(auto.computedLineHeightPx).toBe(24);
    expect(auto.computedLineHeightRatio).toBe(1.5);
  });

  it("uses the ratio it is given, so a group's default reaches it", () => {
    /* Headings are 1.2 and body 1.5 in AUTO_LINE_HEIGHT_RATIOS. Passing the
       ratio in is what keeps this function ignorant of groups, which are
       user-editable. */
    expect(computeLineHeight(32, { mode: "auto" }, 1.2).computedLineHeightPx)
      .toBe(40);
    expect(computeLineHeight(32, { mode: "auto" }, 1.5).computedLineHeightPx)
      .toBe(48);
  });

  it("never snaps below the ratio it was asked for", () => {
    /* The guard that makes the snap safe for Thai. Rounding to nearest would
       take 14 x 1.4 = 19.6 down to 16, a ratio of 1.14 — under the 1.25 that
       validation fails outright, produced by the snap itself. */
    for (let fontSizePx = 11; fontSizePx <= 96; fontSizePx += 1) {
      for (const ratio of [1.1, 1.2, 1.25, 1.4, 1.5, 1.75, 2]) {
        const { computedLineHeightRatio } = computeLineHeight(
          fontSizePx,
          { mode: "auto" },
          ratio,
        );
        expect(
          computedLineHeightRatio,
          `${fontSizePx}px at ${ratio}`,
        ).toBeGreaterThanOrEqual(ratio);
      }
    }
  });

  it("keeps a Thai-safe ratio Thai-safe", () => {
    /* Stronger than the rule above, and the one that matters on screen: a
       role asking for the Thai minimum must still clear it afterwards. */
    const min = TYPOGRAPHY_THRESHOLDS.minLineHeightThai;
    for (let fontSizePx = 11; fontSizePx <= 96; fontSizePx += 1) {
      const { computedLineHeightRatio } = computeLineHeight(
        fontSizePx,
        { mode: "auto" },
        min,
      );
      expect(computedLineHeightRatio, `${fontSizePx}px`).toBeGreaterThanOrEqual(
        min,
      );
    }
  });

  it("always lands on the grid", () => {
    for (let fontSizePx = 11; fontSizePx <= 96; fontSizePx += 1) {
      const { computedLineHeightPx } = computeLineHeight(
        fontSizePx,
        { mode: "auto" },
        1.5,
      );
      expect(computedLineHeightPx % LINE_HEIGHT_GRID_PX).toBe(0);
    }
  });
});

describe("px mode", () => {
  it("keeps the pixel value and derives the ratio", () => {
    const pinned = computeLineHeight(18, { mode: "px", value: 24 });

    expect(pinned.computedLineHeightPx).toBe(24);
    expect(pinned.computedLineHeightRatio).toBeCloseTo(24 / 18, 4);
  });

  it("does not snap, because the number was chosen deliberately", () => {
    /* 27 is off the grid and stays there. `auto` is where the grid is
       enforced; pinning a pixel value is how someone opts out of it. */
    expect(
      computeLineHeight(18, { mode: "px", value: 27 }).computedLineHeightPx,
    ).toBe(27);
  });

  it("ignores the auto ratio", () => {
    expect(
      computeLineHeight(16, { mode: "px", value: 30 }, 1.1).computedLineHeightPx,
    ).toBe(30);
  });
});

describe("ratio mode", () => {
  it("keeps the ratio and derives the pixels", () => {
    const pinned = computeLineHeight(16, { mode: "ratio", value: 1.5 });

    expect(pinned.computedLineHeightRatio).toBe(1.5);
    expect(pinned.computedLineHeightPx).toBe(24);
  });

  it("does not round the pixels to whole ones", () => {
    /* Rounding here would make ratio -> px -> ratio lossy for a number the
       user set by hand. 1.45 is theirs to keep. */
    expect(
      computeLineHeight(16, { mode: "ratio", value: 1.45 })
        .computedLineHeightPx,
    ).toBe(23.2);
  });

  it("does not leak binary floating point into the editor", () => {
    /* 18 * 1.5 is 27.000000000000004 unrounded, and a field showing that has
       a bug as far as anyone reading it is concerned. */
    expect(
      computeLineHeight(18, { mode: "ratio", value: 1.5 }).computedLineHeightPx,
    ).toBe(27);
  });
});

describe("guards", () => {
  it("returns zeroes rather than dividing by a font size of zero", () => {
    expect(computeLineHeight(0, { mode: "auto" }, 1.5)).toEqual({
      computedLineHeightPx: 0,
      computedLineHeightRatio: 0,
    });
  });

  it("snaps nothing out of a size that is not a number", () => {
    expect(snapLineHeightPx(Number.NaN)).toBe(0);
    expect(snapLineHeightPx(-4)).toBe(0);
  });
});

describe("the input parser", () => {
  it("reads auto, in either of the two ways someone clears the field", () => {
    expect(parseLineHeightInput("auto")).toEqual({ mode: "auto" });
    expect(parseLineHeightInput("AUTO")).toEqual({ mode: "auto" });
    expect(parseLineHeightInput("")).toEqual({ mode: "auto" });
    expect(parseLineHeightInput("   ")).toEqual({ mode: "auto" });
  });

  it("reads an explicit px suffix", () => {
    expect(parseLineHeightInput("24px")).toEqual({ mode: "px", value: 24 });
    expect(parseLineHeightInput("24 px")).toEqual({ mode: "px", value: 24 });
    expect(parseLineHeightInput("24PX")).toEqual({ mode: "px", value: 24 });
  });

  it("lets a typed unit beat a forced one", () => {
    /* Somebody who typed "px" has said what they meant more clearly than any
       control has. */
    expect(parseLineHeightInput("24px", "ratio")).toEqual({
      mode: "px",
      value: 24,
    });
  });

  it("tells a bare ratio from a bare pixel height by its size", () => {
    /* The two ranges do not overlap in any real scale, so nobody has to find
       a unit control first to be understood. "24" as a ratio would be a 384px
       gap on body text — not a value anyone means. */
    expect(parseLineHeightInput("1.5")).toEqual({ mode: "ratio", value: 1.5 });
    expect(parseLineHeightInput("2.5")).toEqual({ mode: "ratio", value: 2.5 });
    expect(parseLineHeightInput("24")).toEqual({ mode: "px", value: 24 });
    expect(parseLineHeightInput("4")).toEqual({ mode: "px", value: 4 });
  });

  it("still obeys a unit when one is forced", () => {
    expect(parseLineHeightInput("24", "px")).toEqual({ mode: "px", value: 24 });
    expect(parseLineHeightInput("24", "ratio")).toBeNull();
  });

  it("refuses a number that is neither", () => {
    /* Below the ratio floor and below any plausible pixel height. Guessing
       would be worse than saying so. */
    expect(parseLineHeightInput("0.5")).toBeNull();
    expect(parseLineHeightInput(String(MAX_LINE_HEIGHT_RATIO + 0.1))).toEqual({
      mode: "px",
      value: MAX_LINE_HEIGHT_RATIO + 0.1,
    });
  });

  it("refuses what it cannot read, rather than guessing", () => {
    /* Number() over parseFloat, which reads "1.5rem" as 1.5 and "12abc" as
       12 — a typo becoming a silent value change. */
    expect(parseLineHeightInput("1.5rem")).toBeNull();
    expect(parseLineHeightInput("abc")).toBeNull();
    expect(parseLineHeightInput("px")).toBeNull();
    expect(parseLineHeightInput("-2")).toBeNull();
    expect(parseLineHeightInput("0")).toBeNull();
  });

  it("round-trips what it formats", () => {
    const configs = [
      { mode: "auto" } as const,
      { mode: "px", value: 24 } as const,
      { mode: "ratio", value: 1.5 } as const,
    ];
    for (const config of configs) {
      expect(parseLineHeightInput(formatLineHeightInput(config))).toEqual(
        config,
      );
    }
  });
});

describe("reading stored data", () => {
  it("reads a bare number as the ratio it used to mean", () => {
    /* Every project saved before this file holds one. Detected by shape, as
       the rest of this package's readers are, rather than gated on a version. */
    expect(readLineHeightConfig(1.5)).toEqual({ mode: "ratio", value: 1.5 });
  });

  it("reads each of the three modes back", () => {
    expect(readLineHeightConfig({ mode: "auto" })).toEqual({ mode: "auto" });
    expect(readLineHeightConfig({ mode: "px", value: 24 })).toEqual({
      mode: "px",
      value: 24,
    });
    expect(readLineHeightConfig({ mode: "ratio", value: 1.4 })).toEqual({
      mode: "ratio",
      value: 1.4,
    });
  });

  it("returns null for anything it does not recognise", () => {
    expect(readLineHeightConfig(null)).toBeNull();
    expect(readLineHeightConfig(0)).toBeNull();
    expect(readLineHeightConfig(-1)).toBeNull();
    expect(readLineHeightConfig("1.5")).toBeNull();
    expect(readLineHeightConfig({ mode: "px" })).toBeNull();
    expect(readLineHeightConfig({ mode: "nope", value: 1 })).toBeNull();
    expect(readLineHeightConfig([1.5])).toBeNull();
  });
});
