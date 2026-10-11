import { describe, expect, it } from "vitest";
import {
  CONTRAST_SCORE_NOTES,
  contrastStatus,
  cutRatio,
  isContrastWarning,
  ratioText,
  shownLc,
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
    /* 4.478 is cut to 4.4, not rounded up to the 4.5 it is short of. */
    expect(wcag2.label).toBe("4.4");
    expect(wcag3.label).toBe("71");
    /* Between the lines in both: clears some, not all. */
    expect(wcag2.status).toBe("partial");
    expect(wcag3.status).toBe("partial");
  });

  it("changes step on the line, as the figure crosses it", () => {
    /* #767676 on white is 4.54:1, which clears AA; #777777 is 4.478:1, cut to
       4.4 and not rounded up to the 4.5 it is short of. */
    expect(swatchContrast("wcag2", "#767676", "#ffffff")).toMatchObject({
      label: "4.5",
      status: "pass",
    });
    expect(swatchContrast("wcag2", "#777777", "#ffffff")).toMatchObject({
      label: "4.4",
      status: "partial",
    });
  });

  it("does not warn between AA and AAA", () => {
    /* #5a5a5a is 6.9:1: past 4.5, short of AAA's 7, and nothing to flag. */
    expect(swatchContrast("wcag2", "#5a5a5a", "#ffffff")).toMatchObject({
      label: "6.8",
      status: "pass",
    });
    expect(swatchContrast("wcag2", "#595959", "#ffffff")).toMatchObject({
      label: "7.0",
      status: "pass",
    });
    /* 3:1 up to 4.5 is the amber: large text and graphics, not normal text. */
    expect(swatchContrast("wcag2", "#959595", "#ffffff").status).toBe("fail");
    expect(swatchContrast("wcag2", "#8a8a8a", "#ffffff").status).toBe(
      "partial",
    );
  });

  it("judges an Lc on the whole number it shows", () => {
    /* #acacac is Lc 44.78: shown as 45, which is the UI line, so it clears it. */
    expect(swatchContrast("wcag3", "#acacac", "#ffffff")).toMatchObject({
      label: "45",
      status: "partial",
    });
    /* #b0b0b0 is Lc 43: under it. */
    expect(swatchContrast("wcag3", "#b0b0b0", "#ffffff")).toMatchObject({
      label: "43",
      status: "fail",
    });
    /* #6f6f6f is Lc 74.76: shown as 75, which is the body line. */
    expect(swatchContrast("wcag3", "#6f6f6f", "#ffffff")).toMatchObject({
      label: "75",
      status: "pass",
    });
  });

  it("never shows a ratio that is at a line it is under", () => {
    /* 2.995:1 is under 3, and reads 2.9, not 3.0. */
    expect(swatchContrast("wcag2", "#959595", "#ffffff")).toMatchObject({
      label: "2.9",
      status: "fail",
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
  it("steps at 3:1 and 4.5:1 under WCAG 2: AA is a pass", () => {
    expect(contrastStatus("wcag2", 2.9)).toBe("fail");
    expect(contrastStatus("wcag2", 3)).toBe("partial");
    expect(contrastStatus("wcag2", 4.49)).toBe("partial");
    expect(contrastStatus("wcag2", 4.5)).toBe("pass");
    /* AAA is a grade, not a warning: 4.5 to 7 has nothing to flag. */
    expect(contrastStatus("wcag2", 6.9)).toBe("pass");
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

describe("CONTRAST_SCORE_NOTES", () => {
  it("says what each standard asks, in the words the tooltip shows", () => {
    expect(CONTRAST_SCORE_NOTES.wcag2).toBe(
      "AA requires 4.5:1 for normal text (3:1 for large text & graphics). AAA requires 7.0:1.",
    );
    expect(CONTRAST_SCORE_NOTES.wcag3).toBe(
      "Body text requires Lc 75, large text requires Lc 60, and UI components require Lc 45.",
    );
  });

  it("names the same line the swatch warns at", () => {
    /* Under 4.5 the swatch warns and the note says 4.5 is what AA asks. */
    expect(contrastStatus("wcag2", 4.49)).not.toBe("pass");
    expect(contrastStatus("wcag2", 4.5)).toBe("pass");
    expect(CONTRAST_SCORE_NOTES.wcag2).toContain("4.5:1");
    expect(contrastStatus("wcag3", 74)).not.toBe("pass");
    expect(contrastStatus("wcag3", 75)).toBe("pass");
    expect(CONTRAST_SCORE_NOTES.wcag3).toContain("Lc 75");
  });
});

describe("the figure shown is the figure judged", () => {
  it("shows a whole Lc, signless", () => {
    expect(shownLc(44.78)).toBe(45);
    expect(shownLc(-74.6)).toBe(75);
    expect(shownLc(44.4)).toBe(44);
  });

  it("cuts a ratio to its places and never up", () => {
    expect(cutRatio(4.478)).toBe("4.4");
    expect(cutRatio(2.995)).toBe("2.9");
    expect(cutRatio(4.499, 2)).toBe("4.49");
    expect(ratioText(7.004)).toBe("7.0:1");
    expect(ratioText(4.478, 2)).toBe("4.47:1");
  });

  it("does not cut a whole ratio below itself", () => {
    expect(cutRatio(21)).toBe("21.0");
    expect(cutRatio(7)).toBe("7.0");
    expect(cutRatio(4.5)).toBe("4.5");
    expect(cutRatio(3, 2)).toBe("3.00");
  });
});
