import { describe, expect, it } from "vitest";
import { generatePalettes } from "./palette";
import {
  addSemanticToken,
  fillSeedRoles,
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
  it("seeds the sixty-five roles the page needs", () => {
    const tokens = seedSemanticTokens(fullPalette());
    expect(tokens).toHaveLength(65);
    expect(new Set(tokens.map((token) => token.id)).size).toBe(65);
  });

  /* The guard against the layer drifting away from the preview it came from.
     Both still choose a shade for the same roles, in two files, until
     stage 5 collapses them. If somebody moves one and not the other, this
     fails rather than the studio quietly showing two answers. */
  it.each([10, 13, 17, 20, 21])(
    "resolves every seeded role to a shade the palette holds, over %i shades",
    (count) => {
      /* This replaces a cross-check against `selectPreviewShades`, which held
         its own copy of these roles behind a test asserting the two agreed.
         There is one list now, so the thing worth checking is that every role
         lands on a real shade at any ramp length — the rounding bug the old
         test was written for. */
      const tracks = fullPalette(ramp(count));
      const tokens = seedSemanticTokens(tracks);

      for (const token of tokens) {
        const resolved = resolveSemantic(token, "light", tracks)!;
        const track = tracks.find((each) => each.id === resolved.trackId)!;
        expect(
          track.shades.some((shade) => shade.weight === resolved.weight),
          `${token.id} at ${count} shades`,
        ).toBe(true);
        expect(resolved.missing, token.id).toBeNull();
      }
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

    expect(tokens).toHaveLength(65);
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

    const dark = tokenById(tokens, "fg.primary");
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

    const text = tokenById(tokens, "fg.primary");
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
    expect(resolveSemantics(tokens, "dark", tracks)).toHaveLength(65);
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

    expect(tokens).toHaveLength(66);
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

    expect(next).toHaveLength(64);
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
       twelve beside the ones it has, and the page draws from neither. */
    const migrated = migrateSemanticIds([
      oldToken("primary.action", "Primary action"),
      oldToken("neutral.dark", "Neutral dark"),
      oldToken("neutral.light", "Neutral light"),
    ]);

    expect(migrated.map((token) => token.id)).toEqual([
      "action.primary",
      "fg.primary",
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
      "action.primary-hover",
      "action.primary-active",
      "action.primary-surface",
      "action.primary-surface-hover",
      "action.primary-fg",
      "action.primary-border",
      "action.secondary",
      "action.muted",
      "action.neutral",
      "action.neutral-hover",
      "action.neutral-active",
      "action.neutral-surface",
      "action.neutral-surface-hover",
      "action.neutral-fg",
      "action.neutral-border",
      "surface.base",
      "surface.subtle",
      "surface.raised",
      "surface.overlay",
      "surface.skeleton",
      "surface.track",
      "border.default",
      "border.subtle",
      "border.muted",
      "border.strong",
      "fg.primary",
      "fg.secondary",
      "fg.disabled",
      "fg.accent",
      "fg.on-action",
      "fg.on-neutral",
      "fg.on-success",
      "fg.on-warning",
      "fg.on-error",
      "fg.on-info",
      "focus.ring",
      "status.success",
      "status.success-hover",
      "status.success-active",
      "status.success-surface",
      "status.success-surface-hover",
      "status.success-fg",
      "status.success-border",
      "status.warning",
      "status.warning-hover",
      "status.warning-active",
      "status.warning-surface",
      "status.warning-surface-hover",
      "status.warning-fg",
      "status.warning-border",
      "status.error",
      "status.error-hover",
      "status.error-active",
      "status.error-surface",
      "status.error-surface-hover",
      "status.error-fg",
      "status.error-border",
      "status.info",
      "status.info-hover",
      "status.info-active",
      "status.info-surface",
      "status.info-surface-hover",
      "status.info-fg",
      "status.info-border",
    ]);
  });
});

describe("the second rename", () => {
  const oldToken = (id: string, name: string): SemanticToken => ({
    id,
    name,
    description: "",
    light: { trackId: "t-neutral", weight: 950 },
    dark: { trackId: "t-neutral", weight: 50 },
  });

  it("moves text onto fg", () => {
    const migrated = migrateSemanticIds([
      oldToken("text.primary", "Text primary"),
      oldToken("text.secondary", "Text secondary"),
    ]);
    expect(migrated.map((token) => token.id)).toEqual([
      "fg.primary",
      "fg.secondary",
    ]);
    expect(migrated[0]!.name).toBe("Foreground primary");
    // A rename moves the name, never what it points at.
    expect(migrated[0]!.light).toEqual({ trackId: "t-neutral", weight: 950 });
  });

  it("follows a chain from the very first names in one read", () => {
    /* A layer saved under the ramp-position names has to cross two renames:
       neutral.dark → text.primary → fg.primary. Stopping after one would land
       a project on a name that no longer exists in the seed set. */
    const migrated = migrateSemanticIds([
      oldToken("neutral.dark", "Neutral dark"),
    ]);
    expect(migrated.map((token) => token.id)).toEqual(["fg.primary"]);
  });

  it("still refuses to land on a taken id", () => {
    const migrated = migrateSemanticIds([
      oldToken("fg.primary", "Mine"),
      oldToken("text.primary", "Text primary"),
    ]);
    expect(migrated.map((token) => token.id)).toEqual([
      "fg.primary",
      "text.primary",
    ]);
  });
});

describe("fillSeedRoles", () => {
  it("appends the seed roles a stored layer lacks, in seed order", () => {
    const stored = seedSemanticTokens(fullPalette()).filter(
      (token) => !token.id.startsWith("surface.") && token.id !== "fg.disabled",
    );
    const filled = fillSeedRoles(stored, fullPalette());

    const added = filled.slice(stored.length).map((token) => token.id);
    expect(added).toEqual([
      "surface.base",
      "surface.subtle",
      "surface.raised",
      "surface.overlay",
      "surface.skeleton",
      "surface.track",
      "fg.disabled",
    ]);
    // What the user had stays exactly where it was.
    expect(filled.slice(0, stored.length)).toEqual(stored);
  });

  it("carries a layer saved under the first nineteen names all the way", () => {
    /* The case every stored workspace is in, three times over. Nineteen roles
       shipped first; six came over from the studio's chrome; twelve more
       arrived when each status gained a surface, a foreground and a border;
       and the tone pattern added the rest. Two of the original nineteen were
       renamed on the way — a layer that did not migrate and fill on read would
       leave a client with a button drawing from names nothing defines. */
    const original = [
      "action.primary",
      "action.secondary",
      "action.hover",
      "action.active",
      "surface.base",
      "surface.subtle",
      "surface.raised",
      "surface.overlay",
      "border.default",
      "border.subtle",
      "border.muted",
      "fg.primary",
      "fg.secondary",
      "fg.disabled",
      "focus.ring",
      "status.success",
      "status.warning",
      "status.error",
      "status.info",
    ];
    const tracks = fullPalette();
    const stored = original.map((id) => ({
      id,
      name: id,
      description: "",
      light: { trackId: "t-primary", weight: 500 },
      dark: { trackId: "t-primary", weight: 450 },
    }));

    const migrated = migrateSemanticIds(stored);
    /* The rename: primary's two states were named for the group rather than
       for the tone, which stopped being true when a second tone arrived. */
    expect(migrated.map((token) => token.id)).toContain("action.primary-hover");
    expect(migrated.map((token) => token.id)).toContain(
      "action.primary-active",
    );
    expect(migrated.map((token) => token.id)).not.toContain("action.hover");
    /* And the reference the user had is carried, not reseeded. */
    expect(tokenById(migrated, "action.primary-hover").light.weight).toBe(500);

    const filled = fillSeedRoles(migrated, tracks);
    expect(filled).toHaveLength(65);

    /* The label on a fill is measured against that fill rather than declared,
       so it lands on whichever end of the neutral ramp reads on it. */
    const onAction = tokenById(filled, "fg.on-action");
    expect(onAction.light.trackId).toBe(
      tracks.find((track) => track.name === "neutral")!.id,
    );

    /* And a tone part sits on its own track: an alert's ground is the quietest
       shade of the colour it is warning in, not a grey. */
    const errorSurface = tokenById(filled, "status.error-surface");
    expect(errorSurface.light.weight).toBe(50);
    expect(errorSurface.dark.weight).toBe(950);
    expect(errorSurface.light.trackId).toBe(
      tracks.find((track) => track.name === "error")!.id,
    );
  });

  it("leaves a complete layer untouched, by identity", () => {
    const complete = seedSemanticTokens(fullPalette());
    expect(fillSeedRoles(complete, fullPalette())).toBe(complete);
  });

  it("leaves a deliberately empty layer empty", () => {
    expect(fillSeedRoles([], fullPalette())).toEqual([]);
  });

  it("is idempotent", () => {
    const once = fillSeedRoles(
      [seedSemanticTokens(fullPalette())[0]!],
      fullPalette(),
    );
    expect(fillSeedRoles(once, fullPalette())).toBe(once);
  });
});
