import { describe, expect, it } from "vitest";
import { generatePalettes } from "./palette";
import {
  assessPreview,
  assessSemanticPairs,
  selectPreviewShades,
} from "./preview-assessment";
import type { ColorTrack } from "./types";

const LIGHTNESS = [
  97.5, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50, 45, 40, 35, 30, 25, 20, 15, 10,
  5,
];

function palette(tracks: Array<{ id: string; name: string; seedHex: string }>) {
  return generatePalettes({ tracks, lightnessValues: LIGHTNESS });
}

/** A palette whose semantics are clearly distinct to normal vision. */
function distinctPalette(): ColorTrack[] {
  return palette([
    { id: "primary", name: "primary", seedHex: "#7646ab" },
    { id: "neutral", name: "neutral", seedHex: "#737373" },
    { id: "success", name: "success", seedHex: "#2f7d32" },
    { id: "warning", name: "warning", seedHex: "#b87503" },
    { id: "error", name: "error", seedHex: "#b02b1b" },
    { id: "info", name: "info", seedHex: "#2878b8" },
  ]);
}

function shadesOf(tracks: ColorTrack[]) {
  const shades = selectPreviewShades(tracks);
  if (!shades) throw new Error("expected shades");
  return shades;
}

describe("selectPreviewShades", () => {
  it("returns nothing for an empty palette", () => {
    expect(selectPreviewShades([])).toBeNull();
  });

  it("falls back to primary for every track a project has not got", () => {
    /* A project with one track still previews rather than crashing, which is
       what the fallback chain is for. */
    const only = palette([
      { id: "primary", name: "primary", seedHex: "#7646ab" },
    ]);
    const shades = shadesOf(only);

    expect(shades.successAction.hex).toBe(shades.primaryAction.hex);
    expect(shades.infoAction.hex).toBe(shades.primaryAction.hex);
  });

  it("uses the first track when nothing is named primary", () => {
    const shades = shadesOf(
      palette([{ id: "brand", name: "brand", seedHex: "#118844" }]),
    );
    expect(shades.primaryAction.hex).toBeTruthy();
  });

  it("prefers the named focus weight over a position", () => {
    /* 300 is the weight the focus token is documented against, so it is taken
       by name where it exists rather than by where it falls in the track. */
    const shades = shadesOf(distinctPalette());
    expect(shades.primaryFocus.weight).toBe(300);
  });
});

describe("assessSemanticPairs", () => {
  it("compares the four pairs a component actually puts together", () => {
    const pairs = assessSemanticPairs(shadesOf(distinctPalette()));

    expect(pairs.map((pair) => pair.label)).toEqual([
      "Success and warning",
      "Success and error",
      "Warning and error",
      "Primary and info",
    ]);
  });

  it("checks every deficiency, not only the one being previewed", () => {
    /* The warning has to be there when simulation is off, or somebody only
       finds out by going looking for it. */
    for (const pair of assessSemanticPairs(shadesOf(distinctPalette()))) {
      expect(pair.simulated.map((entry) => entry.deficiency)).toEqual([
        "protanopia",
        "deuteranopia",
        "tritanopia",
        "achromatopsia",
      ]);
    }
  });

  it("finds green and red colliding under deuteranopia", () => {
    /* The case the goal names. Success and error are a comfortable distance
       apart to normal vision and are the textbook collision for the most
       common deficiency, so if this stops holding either the transform or the
       shade choice has moved. */
    const pairs = assessSemanticPairs(shadesOf(distinctPalette()));
    const successError = pairs.find(
      (pair) => pair.label === "Success and error",
    )!;

    expect(successError.result.isTooSimilar).toBe(false);
    expect(successError.collapsesUnder).toContain("deuteranopia");

    const deuteranopia = successError.simulated.find(
      (entry) => entry.deficiency === "deuteranopia",
    )!;
    expect(deuteranopia.result.difference).toBeLessThan(
      successError.result.difference,
    );
  });

  it("says nothing extra about a pair that is already too similar", () => {
    /* A pair that normal vision cannot separate is reported by the ordinary
       warning. Repeating it once per deficiency would bury the pairs that only
       some people cannot tell apart, which are the ones worth surfacing. */
    const distinct = distinctPalette();
    const collide = [
      ...distinct.filter((entry) => entry.name !== "error"),
      ...palette([{ id: "error", name: "error", seedHex: "#2f7d34" }]),
    ];

    const successError = assessSemanticPairs(shadesOf(collide)).find(
      (pair) => pair.label === "Success and error",
    )!;

    expect(successError.result.isTooSimilar).toBe(true);
    expect(successError.collapsesUnder).toEqual([]);
  });

  it("leaves a pair alone when a deficiency does not affect it", () => {
    /* Primary and info are both blue-violet, so tritanopia is the one that
       should trouble them rather than the red-green pair. This is the guard
       against a transform that flattens everything into one warning. */
    const pairs = assessSemanticPairs(shadesOf(distinctPalette()));
    const successWarning = pairs.find(
      (pair) => pair.label === "Success and warning",
    )!;
    const tritanopia = successWarning.simulated.find(
      (entry) => entry.deficiency === "tritanopia",
    )!;

    expect(tritanopia.result.isTooSimilar).toBe(false);
  });
});

describe("assessPreview", () => {
  it("counts a pair that only collapses under simulation", () => {
    const assessment = assessPreview(shadesOf(distinctPalette()));
    const collapsing = assessment.semanticPairs.filter(
      (pair) => pair.collapsesUnder.length > 0,
    );

    expect(collapsing.length).toBeGreaterThan(0);
    expect(assessment.issueCount).toBeGreaterThanOrEqual(collapsing.length);
  });

  it("counts a collapsing pair once, however many deficiencies it collapses under", () => {
    /* It is one thing to go and fix. Counting per deficiency would make a
       single bad pair look like four problems. */
    const shades = shadesOf(distinctPalette());
    const assessment = assessPreview(shades);

    const multiple = assessment.semanticPairs.filter(
      (pair) => pair.collapsesUnder.length > 1,
    );
    expect(multiple.length).toBeGreaterThan(0);

    const withoutSimulation =
      assessment.textChecks.filter((check) => check.result.status !== "pass")
        .length +
      assessment.nonTextChecks.filter(
        (check) => check.countsTowardWarnings && !check.result.passes,
      ).length +
      (assessment.focusCheck.status === "fail" ? 1 : 0) +
      assessment.semanticPairs.filter((pair) => pair.result.isTooSimilar)
        .length;

    expect(assessment.issueCount).toBe(
      withoutSimulation +
        assessment.semanticPairs.filter(
          (pair) => pair.collapsesUnder.length > 0,
        ).length,
    );
  });

  it("reports every section the preview renders", () => {
    const assessment = assessPreview(shadesOf(distinctPalette()));

    expect(assessment.textChecks).toHaveLength(7);
    expect(assessment.textColourChoices).toHaveLength(4);
    expect(assessment.nonTextChecks).toHaveLength(2);
    expect(assessment.semanticPairs).toHaveLength(4);
    expect(assessment.focusCheck.adjacentContrast).toBeGreaterThan(0);
  });
});
