import { describe, expect, it } from "vitest";
import { generatePalettes } from "./palette";
import { selectPreviewShades } from "./preview-assessment";
import {
  addSemanticToken,
  migrateSemanticIds,
  removeSemanticToken,
  renameSemanticToken,
  repointSemanticToken,
  resolveSemantic,
  resolveSemantics,
  seedSemanticTokens,
  semanticId,
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

      sameAs("action.primary", preview.primaryAction.hex);
      sameAs("surface.raised", preview.primarySoft.hex);
      sameAs("focus.ring", preview.primaryFocus.hex);
      sameAs("action.secondary", preview.secondaryAction.hex);
      sameAs("surface.base", preview.neutralLight.hex);
      sameAs("border.default", preview.neutralMid.hex);
      sameAs("text.primary", preview.neutralDark.hex);
      sameAs("status.success", preview.successAction.hex);
      sameAs("status.warning", preview.warningAction.hex);
      sameAs("status.error", preview.errorAction.hex);
      sameAs("status.info", preview.infoAction.hex);
    },
  );

  it("takes weight 300 for the focus ring when the track has it", () => {
    const tokens = seedSemanticTokens(fullPalette());
    expect(tokenById(tokens, "focus.ring").light.weight).toBe(300);
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

    const dark = tokenById(tokens, "text.primary");
    const light = tokenById(tokens, "surface.base");

    const indexOf = (weight: number) =>
      neutral.shades.findIndex((shade) => shade.weight === weight);
    const last = neutral.shades.length - 1;

    expect(indexOf(dark.dark.weight)).toBe(last - indexOf(dark.light.weight));
    expect(indexOf(light.dark.weight)).toBe(last - indexOf(light.light.weight));
  });

  it("gives page text and page background opposite ends in each mode", () => {
    const tracks = fullPalette();
    const tokens = seedSemanticTokens(tracks);

    const text = tokenById(tokens, "text.primary");
    const background = tokenById(tokens, "surface.base");

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
    const token = tokenById(tokens, "action.primary");
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
    const token = tokenById(seedSemanticTokens(tracks), "status.success");
    const without = tracks.filter((track) => track.id !== "t-success");

    const resolved = resolveSemantic(token, "light", without)!;
    expect(resolved.missing).toBe("track");
    expect(resolved.hex).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("reports a weight that no longer exists and takes the nearest", () => {
    const tracks = fullPalette();
    const token: SemanticToken = {
      ...tokenById(seedSemanticTokens(tracks), "action.primary"),
      light: { trackId: "t-primary", weight: 999 },
    };

    const resolved = resolveSemantic(token, "light", tracks)!;
    expect(resolved.missing).toBe("weight");
    expect(resolved.weight).toBe(950);
  });

  it("returns null for an empty palette", () => {
    const token = tokenById(
      seedSemanticTokens(fullPalette()),
      "action.primary",
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

describe("editing a layer", () => {
  it("renames the id with the label, because the id is what ships", () => {
    const tokens = seedSemanticTokens(fullPalette());
    const renamed = renameSemanticToken(tokens, "action.primary", "Brand fill");

    const token = tokenById(renamed, "brand.fill");
    expect(token.name).toBe("Brand fill");
    /* The old id is gone: a rename that kept it would leave the label and the
       exported variable disagreeing. */
    expect(renamed.some((each) => each.id === "action.primary")).toBe(false);
  });

  it("refuses to let two tokens share an id", () => {
    const tokens = seedSemanticTokens(fullPalette());
    const renamed = renameSemanticToken(
      tokens,
      "surface.raised",
      "Action primary",
    );

    expect(
      renamed.filter((token) => token.id === "action.primary"),
    ).toHaveLength(1);
    expect(tokenById(renamed, "action.primary.2").name).toBe("Action primary");
  });

  it("keeps the id when the label is blank", () => {
    const tokens = seedSemanticTokens(fullPalette());
    const renamed = renameSemanticToken(tokens, "action.primary", "   ");
    expect(tokenById(renamed, "action.primary").name).toBe("Action primary");
  });

  it("leaves the layer alone when the token is not there", () => {
    const tokens = seedSemanticTokens(fullPalette());
    expect(renameSemanticToken(tokens, "nope", "Anything")).toBe(tokens);
  });

  it("repoints one mode and leaves the other", () => {
    const tracks = fullPalette();
    const tokens = seedSemanticTokens(tracks);
    const before = tokenById(tokens, "action.primary");

    const next = repointSemanticToken(tokens, "action.primary", "dark", {
      trackId: "t-info",
      weight: 200,
    });
    const after = tokenById(next, "action.primary");

    expect(after.dark).toEqual({ trackId: "t-info", weight: 200 });
    expect(after.light).toEqual(before.light);
  });

  it("adds a token that already points somewhere", () => {
    const tracks = fullPalette();
    const tokens = addSemanticToken(seedSemanticTokens(tracks), tracks, "Chip");

    expect(tokens).toHaveLength(12);
    const added = tokenById(tokens, "chip");
    expect(resolveSemantic(added, "light", tracks)!.hex).toMatch(
      /^#[0-9a-f]{6}$/i,
    );
    expect(resolveSemantic(added, "dark", tracks)!.hex).toMatch(
      /^#[0-9a-f]{6}$/i,
    );
  });

  it("gives a second token of the same name its own id", () => {
    const tracks = fullPalette();
    let tokens = addSemanticToken([], tracks, "Chip");
    tokens = addSemanticToken(tokens, tracks, "Chip");

    expect(tokens.map((token) => token.id)).toEqual(["chip", "chip.2"]);
  });

  it("adds nothing when there is no palette to point at", () => {
    expect(addSemanticToken([], [], "Chip")).toEqual([]);
  });

  it("removes a token", () => {
    const tokens = seedSemanticTokens(fullPalette());
    const next = removeSemanticToken(tokens, "status.info");

    expect(next).toHaveLength(10);
    expect(next.some((token) => token.id === "status.info")).toBe(false);
  });

  it("makes an id from a label", () => {
    expect(semanticId("Surface  Raised")).toBe("surface.raised");
    expect(semanticId("  Text / Primary  ")).toBe("text.primary");
    expect(semanticId("!!!")).toBe("");
  });
});

describe("the first names, carried forward", () => {
  const oldToken = (id: string, name: string): SemanticToken => ({
    id,
    name,
    description: "",
    light: { trackId: "t-primary", weight: 550 },
    dark: { trackId: "t-primary", weight: 400 },
  });

  it("renames a layer saved under the ramp-position names", () => {
    /* Without this a project made before the rename gains a second set of
       eleven beside the ones it has, and the page draws from neither. */
    const migrated = migrateSemanticIds([
      oldToken("primary.action", "Primary action"),
      oldToken("neutral.dark", "Neutral dark"),
      oldToken("neutral.light", "Neutral light"),
    ]);

    expect(migrated.map((token) => token.id)).toEqual([
      "action.primary",
      "text.primary",
      "surface.base",
    ]);
    expect(migrated[0]!.name).toBe("Action primary");
    // The reference is untouched: this renames names, not what they point at.
    expect(migrated[0]!.light).toEqual({ trackId: "t-primary", weight: 550 });
  });

  it("leaves a token somebody named themselves alone", () => {
    const mine = oldToken("brand.wash", "Brand wash");
    expect(migrateSemanticIds([mine])).toEqual([mine]);
  });

  it("will not rename onto an id already taken", () => {
    /* Two tokens sharing an id export one variable twice and the later one
       silently wins. Keeping the old id is the lesser harm, and visible. */
    const migrated = migrateSemanticIds([
      oldToken("action.primary", "Action primary"),
      oldToken("primary.action", "Primary action"),
    ]);

    expect(migrated.map((token) => token.id)).toEqual([
      "action.primary",
      "primary.action",
    ]);
  });

  it("is idempotent", () => {
    const once = migrateSemanticIds([oldToken("primary.soft", "Primary soft")]);
    expect(migrateSemanticIds(once)).toEqual(once);
  });

  it("seeds the usage-based names", () => {
    expect(seedSemanticTokens(fullPalette()).map((token) => token.id)).toEqual([
      "action.primary",
      "action.secondary",
      "surface.base",
      "surface.raised",
      "border.default",
      "text.primary",
      "focus.ring",
      "status.success",
      "status.warning",
      "status.error",
      "status.info",
    ]);
  });
});
