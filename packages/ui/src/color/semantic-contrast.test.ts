import { describe, expect, it } from "vitest";
import { generatePalettes } from "./palette";
import {
  repointSemanticToken,
  seedSemanticTokens,
  type SemanticToken,
} from "./semantic";
import {
  assessSemanticContrast,
  assessSemanticContrastReport,
  describeSemanticContrast,
} from "./semantic-contrast";
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

describe("assessSemanticContrast", () => {
  it("measures every foreground against every surface", () => {
    /* Every surface, not a chosen one: text that clears the page canvas can
       fail on a raised card, and measuring only the canvas would call that
       pair fine. */
    const tracks = palette();
    const tokens = seedSemanticTokens(tracks);
    const checks = assessSemanticContrast(tokens, tracks, "light");

    const surfaces = tokens.filter((token) => token.id.startsWith("surface."));
    const foregrounds = tokens.filter(
      (token) => !token.id.startsWith("surface."),
    );
    expect(checks).toHaveLength(surfaces.length * foregrounds.length);
    expect(surfaces.length).toBeGreaterThan(1);
  });

  it("holds text to the text threshold and everything else to the non-text one", () => {
    const tracks = palette();
    const checks = assessSemanticContrast(
      seedSemanticTokens(tracks),
      tracks,
      "light",
    );

    const text = checks.find((check) => check.foreground.id === "fg.primary");
    const border = checks.find(
      (check) => check.foreground.id === "border.default",
    );

    expect(text?.isText).toBe(true);
    expect(text?.text).not.toBeNull();
    expect(text?.nonText).toBeNull();

    expect(border?.isText).toBe(false);
    expect(border?.nonText).not.toBeNull();
    expect(border?.text).toBeNull();
  });

  it("names the primitives a pair resolved to", () => {
    /* "text.primary on surface.base fails" is not actionable on its own —
       somebody has to know which shades to go and change. */
    const tracks = palette();
    const check = assessSemanticContrast(
      seedSemanticTokens(tracks),
      tracks,
      "light",
    )[0]!;

    expect(check.foreground.trackName).toBeTruthy();
    expect(check.foreground.weight).toBeGreaterThan(0);
    expect(check.background.trackName).toBeTruthy();
  });

  it("measures dark against the dark references, not the light ones", () => {
    /* The reason both modes are reported. A token repointed for dark would
       otherwise be assumed to behave like its light counterpart. */
    const tracks = palette();
    let tokens = seedSemanticTokens(tracks);
    tokens = repointSemanticToken(tokens, "fg.primary", "dark", {
      trackId: "t-neutral",
      weight: 900,
    });

    const light = assessSemanticContrast(tokens, tracks, "light").find(
      (check) =>
        check.foreground.id === "fg.primary" &&
        check.background.id === "surface.base",
    )!;
    const dark = assessSemanticContrast(tokens, tracks, "dark").find(
      (check) =>
        check.foreground.id === "fg.primary" &&
        check.background.id === "surface.base",
    )!;

    expect(dark.foreground.weight).toBe(900);
    expect(dark.ratio).not.toBe(light.ratio);
  });

  it("catches a pair that fails", () => {
    /* Dark text on a dark surface. Without this the pass counts prove only
       that the seeded layer happens to be fine. */
    const tracks = palette();
    let tokens = seedSemanticTokens(tracks);
    tokens = repointSemanticToken(tokens, "surface.base", "light", {
      trackId: "t-neutral",
      weight: 900,
    });

    const check = assessSemanticContrast(tokens, tracks, "light").find(
      (each) =>
        each.foreground.id === "fg.primary" &&
        each.background.id === "surface.base",
    )!;

    expect(check.passes).toBe(false);
    expect(check.ratio).toBeLessThan(4.5);
  });

  it("reports nothing when a layer has no surface", () => {
    /* The rule follows a convention, and says so by going quiet rather than
       guessing which token is a background. */
    const tracks = palette();
    const tokens: SemanticToken[] = [
      {
        id: "fg.primary",
        name: "Text primary",
        description: "",
        light: { trackId: "t-neutral", weight: 950 },
        dark: { trackId: "t-neutral", weight: 25 },
      },
    ];
    expect(assessSemanticContrast(tokens, tracks, "light")).toEqual([]);
  });
});

describe("assessSemanticContrastReport", () => {
  it("carries both modes and counts failures across them", () => {
    const tracks = palette();
    const tokens = seedSemanticTokens(tracks);
    const report = assessSemanticContrastReport(tokens, tracks);

    expect(report.light.every((check) => check.mode === "light")).toBe(true);
    expect(report.dark.every((check) => check.mode === "dark")).toBe(true);
    expect(report.failureCount).toBe(
      [...report.light, ...report.dark].filter((check) => !check.passes).length,
    );
  });

  it("is empty for an empty layer", () => {
    const report = assessSemanticContrastReport([], palette());
    expect(report.light).toEqual([]);
    expect(report.dark).toEqual([]);
    expect(report.failureCount).toBe(0);
  });
});

describe("a transparent token is composited before it is measured", () => {
  /**
   * `fg.primary` at 50%, and the two surfaces it will be measured on.
   *
   * A foreground rather than a surface, because a foreground is measured
   * against every surface — which is exactly the fact under test: one token,
   * two grounds, two colours.
   */
  function halfLit(tracks: ColorTrack[]): {
    tokens: SemanticToken[];
    surfaces: string[];
  } {
    const seeded = seedSemanticTokens(tracks);
    const token = seeded.find((each) => each.id === "fg.primary")!;
    const tokens = seeded.map((each) =>
      each.id === "fg.primary"
        ? { ...each, light: { ...token.light, alpha: 0.5 } }
        : each,
    );
    return { tokens, surfaces: ["surface.base", "surface.raised"] };
  }

  it("gets a different colour, and a different verdict, on each surface", () => {
    /* The plan's rule, stated as a test: no contrast row may read an alpha
       colour's raw value. Measured raw, both rows would report the same ratio
       for the same token — which is how you can tell whether compositing is
       happening at all. */
    const tracks = palette();
    const { tokens, surfaces } = halfLit(tracks);
    const checks = assessSemanticContrast(tokens, tracks, "light");

    const rows = surfaces.map((surface) =>
      checks.find(
        (check) =>
          check.foreground.id === "fg.primary" &&
          check.background.id === surface,
      )!,
    );

    const [onBase, onRaised] = rows as [
      (typeof checks)[number],
      (typeof checks)[number],
    ];

    /* Two surfaces, two composited colours. */
    expect(onBase.backgroundHex).not.toBe(onRaised.backgroundHex);
    expect(onBase.foregroundHex).not.toBe(onRaised.foregroundHex);
    /* And neither is the token's own shade, which is what raw measurement
       would have used. */
    expect(onBase.foregroundHex).not.toBe(onBase.foreground.hex);
    expect(onRaised.foregroundHex).not.toBe(onRaised.foreground.hex);

    /* Two ratios, so a threshold between them gives two verdicts. */
    expect(onBase.ratio).not.toBeCloseTo(onRaised.ratio, 2);
  });

  it("names the composited colour and the surface it was laid on, in each row", () => {
    const tracks = palette();
    const { tokens, surfaces } = halfLit(tracks);
    const checks = assessSemanticContrast(tokens, tracks, "light");

    for (const surface of surfaces) {
      const check = checks.find(
        (each) =>
          each.foreground.id === "fg.primary" && each.background.id === surface,
      )!;
      const words = describeSemanticContrast(check);

      /* How much of it. */
      expect(words, surface).toContain("at 50%");
      /* What it was laid on — by name, so a reader can go and change it. */
      expect(words, surface).toContain(`over ${surface}`);
      /* And what came out, which is the colour the ratio belongs to — named
         as a colour that is not the token's own shade, or this assertion
         would agree with a row that never composited anything. */
      expect(words, surface).toContain(check.foregroundHex);
      expect(check.foregroundHex, surface).not.toBe(check.foreground.hex);
      expect(words, surface).not.toContain(check.foreground.hex);
      /* Both surfaces named: the one composited on, and the one measured
         against. They are the same surface here, and the row says so twice
         rather than leaving a reader to assume it. */
      expect(
        words.split(" on ").at(-1),
        `${surface} is not named as the background`,
      ).toContain(`${check.background.trackName} ${check.background.weight}`);
    }

    /* The two rows name different surfaces, which is the half a single row
       cannot show. */
    const [first, second] = surfaces.map((surface) =>
      describeSemanticContrast(
        checks.find(
          (each) =>
            each.foreground.id === "fg.primary" &&
            each.background.id === surface,
        )!,
      )!,
    );
    expect(first).not.toBe(second);
  });

  it("says exactly what it always said when the layer is opaque", () => {
    /* The other half of the rule. Sixty-odd opaque roles must produce the
       report they produced before alpha existed, or every generated file in
       the repository moves for no reason. */
    const tracks = palette();
    const tokens = seedSemanticTokens(tracks).map((token) => ({
      ...token,
      light: { ...token.light, alpha: undefined },
      dark: { ...token.dark, alpha: undefined },
    }));

    for (const check of assessSemanticContrast(tokens, tracks, "light")) {
      expect(check.isComposited).toBe(false);
      expect(check.foregroundHex).toBe(check.foreground.hex);
      expect(check.backgroundHex).toBe(check.background.hex);
      expect(describeSemanticContrast(check)).toBe(
        `${check.foreground.trackName} ${check.foreground.weight} on ${check.background.trackName} ${check.background.weight}`,
      );
    }
  });

  it("lays a transparent surface on the page ground first", () => {
    /* A surface can be transparent too — a scrim, an overlay — and what is
       behind it is the canvas. Measuring the foreground against the scrim's
       raw shade would describe a page with nothing under the overlay. */
    const tracks = palette();
    const seeded = seedSemanticTokens(tracks);
    const raised = seeded.find((each) => each.id === "surface.raised")!;
    const tokens = seeded.map((each) =>
      each.id === "surface.raised"
        ? { ...each, light: { ...raised.light, alpha: 0.4 } }
        : each,
    );

    const check = assessSemanticContrast(tokens, tracks, "light").find(
      (each) =>
        each.foreground.id === "fg.primary" &&
        each.background.id === "surface.raised",
    )!;

    expect(check.backgroundOver?.id).toBe("surface.base");
    expect(check.backgroundHex).not.toBe(check.background.hex);
    expect(describeSemanticContrast(check)).toContain("over surface.base");
  });
});
