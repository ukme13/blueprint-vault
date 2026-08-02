import { describe, expect, it } from "vitest";
import {
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
