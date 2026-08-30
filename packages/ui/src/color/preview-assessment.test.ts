import { describe, expect, it } from "vitest";
import { generatePalettes } from "./palette";
import {
  assessNonTextChecks,
  assessPreview,
  assessSemanticPairs,
  assessTextChecks,
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

/**
 * A palette whose success track sits just above AA and drops below it once
 * simulated.
 *
 * Deep reds are where this happens: they clear 4.5:1 on the light neutral by a
 * small margin, and deuteranopia takes enough luminance out of them to cross
 * the line. Found by sweeping seeds rather than guessed, because the first
 * three colours tried all moved the ratio the wrong way.
 */
function weakeningPalette(): ColorTrack[] {
  return palette([
    { id: "primary", name: "primary", seedHex: "#7646ab" },
    { id: "neutral", name: "neutral", seedHex: "#737373" },
    { id: "success", name: "success", seedHex: "#802020" },
  ]);
}

describe("contrast under simulation", () => {
  it("reports no simulated ratio under normal vision", () => {
    /* Null rather than a ratio equal to the real one, so nothing can render a
       "simulated" figure that is simply the same number twice. */
    for (const check of assessTextChecks(shadesOf(distinctPalette()))) {
      expect(check.simulated, check.label).toBeNull();
    }
  });

  it("reports the ratio for the deficiency being previewed", () => {
    const checks = assessTextChecks(shadesOf(distinctPalette()), {
      simulation: "protanopia",
      severity: 1,
    });

    for (const check of checks) {
      expect(check.simulated, check.label).not.toBeNull();
      expect(check.simulated!.deficiency).toBe("protanopia");
      expect(check.simulated!.severity).toBe(1);
      expect(check.simulated!.ratio).toBeGreaterThan(0);
    }
  });

  it("carries no verdict with the simulated ratio", () => {
    /* WCAG defines its thresholds on the actual colours. A simulated pair
       cannot pass or fail AA, and offering a field that said it could would
       invite exactly that claim. */
    const [check] = assessTextChecks(shadesOf(distinctPalette()), {
      simulation: "protanopia",
      severity: 1,
    });

    expect(Object.keys(check!.simulated!).sort()).toEqual([
      "deficiency",
      "ratio",
      "severity",
      "weakens",
    ]);
  });

  it("moves contrast up as readily as down", () => {
    /* White on red gains contrast under protanopia — the red darkens and the
       white does not — while green text on a light surface loses a little.
       Both are pinned because the intuition that simulation only ever makes
       things worse is wrong, and a test written from that intuition fails
       against correct code. */
    const checks = assessTextChecks(shadesOf(distinctPalette()), {
      simulation: "protanopia",
      severity: 1,
    });
    const errorText = checks.find(
      (check) => check.label === "Error action text",
    )!;
    const successText = checks.find(
      (check) => check.label === "Success status text",
    )!;

    expect(errorText.simulated!.ratio).toBeGreaterThan(
      errorText.result.ratio + 1,
    );
    expect(successText.simulated!.ratio).toBeLessThan(successText.result.ratio);
  });

  it("leaves achromatopsia's ratios where they were", () => {
    /* The greyscale preserves relative luminance exactly, so every ratio is
       unchanged but for 8-bit rounding on the way to a hex. It is the one mode
       that can neither invent nor hide a contrast problem. */
    const checks = assessTextChecks(shadesOf(distinctPalette()), {
      simulation: "achromatopsia",
      severity: 1,
    });

    for (const check of checks) {
      expect(
        Math.abs(check.simulated!.ratio - check.result.ratio),
        check.label,
      ).toBeLessThan(0.2);
      expect(check.simulated!.weakens, check.label).toBe(false);
    }
  });

  it("moves further as severity rises", () => {
    const at = (severity: number) =>
      assessTextChecks(shadesOf(distinctPalette()), {
        simulation: "protanopia",
        severity,
      }).find((check) => check.label === "Success status text")!.simulated!
        .ratio;

    expect(at(0.2)).toBeGreaterThan(at(0.6));
    expect(at(0.6)).toBeGreaterThan(at(1));
  });

  it("flags a pair that clears AA and stops clearing it", () => {
    /* The actionable case: 4.73:1 on the real palette, 4.29:1 once the red is
       simulated. Nothing on screen would tell you without this. */
    const check = assessTextChecks(shadesOf(weakeningPalette()), {
      simulation: "deuteranopia",
      severity: 1,
    }).find((entry) => entry.label === "Success status text")!;

    expect(check.result.ratio).toBeGreaterThanOrEqual(4.5);
    expect(check.simulated!.ratio).toBeLessThan(4.5);
    expect(check.simulated!.weakens).toBe(true);
  });

  it("says nothing about a pair that was already failing", () => {
    /* Reported by the ordinary verdict beside it. Repeating it as a simulation
       warning would bury the ones only some people cannot read. */
    for (const deficiency of ["protanopia", "deuteranopia"] as const) {
      const checks = assessTextChecks(shadesOf(distinctPalette()), {
        simulation: deficiency,
        severity: 1,
      });

      for (const check of checks) {
        if (check.result.ratio < 4.5) {
          expect(check.simulated!.weakens, check.label).toBe(false);
          expect(check.weakensUnder, check.label).toEqual([]);
        }
      }
    }
  });

  it("names every deficiency a pair weakens under, whatever is previewed", () => {
    /* Independent of the current view, the same way collapsing pairs are: a
       warning that only appears once you have chosen the right mode is one
       nobody finds. */
    const off = assessTextChecks(shadesOf(weakeningPalette()));
    const on = assessTextChecks(shadesOf(weakeningPalette()), {
      simulation: "tritanopia",
      severity: 1,
    });

    expect(off.map((check) => check.weakensUnder)).toEqual(
      on.map((check) => check.weakensUnder),
    );
    expect(
      off.find((check) => check.label === "Success status text")!.weakensUnder,
    ).toContain("deuteranopia");
  });

  it("says nothing about a decorative boundary", () => {
    /* The soft surface is advisory, so it does not count toward warnings and
       has nothing to go and fix under simulation either. */
    const soft = assessNonTextChecks(shadesOf(distinctPalette())).find(
      (check) => check.label === "Soft surface boundary",
    )!;

    expect(soft.countsTowardWarnings).toBe(false);
    expect(soft.weakensUnder).toEqual([]);
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
