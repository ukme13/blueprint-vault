import { describe, expect, it } from "vitest";
import { toneWeights, type ContrastProfile } from "./contrast-profiles";
import { generatePalettes } from "./palette";
import {
  addToneFamily,
  generateToneFamily,
  seedSemanticTokens,
  syncTonesWithAnchors,
  toneFamilyContrast,
  toneFamilyIds,
  type SemanticToken,
} from "./semantic";
import type { ColorTrack } from "./types";

const LIGHTNESS = [
  97.5, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50, 45, 40, 35, 30, 25, 20, 15, 10,
  5,
];

function palette(): ColorTrack[] {
  return generatePalettes({
    tracks: [
      { id: "primary", name: "primary", seedHex: "#7646ab" },
      { id: "secondary", name: "secondary", seedHex: "#1f7a8c" },
      { id: "neutral", name: "neutral", seedHex: "#737373" },
      { id: "success", name: "success", seedHex: "#2f7d32" },
      { id: "warning", name: "warning", seedHex: "#b87503" },
      { id: "error", name: "error", seedHex: "#b02b1b" },
      { id: "info", name: "info", seedHex: "#2878b8" },
    ],
    lightnessValues: LIGHTNESS,
  });
}

/** The palette with a track's locked source moved to `weight`. */
function withSource(
  tracks: ColorTrack[],
  trackId: string,
  weight: number,
): ColorTrack[] {
  return tracks.map((track) =>
    track.id !== trackId
      ? track
      : {
          ...track,
          shades: track.shades.map((shade) => ({
            ...shade,
            anchorType:
              shade.weight === weight
                ? "source"
                : shade.anchorType === "source"
                  ? null
                  : shade.anchorType,
          })),
        },
  );
}

/** Every track's source at 500: the layer before sources were followed. */
function sourcesAt500(tracks: ColorTrack[]): ColorTrack[] {
  return tracks.reduce(
    (next, track) => withSource(next, track.id, 500),
    tracks,
  );
}

function token(tokens: SemanticToken[], id: string): SemanticToken {
  const found = tokens.find((each) => each.id === id);
  if (!found) throw new Error(`no ${id}`);
  return found;
}

const weights = (tokens: SemanticToken[], id: string) => [
  token(tokens, id).light.weight,
  token(tokens, id).dark.weight,
];

describe("toneWeights", () => {
  const track = palette()[0]!;

  it("steps a standard tone as the layer always has", () => {
    expect(toneWeights(track, 500, -50, "standard")).toEqual({
      fill: [500, 450],
      hover: [550, 400],
      active: [600, 350],
      border: [450, 450],
    });
  });

  it("steps a high-contrast tone further, with a firmer edge", () => {
    expect(toneWeights(track, 500, -50, "high-contrast")).toEqual({
      fill: [500, 450],
      hover: [600, 350],
      active: [650, 300],
      border: [500, 500],
    });
  });

  it("keeps a subtle tone's hover and active apart on a 50-step ramp", () => {
    /* +25 and +50 both round to 550 on a track with no 525; a pressed state
       that looks like the hovered one is no state at all. */
    const subtle = toneWeights(track, 500, -50, "subtle");
    expect(subtle.hover[0]).toBe(550);
    expect(subtle.active[0]).toBeGreaterThan(subtle.hover[0]);
    expect(subtle.hover[1]).toBe(400);
    expect(subtle.active[1]).toBeLessThan(subtle.hover[1]);
    expect(subtle.border).toEqual([350, 350]);
  });

  it("turns round at the end of the ramp rather than repeating the fill", () => {
    const dark = toneWeights(track, 950, -50, "standard");
    expect(dark.fill[0]).toBe(950);
    expect(dark.hover[0]).not.toBe(950);
    expect(dark.active[0]).not.toBe(dark.hover[0]);
  });

  it("keeps a pale tone's dark fill a step darker", () => {
    expect(toneWeights(track, 450, 50, "standard").fill).toEqual([450, 500]);
  });
});

describe("seedSemanticTokens and the locked source", () => {
  it("seeds exactly the old layer when every source sits at 500", () => {
    const tokens = seedSemanticTokens(sourcesAt500(palette()));
    expect(weights(tokens, "action.primary")).toEqual([500, 450]);
    expect(weights(tokens, "action.primary-hover")).toEqual([550, 400]);
    expect(weights(tokens, "action.primary-active")).toEqual([600, 350]);
    expect(weights(tokens, "action.secondary")).toEqual([500, 450]);
    expect(weights(tokens, "action.primary-border")).toEqual([450, 450]);
    expect(token(tokens, "action.primary-surface").light.alpha).toBe(0.12);
    expect(token(tokens, "action.primary-surface").dark.alpha).toBe(0.16);
  });

  it("fills a tone with its track's locked source shade", () => {
    const tracks = withSource(
      withSource(palette(), "primary", 300),
      "secondary",
      700,
    );
    const tokens = seedSemanticTokens(tracks);

    expect(weights(tokens, "action.primary")).toEqual([300, 250]);
    expect(weights(tokens, "action.primary-hover")).toEqual([350, 200]);
    expect(weights(tokens, "action.primary-active")).toEqual([400, 150]);
    expect(weights(tokens, "action.secondary")).toEqual([700, 650]);
    expect(weights(tokens, "action.secondary-hover")).toEqual([750, 600]);
  });

  it("follows the source for the statuses too", () => {
    const tokens = seedSemanticTokens(withSource(palette(), "error", 650));
    expect(weights(tokens, "status.error")).toEqual([650, 600]);
  });

  it("leaves the neutral action on black and white", () => {
    const tokens = seedSemanticTokens(withSource(palette(), "neutral", 300));
    expect(weights(tokens, "action.neutral")).toEqual([950, 50]);
  });

  it("falls back to the declared fill for a secondary tone with no track", () => {
    /* The chain lands on neutral for a missing secondary, and neutral's
       brand colour is not this tone's. */
    const tracks = withSource(
      palette().filter((track) => track.id !== "secondary"),
      "neutral",
      300,
    );
    const tokens = seedSemanticTokens(tracks);
    expect(token(tokens, "action.secondary").light.trackId).toBe("secondary");
    expect(weights(tokens, "action.secondary")).toEqual([500, 450]);
  });

  it("takes each profile's surface alphas and edge", () => {
    const expected: Record<ContrastProfile, [number, number, number]> = {
      standard: [0.12, 0.16, 450],
      "high-contrast": [0.2, 0.24, 500],
      subtle: [0.08, 0.1, 350],
    };
    for (const [profile, [light, dark, border]] of Object.entries(expected)) {
      const tokens = seedSemanticTokens(palette(), profile as ContrastProfile);
      const surface = token(tokens, "status.info-surface");
      expect([surface.light.alpha, surface.dark.alpha], profile).toEqual([
        light,
        dark,
      ]);
      expect(token(tokens, "status.info-border").light.weight, profile).toBe(
        border,
      );
    }
  });

  it("keeps the layer's ids and order whatever the profile", () => {
    const ids = (profile: ContrastProfile) =>
      seedSemanticTokens(palette(), profile).map((each) => each.id);
    expect(ids("high-contrast")).toEqual(ids("standard"));
    expect(ids("subtle")).toEqual(ids("standard"));
  });
});

describe("generateToneFamily", () => {
  it("names eight tokens for a bare name, grouped with the actions", () => {
    const family = generateToneFamily(palette(), {
      name: "Accent",
      trackId: "info",
    });
    expect(family.map((each) => each.id)).toEqual([
      "action.accent",
      "action.accent-hover",
      "action.accent-active",
      "action.accent-surface",
      "action.accent-surface-hover",
      "action.accent-fg",
      "action.accent-border",
      "fg.on-accent",
    ]);
    expect(family[0]!.name).toBe("Accent");
  });

  it("keeps a group somebody typed", () => {
    expect(toneFamilyIds("status.promo").fill).toBe("status.promo");
    expect(toneFamilyIds("status.promo").onFill).toBe("fg.on-promo");
  });

  it("points at the chosen track, from its locked source", () => {
    const tracks = withSource(palette(), "info", 350);
    const family = generateToneFamily(tracks, {
      name: "accent",
      trackId: "info",
    });
    expect(family[0]!.light).toEqual({ trackId: "info", weight: 350 });
    expect(family[0]!.dark).toEqual({ trackId: "info", weight: 300 });
    /* The label is on neutral, measured against the fill. */
    expect(family.at(-1)!.light.trackId).toBe("neutral");
  });

  it("takes a base weight over the source", () => {
    const family = generateToneFamily(palette(), {
      name: "accent",
      trackId: "info",
      baseWeight: 700,
    });
    expect(weights(family, "action.accent")).toEqual([700, 650]);
    expect(weights(family, "action.accent-hover")).toEqual([750, 600]);
  });

  it("builds the same family a seeded tone gets", () => {
    const tracks = palette();
    const seeded = seedSemanticTokens(tracks);
    const family = generateToneFamily(tracks, {
      name: "action.primary",
      trackId: "primary",
    });
    for (const suffix of ["", "-hover", "-active", "-surface", "-border"]) {
      const id = `action.primary${suffix}`;
      expect(token(family, id).light, id).toEqual(token(seeded, id).light);
      expect(token(family, id).dark, id).toEqual(token(seeded, id).dark);
    }
  });

  it("is empty for a track the palette has not got", () => {
    expect(
      generateToneFamily(palette(), { name: "accent", trackId: "gone" }),
    ).toEqual([]);
  });
});

describe("addToneFamily", () => {
  it("appends the family in one go", () => {
    const tracks = palette();
    const layer = seedSemanticTokens(tracks);
    const family = generateToneFamily(tracks, {
      name: "accent",
      trackId: "info",
    });
    const { layer: next, clashes } = addToneFamily(layer, family);
    expect(clashes).toEqual([]);
    expect(next).toEqual([...layer, ...family]);
  });

  it("refuses the whole family when any id is taken", () => {
    const tracks = palette();
    const layer = seedSemanticTokens(tracks);
    const family = generateToneFamily(tracks, {
      name: "action.primary",
      trackId: "info",
    });
    const { layer: next, clashes } = addToneFamily(layer, family);
    expect(next).toBe(layer);
    expect(clashes).toContain("action.primary");
    expect(clashes).toContain("action.primary-hover");
    /* The seeded primary's label is fg.on-action, so this one is free. */
    expect(clashes).not.toContain("fg.on-primary");
  });
});

describe("syncTonesWithAnchors", () => {
  it("re-aims the seeded tones at the palette's sources", () => {
    const before = seedSemanticTokens(sourcesAt500(palette()));
    const moved = withSource(palette(), "primary", 300);
    const { layer, changed } = syncTonesWithAnchors(before, moved);

    expect(weights(layer, "action.primary")).toEqual([300, 250]);
    expect(changed).toContain("action.primary");
    expect(changed).toContain("action.primary-hover");
    /* Not a tone: left as it was. */
    expect(token(layer, "surface.base")).toEqual(token(before, "surface.base"));
  });

  it("keeps names, descriptions, removals and added tones", () => {
    const tracks = withSource(palette(), "primary", 300);
    const renamed = seedSemanticTokens(sourcesAt500(palette()))
      .filter((each) => each.id !== "status.info-border")
      .map((each) =>
        each.id === "action.primary" ? { ...each, name: "Brand" } : each,
      );
    const accent = generateToneFamily(tracks, {
      name: "accent",
      trackId: "info",
      baseWeight: 800,
    });
    const { layer } = syncTonesWithAnchors([...renamed, ...accent], tracks);

    expect(token(layer, "action.primary").name).toBe("Brand");
    expect(layer.some((each) => each.id === "status.info-border")).toBe(false);
    expect(weights(layer, "action.accent")).toEqual([800, 750]);
  });

  it("changes nothing, and says so, when the layer already matches", () => {
    const tracks = palette();
    const layer = seedSemanticTokens(tracks);
    const synced = syncTonesWithAnchors(layer, tracks);
    expect(synced.changed).toEqual([]);
    expect(synced.layer).toBe(layer);
  });

  it("applies the chosen profile", () => {
    const tracks = palette();
    const { layer } = syncTonesWithAnchors(
      seedSemanticTokens(tracks),
      tracks,
      "high-contrast",
    );
    expect(token(layer, "status.info-border").light.weight).toBe(500);
  });
});

describe("toneFamilyContrast", () => {
  it("measures the label on the fill against the profile's target", () => {
    const tracks = palette();
    const family = generateToneFamily(tracks, {
      name: "accent",
      trackId: "info",
    });
    const report = toneFamilyContrast(family, tracks, "high-contrast");
    expect(report.target).toBe(7);
    expect(report.light).toBeGreaterThan(1);
    expect(report.dark).toBeGreaterThan(1);
  });
});
