import { describe, expect, it } from "vitest";
import { generatePalettes } from "./palette";
import { seedSemanticTokens } from "./semantic";
import {
  assessNonTextChecks,
  assessPreview,
  assessSemanticPairs,
  assessTextChecks,
  previewShadesFor,
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

/**
 * The layer resolved against a palette.
 *
 * Seeded rather than hand-written, because the seed is what a workspace
 * actually starts with — a test built on a bespoke layer would pass while the
 * real one was broken.
 */
function shadesOf(tracks: ColorTrack[], tokens = seedSemanticTokens(tracks)) {
  const shades = previewShadesFor(tokens, tracks);
  if (!shades) throw new Error("expected shades");
  return shades;
}

describe("previewShadesFor", () => {
  it("returns nothing for an empty palette", () => {
    expect(previewShadesFor([], [])).toBeNull();
  });

  it("returns nothing when the layer is missing what every check needs", () => {
    /* Nothing to render beats a preview built from whatever happened to
       resolve. */
    const tracks = distinctPalette();
    const withoutSurface = seedSemanticTokens(tracks).filter(
      (token) => token.id !== "surface.base",
    );
    expect(previewShadesFor(withoutSurface, tracks)).toBeNull();
  });

  it("falls back to primary for every track a project has not got", () => {
    /* A project with one track still previews rather than crashing, which is
       what the seed's fallback chain is for. */
    const only = palette([
      { id: "primary", name: "primary", seedHex: "#7646ab" },
    ]);
    const shades = shadesOf(only);

    expect(shades["status.success"]!.hex).toBe(shades["action.primary"]!.hex);
    expect(shades["status.info"]!.hex).toBe(shades["action.primary"]!.hex);
  });

  it("uses the first track when nothing is named primary", () => {
    const shades = shadesOf(
      palette([{ id: "brand", name: "brand", seedHex: "#118844" }]),
    );
    expect(shades["action.primary"]!.hex).toBeTruthy();
  });

  it("prefers the named focus weight over a position", () => {
    /* 300 is the weight the focus token is documented against, so it is taken
       by name where it exists rather than by where it falls in the track. */
    expect(shadesOf(distinctPalette())["focus.ring"]!.weight).toBe(300);
  });

  it("keys the shades by token id, so a renamed token follows", () => {
    const tracks = distinctPalette();
    const renamed = seedSemanticTokens(tracks).map((token) =>
      token.id === "status.info" ? { ...token, id: "status.notice" } : token,
    );
    const shades = previewShadesFor(renamed, tracks)!;

    expect(shades["status.notice"]).toBeDefined();
    expect(shades["status.info"]).toBeUndefined();
  });
});

describe("assessSemanticPairs", () => {
  it("compares every pair of tokens that signal by colour", () => {
    /* A rule rather than a list. The four that were named by hand are all
       here, and so is Success and info — green against blue, which is what
       tritanopia brings together and what a hand-written list missed. */
    const labels = assessSemanticPairs(shadesOf(distinctPalette())).map(
      (pair) => pair.label,
    );

    expect(labels).toContain("Success and warning");
    expect(labels).toContain("Success and error");
    expect(labels).toContain("Warning and error");
    expect(labels).toContain("Primary and info");
    expect(labels).toContain("Success and info");
  });

  it("leaves out a token that is told apart by position", () => {
    /* A surface, a border and body text are not signals: nobody reads meaning
       out of the colour of a divider. */
    const labels = assessSemanticPairs(shadesOf(distinctPalette())).map(
      (pair) => pair.label,
    );
    expect(labels.join(" ")).not.toMatch(/surface|border|Text/i);
  });

  it("shrinks with the layer", () => {
    const tracks = distinctPalette();
    const fewer = seedSemanticTokens(tracks).filter(
      (token) => !token.id.startsWith("status."),
    );
    const shades = previewShadesFor(fewer, tracks)!;

    /* Only the two actions are left, so there is one pair. */
    expect(assessSemanticPairs(shades)).toHaveLength(1);
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

    /* Every kind of thing that weakens only once simulated, each counted once.
       The two check terms used to be missing from this sum and it still
       matched, because nothing in the layer weakened under a deficiency
       without failing outright first. A tone whose label sits close to its
       threshold changed that, and the formula was wrong all along. */
    expect(assessment.issueCount).toBe(
      withoutSimulation +
        assessment.semanticPairs.filter(
          (pair) => pair.collapsesUnder.length > 0,
        ).length +
        assessment.textChecks.filter((check) => check.weakensUnder.length > 0)
          .length +
        assessment.nonTextChecks.filter(
          (check) => check.weakensUnder.length > 0,
        ).length,
    );
  });

  it("reports every section the preview renders", () => {
    const assessment = assessPreview(shadesOf(distinctPalette()));

    /* Thirteen: seven original, plus the label a filled action ships
       (fg.on-action on action.primary), the accent as text on the canvas, and
       one per status for the foreground of an alert on the alert's own
       ground. Each became measurable when the layer gained the role. */
    expect(assessment.textChecks).toHaveLength(22);
    expect(assessment.textColourChoices).toHaveLength(4);
    expect(assessment.nonTextChecks).toHaveLength(2);
    /* Every pair among the six tokens that signal by colour — two actions and
       four statuses. The list that was here named four of the fifteen.
       `action.hover`, `action.active` and `action.muted` are the primary
       control under the pointer, pressed, and turned down: three ways of
       saying the same accent rather than three signals beside each other, so
       they sit in the layer and out of the grid. Still six, and still
       fifteen, after the layer grew to thirty-seven. */
    const signalling = Object.keys(assessment.shades).filter(
      (id) =>
        /^(status|action)\./.test(id) &&
        ![
          "action.primary-hover",
          "action.primary-active",
          "action.muted",
          /* No hue to be confused with anything: black on light, white on dark. */
          "action.neutral",
        ].includes(id) &&
        /* Nor a part of a control: `status.error-surface` is the ground an
           alert sits on and `status.error-border` its edge, neither of them a
           colour anybody reads meaning out of. */
        !id.split(".").at(-1)!.includes("-"),
    ).length;
    expect(signalling).toBe(6);
    expect(assessment.semanticPairs).toHaveLength(
      (signalling * (signalling - 1)) / 2,
    );
    expect(assessment.focusCheck.adjacentContrast).toBeGreaterThan(0);
  });
});
