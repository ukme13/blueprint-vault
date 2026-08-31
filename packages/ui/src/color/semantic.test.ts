import { describe, expect, it } from "vitest";
import { generatePalettes } from "./palette";
import { selectPreviewShades } from "./preview-assessment";
import {
  resolveSemantic,
  resolveSemantics,
  seedSemanticTokens,
  type SemanticToken,
} from "./semantic";
import type { ColorTrack } from "./types";

const LIGHTNESS = [
  97.5, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50, 45, 40, 35, 30, 25, 20, 15, 10,
  5,
];

function palette(
  tracks: Array<{ id: string; name: string; seedHex: string }>,
  lightnessValues: number[] = LIGHTNESS,
) {
  return generatePalettes({ tracks, lightnessValues });
}

/** A descending lightness ramp of `count` steps, as the presets produce. */
function ramp(count: number): number[] {
  return Array.from(
    { length: count },
    (_, at) => 97.5 - (92.5 * at) / (count - 1),
  );
}

function fullPalette(lightnessValues: number[] = LIGHTNESS): ColorTrack[] {
  return palette(
    [
      { id: "t-primary", name: "primary", seedHex: "#7646ab" },
      { id: "t-secondary", name: "secondary", seedHex: "#4a6fa5" },
      { id: "t-neutral", name: "neutral", seedHex: "#737373" },
      { id: "t-success", name: "success", seedHex: "#2f7d32" },
      { id: "t-warning", name: "warning", seedHex: "#b87503" },
      { id: "t-error", name: "error", seedHex: "#b02b1b" },
      { id: "t-info", name: "info", seedHex: "#2878b8" },
    ],
    lightnessValues,
  );
}

function tokenById(tokens: SemanticToken[], id: string): SemanticToken {
  const found = tokens.find((token) => token.id === id);
  if (!found) throw new Error(`no token ${id}`);
  return found;
}

describe("seedSemanticTokens", () => {
  it("seeds the eleven roles already in use", () => {
    const tokens = seedSemanticTokens(fullPalette());
    expect(tokens).toHaveLength(11);
    expect(new Set(tokens.map((token) => token.id)).size).toBe(11);
  });

  /* The guard against the layer drifting away from the preview it came from.
     Both still choose a shade for the same eleven roles, in two files, until
     stage 5 collapses them. If somebody moves one and not the other, this
     fails rather than the studio quietly showing two answers. */
  it.each([10, 13, 17, 20, 21])(
    "agrees with the preview shades it was taken from, over %i shades",
    (count) => {
      /* Several shade counts, because a position that moves a little still
         rounds to the same index on a long ramp: checking one palette let a
         0.55 become a 0.5 unnoticed. */
      const tracks = fullPalette(ramp(count));
      const tokens = seedSemanticTokens(tracks);
      const preview = selectPreviewShades(tracks)!;

      const sameAs = (id: string, hex: string) => {
        const resolved = resolveSemantic(
          tokenById(tokens, id),
          "light",
          tracks,
        )!;
        expect(resolved.hex, id).toBe(hex);
      };

      sameAs("primary.action", preview.primaryAction.hex);
      sameAs("primary.soft", preview.primarySoft.hex);
      sameAs("primary.focus", preview.primaryFocus.hex);
      sameAs("secondary.action", preview.secondaryAction.hex);
      sameAs("neutral.light", preview.neutralLight.hex);
      sameAs("neutral.mid", preview.neutralMid.hex);
      sameAs("neutral.dark", preview.neutralDark.hex);
      sameAs("success.action", preview.successAction.hex);
      sameAs("warning.action", preview.warningAction.hex);
      sameAs("error.action", preview.errorAction.hex);
      sameAs("info.action", preview.infoAction.hex);
    },
  );

  it("takes weight 300 for the focus ring when the track has it", () => {
    const tokens = seedSemanticTokens(fullPalette());
    expect(tokenById(tokens, "primary.focus").light.weight).toBe(300);
  });

  it("falls back towards primary when a track is missing", () => {
    const tracks = palette([
      { id: "only", name: "primary", seedHex: "#7646ab" },
    ]);
    const tokens = seedSemanticTokens(tracks);

    expect(tokens).toHaveLength(11);
    for (const token of tokens) {
      expect(token.light.trackId).toBe("only");
    }
  });

  it("seeds nothing for an empty palette", () => {
    expect(seedSemanticTokens([])).toEqual([]);
  });
});

describe("the dark seed", () => {
  /* Mirroring the index, not the weight. The ramp runs 25, 50, 100 … 950, so
     1000 minus a weight lands on one no track has. */
  it("takes the shade as far from the dark end as light is from the light end", () => {
    const tracks = fullPalette();
    const tokens = seedSemanticTokens(tracks);
    const neutral = tracks.find((track) => track.id === "t-neutral")!;

    const dark = tokenById(tokens, "neutral.dark");
    const light = tokenById(tokens, "neutral.light");

    const indexOf = (weight: number) =>
      neutral.shades.findIndex((shade) => shade.weight === weight);
    const last = neutral.shades.length - 1;

    expect(indexOf(dark.dark.weight)).toBe(last - indexOf(dark.light.weight));
    expect(indexOf(light.dark.weight)).toBe(last - indexOf(light.light.weight));
  });

  it("gives page text and page background opposite ends in each mode", () => {
    const tracks = fullPalette();
    const tokens = seedSemanticTokens(tracks);

    const text = tokenById(tokens, "neutral.dark");
    const background = tokenById(tokens, "neutral.light");

    const lightText = resolveSemantic(text, "light", tracks)!;
    const lightBackground = resolveSemantic(background, "light", tracks)!;
    const darkText = resolveSemantic(text, "dark", tracks)!;
    const darkBackground = resolveSemantic(background, "dark", tracks)!;

    // Dark text on a light page, and the other way round once dark.
    expect(lightText.weight).toBeGreaterThan(lightBackground.weight);
    expect(darkText.weight).toBeLessThan(darkBackground.weight);
  });
});

describe("resolveSemantic", () => {
  /* The rule the whole layer rests on. A token that stored a value would pass
     every other test here and fail this one. */
  it("follows the primitive it points at, rather than copying it", () => {
    const before = fullPalette();
    const tokens = seedSemanticTokens(before);
    const token = tokenById(tokens, "primary.action");
    const wasHex = resolveSemantic(token, "light", before)!.hex;

    const after = palette([
      { id: "t-primary", name: "primary", seedHex: "#0b7a3d" },
      { id: "t-secondary", name: "secondary", seedHex: "#4a6fa5" },
      { id: "t-neutral", name: "neutral", seedHex: "#737373" },
      { id: "t-success", name: "success", seedHex: "#2f7d32" },
      { id: "t-warning", name: "warning", seedHex: "#b87503" },
      { id: "t-error", name: "error", seedHex: "#b02b1b" },
      { id: "t-info", name: "info", seedHex: "#2878b8" },
    ]);
    const nowHex = resolveSemantic(token, "light", after)!.hex;

    expect(nowHex).not.toBe(wasHex);
    expect(nowHex).toBe(
      after
        .find((track) => track.id === "t-primary")!
        .shades.find((shade) => shade.weight === token.light.weight)!.hex,
    );
  });

  it("reports a deleted track and still returns a colour", () => {
    const tracks = fullPalette();
    const token = tokenById(seedSemanticTokens(tracks), "success.action");
    const without = tracks.filter((track) => track.id !== "t-success");

    const resolved = resolveSemantic(token, "light", without)!;
    expect(resolved.missing).toBe("track");
    expect(resolved.hex).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("reports a weight that no longer exists and takes the nearest", () => {
    const tracks = fullPalette();
    const token: SemanticToken = {
      ...tokenById(seedSemanticTokens(tracks), "primary.action"),
      light: { trackId: "t-primary", weight: 999 },
    };

    const resolved = resolveSemantic(token, "light", tracks)!;
    expect(resolved.missing).toBe("weight");
    expect(resolved.weight).toBe(950);
  });

  it("returns null for an empty palette", () => {
    const token = tokenById(
      seedSemanticTokens(fullPalette()),
      "primary.action",
    );
    expect(resolveSemantic(token, "light", [])).toBeNull();
  });

  it("resolves every token in a mode", () => {
    const tracks = fullPalette();
    const tokens = seedSemanticTokens(tracks);
    expect(resolveSemantics(tokens, "dark", tracks)).toHaveLength(11);
    expect(resolveSemantics(tokens, "dark", [])).toEqual([]);
  });
});
