import { describe, expect, it } from "vitest";
import {
  contrastStatus,
  isContrastWarning,
  swatchContrast,
} from "./contrast-reading";

describe("swatchContrast", () => {
  it("reads a WCAG 2 ratio to one place", () => {
    expect(swatchContrast("wcag2", "#000000", "#ffffff")).toEqual({
      label: "21.0",
      description: "contrast 21.0 to 1, passes",
      status: "pass",
    });
  });

  it("reads WCAG 3 as the size of the Lc, with the sign left out", () => {
    expect(swatchContrast("wcag3", "#000000", "#ffffff")).toEqual({
      label: "106",
      description: "APCA contrast Lc 106, passes",
      status: "pass",
    });
    /* Light on dark is negative in APCA; the swatch shows how much, not which way. */
    expect(swatchContrast("wcag3", "#ffffff", "#000000").label).toBe("108");
  });

  it("is the same pair in both, so the two figures can be compared", () => {
    const wcag2 = swatchContrast("wcag2", "#777777", "#ffffff");
    const wcag3 = swatchContrast("wcag3", "#777777", "#ffffff");
    expect(wcag2.label).toBe("4.5");
    expect(wcag3.label).toBe("71");
    /* Between the lines in both: clears some, not all. */
    expect(wcag2.status).toBe("partial");
    expect(wcag3.status).toBe("partial");
  });

  it("changes step on the line, as the figure crosses it", () => {
    /* #595959 on white is 7.005:1, which clears AAA; #5a5a5a is 6.897:1. */
    expect(swatchContrast("wcag2", "#595959", "#ffffff")).toMatchObject({
      label: "7.0",
      status: "pass",
    });
    expect(swatchContrast("wcag2", "#5a5a5a", "#ffffff")).toMatchObject({
      label: "6.9",
      status: "partial",
    });
  });

  it("marks a pair that cannot be told apart as failing", () => {
    expect(swatchContrast("wcag2", "#eeeeee", "#ffffff").status).toBe("fail");
    expect(swatchContrast("wcag3", "#eeeeee", "#ffffff").status).toBe("fail");
    expect(swatchContrast("wcag3", "#eeeeee", "#ffffff").description).toContain(
      "fails",
    );
  });
});

describe("swatchContrast by polarity", () => {
  it("leaves a WCAG 2 ratio as it is when the pair is turned round", () => {
    expect(swatchContrast("wcag2", "#6b57e1", "#ffffff", "under")).toEqual(
      swatchContrast("wcag2", "#6b57e1", "#ffffff", "on"),
    );
  });

  it("measures a WCAG 3 pair the other way round under", () => {
    /* The same two colours, the other one as the text: a different Lc. */
    const on = swatchContrast("wcag3", "#6b57e1", "#ffffff", "on");
    const under = swatchContrast("wcag3", "#6b57e1", "#ffffff", "under");
    expect(on.label).not.toBe(under.label);
    expect(swatchContrast("wcag3", "#6b57e1", "#ffffff").label).toBe(on.label);
  });
});

describe("isContrastWarning", () => {
  it("warns of a fail and a partial pass, and says nothing of a pass", () => {
    expect(isContrastWarning("fail")).toBe(true);
    expect(isContrastWarning("partial")).toBe(true);
    expect(isContrastWarning("pass")).toBe(false);
  });
});

describe("contrastStatus", () => {
  it("steps at 3:1 and 7:1 under WCAG 2", () => {
    expect(contrastStatus("wcag2", 2.9)).toBe("fail");
    expect(contrastStatus("wcag2", 3)).toBe("partial");
    expect(contrastStatus("wcag2", 6.9)).toBe("partial");
    expect(contrastStatus("wcag2", 7)).toBe("pass");
    expect(contrastStatus("wcag2", 21)).toBe("pass");
  });

  it("steps at Lc 45 and 75 under WCAG 3", () => {
    expect(contrastStatus("wcag3", 44)).toBe("fail");
    expect(contrastStatus("wcag3", 45)).toBe("partial");
    expect(contrastStatus("wcag3", 74)).toBe("partial");
    expect(contrastStatus("wcag3", 75)).toBe("pass");
    expect(contrastStatus("wcag3", 106)).toBe("pass");
  });
});
