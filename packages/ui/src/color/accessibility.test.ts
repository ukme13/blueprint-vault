import { describe, expect, it } from "vitest";
import {
  assessTextContrastAtSize,
  isLargeText,
  assessColourSimilarity,
  assessFocusContrast,
  assessNonTextContrast,
  assessTextContrast,
  contrastRatio,
  recommendTextColour,
  relativeLuminance,
} from "./accessibility";

describe("WCAG contrast", () => {
  it("calculates relative luminance and the maximum contrast ratio", () => {
    expect(relativeLuminance("#000000")).toBe(0);
    expect(relativeLuminance("#ffffff")).toBe(1);
    expect(contrastRatio("#000000", "#ffffff")).toBe(21);
  });

  it("classifies normal and large text requirements", () => {
    expect(assessTextContrast("#595959", "#ffffff").summary).toBe(
      "Passes AAA for normal text.",
    );
    expect(assessTextContrast("#767676", "#ffffff").summary).toBe(
      "Passes AA for normal text.",
    );
    expect(assessTextContrast("#949494", "#ffffff").summary).toBe(
      "Passes AA only for large text.",
    );
    expect(assessTextContrast("#b6b6b6", "#ffffff").summary).toBe(
      "Fails; use a darker foreground.",
    );
  });

  it("checks controls and borders against the 3:1 requirement", () => {
    expect(assessNonTextContrast("#949494", "#ffffff").passes).toBe(true);
    expect(assessNonTextContrast("#aaaaaa", "#ffffff").passes).toBe(false);
  });

  it("recommends the stronger black or white text colour", () => {
    expect(recommendTextColour("#7646ab").colour).toBe("#ffffff");
    expect(recommendTextColour("#f8f5fc").colour).toBe("#000000");
  });
});

describe("colour distinction and focus", () => {
  it("flags perceptually similar colours without calling it a WCAG failure", () => {
    expect(assessColourSimilarity("#ff0000", "#fe0000").level).toBe(
      "very-similar",
    );
    expect(assessColourSimilarity("#ff0000", "#0000ff").level).toBe("distinct");
  });

  it("checks focus contrast against adjacent and unfocused colours", () => {
    const passing = assessFocusContrast("#000000", "#ffffff", "#ffffff");
    const failing = assessFocusContrast("#aaaaaa", "#ffffff", "#ffffff");

    expect(passing.status).toBe("pass");
    expect(passing.passesChangeContrast).toBe(true);
    expect(failing.status).toBe("fail");
  });
});

describe("assessTextContrastAtSize", () => {
  // 4.62:1 — over AA for normal text, under AAA, well over AA for large.
  const mid = ["#767676", "#ffffff"] as const;

  it("counts 24px as large, and 23px as not", () => {
    expect(isLargeText(24, 400)).toBe(true);
    expect(isLargeText(23, 400)).toBe(false);
  });

  it("lets bold text be large from 18.66px", () => {
    // The boundary the plain size check gets wrong: same size, different verdict.
    expect(isLargeText(18.66, 700)).toBe(true);
    expect(isLargeText(18.66, 400)).toBe(false);
  });

  it("applies the threshold the size actually earns", () => {
    const caption = assessTextContrastAtSize("#949494", "#ffffff", 12, 400);
    const heading = assessTextContrastAtSize("#949494", "#ffffff", 32, 400);
    // One pair of colours, two answers, because the sizes differ.
    expect(caption.status).toBe("fail");
    expect(heading.status).toBe("pass");
  });

  it("names the threshold that applied when it fails", () => {
    const result = assessTextContrastAtSize("#949494", "#ffffff", 12, 400);
    expect(result.requiredAA).toBe(4.5);
    expect(result.summary).toContain("4.5:1");
    expect(result.summary).toContain("normal text");
  });

  it("reports large-text thresholds for a bold heading", () => {
    const result = assessTextContrastAtSize("#949494", "#ffffff", 20, 700);
    expect(result.isLargeText).toBe(true);
    expect(result.requiredAA).toBe(3);
  });

  it("keeps the underlying ratio and both level verdicts", () => {
    const result = assessTextContrastAtSize(mid[0], mid[1], 16, 400);
    expect(result.ratio).toBeGreaterThan(4.5);
    expect(result.normalText.aa).toBe(true);
    expect(result.normalText.aaa).toBe(false);
    expect(result.largeText.aa).toBe(true);
  });
});
