import { describe, expect, it } from "vitest";
import {
  apcaTextStatus,
  apcaTier,
  assessmentIssueCount,
  gradeContrast,
} from "./accessibility-standard";
import { generatePalettes } from "./palette";
import { assessPreview, previewShadesFor } from "./preview-assessment";
import { seedSemanticTokens } from "./semantic";

describe("gradeContrast", () => {
  it("grades WCAG 2 body text as AAA at 7, AA at 4.5 and Fail under it", () => {
    expect(gradeContrast("wcag2", "body", "#000000", "#ffffff")).toMatchObject({
      value: "21.0:1",
      grade: "AAA",
    });
    /* #767676 on white is 4.54:1. */
    expect(gradeContrast("wcag2", "body", "#767676", "#ffffff")).toMatchObject({
      grade: "AA",
      passes: true,
    });
    /* #777777 on white is 4.48:1, a hair short. */
    expect(gradeContrast("wcag2", "body", "#777777", "#ffffff")).toMatchObject({
      grade: "Fail",
      passes: false,
    });
  });

  it("lowers the line for large text and holds UI to 3:1 with no AAA", () => {
    expect(gradeContrast("wcag2", "large", "#949494", "#ffffff").grade).toBe(
      "AA",
    );
    expect(gradeContrast("wcag2", "ui", "#949494", "#ffffff")).toMatchObject({
      grade: "AA",
      passes: true,
    });
    expect(gradeContrast("wcag2", "ui", "#aaaaaa", "#ffffff")).toMatchObject({
      grade: "Fail",
      passes: false,
    });
  });

  it("shows WCAG 3 as the size of the Lc, whichever way round", () => {
    expect(gradeContrast("wcag3", "body", "#000000", "#ffffff").value).toBe(
      "Lc 106",
    );
    /* Light on dark is negative; the card shows its size. */
    expect(gradeContrast("wcag3", "body", "#ffffff", "#000000").value).toBe(
      "Lc 108",
    );
  });

  it("holds Lc to 75 for body, 60 for large and 45 for UI", () => {
    /* #777 on white is Lc 71.6. */
    expect(gradeContrast("wcag3", "body", "#777777", "#ffffff").passes).toBe(
      false,
    );
    expect(gradeContrast("wcag3", "large", "#777777", "#ffffff").passes).toBe(
      true,
    );
    expect(gradeContrast("wcag3", "ui", "#777777", "#ffffff").passes).toBe(
      true,
    );
    expect(gradeContrast("wcag3", "ui", "#dddddd", "#ffffff").passes).toBe(
      false,
    );
  });
});

describe("apcaTier", () => {
  it("sorts a size of Lc into Body, Large, UI or Fail on the boundaries", () => {
    expect(apcaTier(75)).toBe("Body");
    expect(apcaTier(74.9)).toBe("Large");
    expect(apcaTier(60)).toBe("Large");
    expect(apcaTier(59.9)).toBe("UI");
    expect(apcaTier(45)).toBe("UI");
    expect(apcaTier(44.9)).toBe("Fail");
  });

  it("reads light-on-dark by its size", () => {
    expect(apcaTier(-80)).toBe("Body");
    expect(apcaTier(-50)).toBe("UI");
  });
});

describe("apcaTextStatus", () => {
  it("passes body grade, is partial for large and UI, and fails below", () => {
    expect(apcaTextStatus(90)).toBe("pass");
    expect(apcaTextStatus(65)).toBe("partial");
    expect(apcaTextStatus(50)).toBe("partial");
    expect(apcaTextStatus(20)).toBe("fail");
  });
});

describe("assessmentIssueCount", () => {
  function assessment() {
    const tracks = generatePalettes({
      tracks: [
        { id: "t-primary", name: "primary", seedHex: "#7646ab" },
        { id: "t-neutral", name: "neutral", seedHex: "#737373" },
        { id: "t-success", name: "success", seedHex: "#2f7d32" },
        { id: "t-warning", name: "warning", seedHex: "#b87503" },
        { id: "t-error", name: "error", seedHex: "#b02b1b" },
        { id: "t-info", name: "info", seedHex: "#2878b8" },
      ],
      lightnessValues: [
        97.5, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50, 45, 40, 35, 30, 25, 20,
        15, 10, 5,
      ],
    });
    return assessPreview(
      previewShadesFor(seedSemanticTokens(tracks), tracks, "light")!,
    );
  }

  it("is the assessment's own count under WCAG 2", () => {
    const report = assessment();
    expect(assessmentIssueCount(report, "wcag2")).toBe(report.issueCount);
  });

  it("is never negative under WCAG 3, and swaps only the text and boundary checks", () => {
    const report = assessment();
    const wcag3 = assessmentIssueCount(report, "wcag3");

    expect(wcag3).toBeGreaterThanOrEqual(0);
    /* Everything the standards share is in both counts, so the two can differ
       by no more than the number of checks that are judged differently. */
    const judged = report.textChecks.length + report.nonTextChecks.length;
    expect(Math.abs(wcag3 - report.issueCount)).toBeLessThanOrEqual(judged);
  });
});

describe("what is shown is what is judged", () => {
  /* Pairs found by scanning greys on white for an Lc a hair under a line. */
  it("passes an Lc that is shown as the line it reaches", () => {
    /* Lc 44.78 is shown as Lc 45, and is a pass for UI. */
    expect(gradeContrast("wcag3", "ui", "#acacac", "#ffffff")).toMatchObject({
      value: "Lc 45",
      grade: "Pass",
      passes: true,
    });
    /* Lc 59.63 is shown as Lc 60: the line for large text and labels. */
    expect(gradeContrast("wcag3", "large", "#8f8f8f", "#ffffff")).toMatchObject(
      {
        value: "Lc 60",
        passes: true,
      },
    );
    /* Lc 74.76 is shown as Lc 75: the line for body text. */
    expect(gradeContrast("wcag3", "body", "#6f6f6f", "#ffffff")).toMatchObject({
      value: "Lc 75",
      passes: true,
    });
  });

  it("still fails an Lc that is shown under the line", () => {
    /* Lc 44.4 would be shown as 44: one grey step lighter than #acacac. */
    expect(gradeContrast("wcag3", "ui", "#b0b0b0", "#ffffff")).toMatchObject({
      value: "Lc 43",
      passes: false,
    });
  });

  it("cuts a ratio to one place instead of rounding it up to the line", () => {
    /* 4.478 is not 4.5, and no longer reads as it. */
    expect(gradeContrast("wcag2", "body", "#777777", "#ffffff")).toMatchObject({
      value: "4.4:1",
      grade: "Fail",
      passes: false,
    });
    /* 2.995 is not 3. */
    expect(gradeContrast("wcag2", "ui", "#959595", "#ffffff")).toMatchObject({
      value: "2.9:1",
      passes: false,
    });
    /* A whole ratio is not cut below itself by the arithmetic. */
    expect(gradeContrast("wcag2", "body", "#000000", "#ffffff").value).toBe(
      "21.0:1",
    );
  });
});

describe("the label job", () => {
  it("holds a label to large text's Lc 60 and not body text's 75", () => {
    /* #777 on white is Lc 71: a body-text fail, and fine for a label. */
    expect(gradeContrast("wcag3", "body", "#777777", "#ffffff").passes).toBe(
      false,
    );
    expect(gradeContrast("wcag3", "label", "#777777", "#ffffff")).toMatchObject(
      {
        value: "Lc 71",
        passes: true,
      },
    );
    /* Under 60 it fails. */
    expect(gradeContrast("wcag3", "label", "#999999", "#ffffff").passes).toBe(
      false,
    );
  });

  it("is body text's line in WCAG 2, which has no relaxed line for small text", () => {
    expect(gradeContrast("wcag2", "label", "#777777", "#ffffff")).toMatchObject(
      {
        grade: "Fail",
        passes: false,
      },
    );
    expect(gradeContrast("wcag2", "label", "#767676", "#ffffff")).toMatchObject(
      {
        grade: "AA",
        passes: true,
      },
    );
  });
});
