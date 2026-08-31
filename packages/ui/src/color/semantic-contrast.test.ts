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

    const text = checks.find((check) => check.foreground.id === "text.primary");
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
    tokens = repointSemanticToken(tokens, "text.primary", "dark", {
      trackId: "t-neutral",
      weight: 900,
    });

    const light = assessSemanticContrast(tokens, tracks, "light").find(
      (check) =>
        check.foreground.id === "text.primary" &&
        check.background.id === "surface.base",
    )!;
    const dark = assessSemanticContrast(tokens, tracks, "dark").find(
      (check) =>
        check.foreground.id === "text.primary" &&
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
        each.foreground.id === "text.primary" &&
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
        id: "text.primary",
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
