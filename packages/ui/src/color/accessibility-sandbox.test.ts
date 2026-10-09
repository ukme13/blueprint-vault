import { describe, expect, it } from "vitest";
import {
  assessSandboxTarget,
  assignSandboxColour,
  DEFAULT_SANDBOX_COLOURS,
  pressedSandboxTarget,
  resolveSandbox,
  resolveSandboxColour,
  SANDBOX_TARGETS,
  type SandboxTarget,
} from "./accessibility-sandbox";
import { generatePalettes } from "./palette";
import { seedSemanticTokens } from "./semantic";
import type { ColorTrack } from "./types";

const LIGHTNESS = [
  97.5, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50, 45, 40, 35, 30, 25, 20, 15, 10,
  5,
];

function palette(): ColorTrack[] {
  return generatePalettes({
    tracks: [
      { id: "t-primary", name: "primary", seedHex: "#7646ab" },
      { id: "t-neutral", name: "neutral", seedHex: "#737373" },
      { id: "t-success", name: "success", seedHex: "#2f7d32" },
      { id: "t-warning", name: "warning", seedHex: "#b87503" },
      { id: "t-error", name: "error", seedHex: "#b02b1b" },
      { id: "t-info", name: "info", seedHex: "#2878b8" },
    ],
    lightnessValues: LIGHTNESS,
  });
}

const BLACK = "#000000";
const WHITE = "#ffffff";

function hexes(
  overrides: Partial<Record<SandboxTarget, string>> = {},
): Record<SandboxTarget, string> {
  return {
    background: WHITE,
    badgeFill: WHITE,
    badgeText: BLACK,
    heading: BLACK,
    body: BLACK,
    buttonFill: BLACK,
    buttonText: WHITE,
    ...overrides,
  };
}

describe("resolveSandboxColour", () => {
  it("resolves a role through the mode asked for", () => {
    const tracks = palette();
    const tokens = seedSemanticTokens(tracks);
    const colour = { kind: "semantic", id: "fg.primary" } as const;

    const light = resolveSandboxColour(colour, tokens, tracks, "light");
    const dark = resolveSandboxColour(colour, tokens, tracks, "dark");

    expect(light?.hex).toBeTruthy();
    expect(dark?.hex).toBeTruthy();
    /* The point of a role: one assignment, two themes. */
    expect(light?.hex).not.toBe(dark?.hex);
  });

  it("holds a shade whatever the mode", () => {
    const tracks = palette();
    const tokens = seedSemanticTokens(tracks);
    const colour = {
      kind: "primitive",
      trackId: "t-primary",
      weight: 500,
    } as const;

    const light = resolveSandboxColour(colour, tokens, tracks, "light");
    const dark = resolveSandboxColour(colour, tokens, tracks, "dark");

    expect(light?.hex).toBe(dark?.hex);
    expect(light?.name).toBe("primary 500");
    expect(light?.weight).toBe(500);
  });

  it("is null for a role or a track that is gone", () => {
    const tracks = palette();
    const tokens = seedSemanticTokens(tracks);

    expect(
      resolveSandboxColour(
        { kind: "semantic", id: "nope.nope" },
        tokens,
        tracks,
        "light",
      ),
    ).toBeNull();
    expect(
      resolveSandboxColour(
        { kind: "primitive", trackId: "t-gone", weight: 500 },
        tokens,
        tracks,
        "light",
      ),
    ).toBeNull();
    expect(
      resolveSandboxColour(
        { kind: "primitive", trackId: "t-primary", weight: 501 },
        tokens,
        tracks,
        "light",
      ),
    ).toBeNull();
  });
});

describe("resolveSandbox", () => {
  it("resolves every target and the page from the defaults, in both modes", () => {
    const tracks = palette();
    const tokens = seedSemanticTokens(tracks);

    for (const mode of ["light", "dark"] as const) {
      const resolved = resolveSandbox(
        DEFAULT_SANDBOX_COLOURS,
        tokens,
        tracks,
        mode,
      );
      expect(resolved).not.toBeNull();
      expect(Object.keys(resolved!.hexes)).toEqual([...SANDBOX_TARGETS]);
      expect(resolved!.page).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it("gives up when any one target cannot be resolved", () => {
    const tracks = palette();
    const tokens = seedSemanticTokens(tracks);
    const broken = assignSandboxColour(DEFAULT_SANDBOX_COLOURS, "body", {
      kind: "semantic",
      id: "nope.nope",
    });

    expect(resolveSandbox(broken, tokens, tracks, "light")).toBeNull();
  });
});

describe("assignSandboxColour", () => {
  it("changes only the target it is given, and not the original", () => {
    const next = assignSandboxColour(DEFAULT_SANDBOX_COLOURS, "body", {
      kind: "primitive",
      trackId: "t-primary",
      weight: 900,
    });

    expect(next.body).toEqual({
      kind: "primitive",
      trackId: "t-primary",
      weight: 900,
    });
    expect(next.heading).toBe(DEFAULT_SANDBOX_COLOURS.heading);
    expect(DEFAULT_SANDBOX_COLOURS.body).toEqual({
      kind: "semantic",
      id: "fg.secondary",
    });
  });
});

describe("assessSandboxTarget", () => {
  it("grades text on a fill in WCAG 2 as AAA, with the ratio to one place", () => {
    const [onFill] = assessSandboxTarget("wcag2", "body", hexes(), WHITE);

    expect(onFill).toMatchObject({
      label: "Text on Fill",
      value: "21.0:1",
      grade: "AAA",
      passes: true,
    });
  });

  it("grades the same pair in WCAG 3 as an Lc, Pass", () => {
    const [onFill] = assessSandboxTarget("wcag3", "body", hexes(), WHITE);

    expect(onFill?.value).toBe("Lc 106");
    expect(onFill).toMatchObject({ grade: "Pass", passes: true });
  });

  it("holds a heading to the large-text line and body text to the body line", () => {
    /* #777 on white is 4.48:1, under AA for body text and over it for large,
       and Lc 71.6 under 75 for body and over 60 for large. */
    const grey = hexes({ body: "#777777", heading: "#777777" });

    const [body] = assessSandboxTarget("wcag2", "body", grey, WHITE);
    const [heading] = assessSandboxTarget("wcag2", "heading", grey, WHITE);
    expect(body).toMatchObject({ grade: "Fail", passes: false });
    expect(heading).toMatchObject({ grade: "AA", passes: true });

    const [body3] = assessSandboxTarget("wcag3", "body", grey, WHITE);
    const [heading3] = assessSandboxTarget("wcag3", "heading", grey, WHITE);
    expect(body3).toMatchObject({
      value: "Lc 71",
      grade: "Fail",
      passes: false,
    });
    expect(heading3).toMatchObject({
      value: "Lc 71",
      grade: "Pass",
      passes: true,
    });
  });

  it("judges a button's fill against what is behind it as a component", () => {
    const [, fillOnPage] = assessSandboxTarget(
      "wcag2",
      "buttonFill",
      hexes({ background: WHITE, buttonFill: BLACK }),
      WHITE,
    );

    expect(fillOnPage).toMatchObject({
      label: "Fill on Page",
      value: "21.0:1",
      /* A component has one line, 3:1, so there is no AAA to reach. */
      grade: "AA",
      passes: true,
    });
  });

  it("fails a fill that is too close to what is behind it", () => {
    const [, fillOnPage] = assessSandboxTarget(
      "wcag3",
      "buttonFill",
      hexes({ background: WHITE, buttonFill: "#eeeeee" }),
      WHITE,
    );

    expect(fillOnPage).toMatchObject({ grade: "Fail", passes: false });
  });

  it("gives the background's figure without a verdict", () => {
    /* A canvas is not a component: nothing says it has to stand out from the
       page, so the figure is advisory in either standard. */
    for (const standard of ["wcag2", "wcag3"] as const) {
      const fillOnPage = assessSandboxTarget(
        standard,
        "background",
        hexes({ background: "#fafafa" }),
        WHITE,
      ).at(-1);
      expect(fillOnPage).toMatchObject({ grade: "Advisory", passes: null });
    }
  });

  it("reads the background against both texts that sit on it, then the page", () => {
    const rows = assessSandboxTarget(
      "wcag2",
      "background",
      hexes({
        background: "#eeeeee",
        heading: "#111111",
        body: "#333333",
      }),
      WHITE,
    );

    expect(rows.map((row) => [row.label, row.glyph])).toEqual([
      ["Text on Fill", "heading"],
      ["Text on Fill", "body"],
      ["Fill on Page", "ui"],
    ]);
  });

  it("gives each row the pair it measured, so the mark can be drawn in it", () => {
    const rows = assessSandboxTarget(
      "wcag2",
      "buttonFill",
      hexes({
        background: "#eeeeee",
        buttonFill: "#1a8917",
        buttonText: "#ffffff",
      }),
      WHITE,
    );

    /* The text is the ink on the fill; the fill is the ink on what is behind. */
    expect(rows[0]).toMatchObject({
      glyph: "body",
      foreground: "#ffffff",
      background: "#1a8917",
    });
    expect(rows[1]).toMatchObject({
      glyph: "ui",
      foreground: "#1a8917",
      background: "#eeeeee",
    });
  });

  it("marks a heading's text as a heading and anything else as body", () => {
    expect(
      assessSandboxTarget("wcag2", "heading", hexes(), WHITE).map(
        (row) => row.glyph,
      ),
    ).toEqual(["heading", "ui"]);
    for (const target of ["body", "badgeText", "buttonText"] as const) {
      expect(
        assessSandboxTarget("wcag2", target, hexes(), WHITE)[0]!.glyph,
      ).toBe("body");
    }
  });

  it("measures a badge against the background it sits on, not the page", () => {
    const onBackground = assessSandboxTarget(
      "wcag2",
      "badgeFill",
      hexes({ background: BLACK, badgeFill: WHITE }),
      WHITE,
    );

    expect(onBackground[1]).toMatchObject({ value: "21.0:1", passes: true });
  });

  it("measures the Lc of text the right way round", () => {
    /* APCA depends on which is the text: light text on dark is not the same
       figure as dark text on light. */
    const darkOnLight = assessSandboxTarget(
      "wcag3",
      "body",
      hexes({ body: "#333333", background: "#e8e8e8" }),
      WHITE,
    )[0];
    const lightOnDark = assessSandboxTarget(
      "wcag3",
      "body",
      hexes({ body: "#e8e8e8", background: "#333333" }),
      WHITE,
    )[0];

    expect(darkOnLight?.value).not.toBe(lightOnDark?.value);
  });
});

describe("pressedSandboxTarget", () => {
  const pointer = { isDeepModifier: false, isTouch: false };
  const touch = { isDeepModifier: false, isTouch: true };

  it("takes the fill first, and the text with a modifier", () => {
    expect(
      pressedSandboxTarget(null, "buttonFill", "buttonText", pointer),
    ).toBe("buttonFill");
    expect(
      pressedSandboxTarget("buttonFill", "buttonFill", "buttonText", pointer),
    ).toBe("buttonFill");
    expect(
      pressedSandboxTarget(null, "buttonFill", "buttonText", {
        ...pointer,
        isDeepModifier: true,
      }),
    ).toBe("buttonText");
  });

  it("cycles fill, text, fill on a touch screen", () => {
    expect(
      pressedSandboxTarget("body", "buttonFill", "buttonText", touch),
    ).toBe("buttonFill");
    expect(
      pressedSandboxTarget("buttonFill", "buttonFill", "buttonText", touch),
    ).toBe("buttonText");
    expect(
      pressedSandboxTarget("buttonText", "buttonFill", "buttonText", touch),
    ).toBe("buttonFill");
  });

  it("selects a layer with no text inside as itself, however it is pressed", () => {
    expect(pressedSandboxTarget("heading", "heading", undefined, touch)).toBe(
      "heading",
    );
    expect(
      pressedSandboxTarget(null, "heading", undefined, {
        isDeepModifier: true,
        isTouch: false,
      }),
    ).toBe("heading");
  });
});

describe("assessSandboxTarget: labels", () => {
  const grey = hexes({
    buttonText: "#777777",
    buttonFill: WHITE,
    badgeText: "#777777",
    badgeFill: WHITE,
    body: "#777777",
    background: WHITE,
  });

  it("holds a button's and a badge's text to Lc 60 in WCAG 3, where body text fails at Lc 71", () => {
    for (const target of [
      "buttonFill",
      "buttonText",
      "badgeFill",
      "badgeText",
    ] as const) {
      expect(
        assessSandboxTarget("wcag3", target, grey, WHITE)[0],
      ).toMatchObject({
        value: "Lc 71",
        grade: "Pass",
        passes: true,
      });
    }
    /* The same pair as body text still fails. */
    expect(assessSandboxTarget("wcag3", "body", grey, WHITE)[0]).toMatchObject({
      value: "Lc 71",
      passes: false,
    });
  });

  it("keeps a label at 4.5:1 in WCAG 2", () => {
    expect(
      assessSandboxTarget("wcag2", "buttonFill", grey, WHITE)[0],
    ).toMatchObject({
      grade: "Fail",
      passes: false,
    });
  });

  it("passes a fill whose Lc is shown as 45", () => {
    const rows = assessSandboxTarget(
      "wcag3",
      "buttonFill",
      hexes({ background: WHITE, buttonFill: "#acacac", buttonText: BLACK }),
      WHITE,
    );
    expect(rows.at(-1)).toMatchObject({
      label: "Fill on Page",
      value: "Lc 45",
      passes: true,
    });
  });
});
