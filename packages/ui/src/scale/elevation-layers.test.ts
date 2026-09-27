import { describe, expect, it } from "vitest";
import { generatePalettes } from "../color/palette";
import type { ColorTrack } from "../color/types";
import { cloneScaleSnapshot } from "../workspace/scale-history";
import {
  defaultElevationScale,
  normalizeElevationScale,
  resolveElevation,
  type ElevationScale,
  type ShadowLayer,
} from "./elevation";
import {
  DEFAULT_SHADOW_LAYER,
  elevationLevelColour,
  setElevationLevelColour,
  addShadowLayer,
  isSimpleElevationLevel,
  removeShadowLayer,
  resolveElevationColour,
  shadowLayerIconShadow,
  shadowLayerSummary,
  shadowLayerTypeLabel,
  toggleShadowLayerVisibility,
  updateShadowLayer,
} from "./elevation-edit";
import {
  ELEVATION_PRESETS,
  applyElevationPreset,
  elevationPresetCss,
  elevationPresetLayers,
  matchingElevationPreset,
} from "./elevation-presets";
import { defaultRadiusScale } from "./radius";
import { elevationRows } from "./scale-rows";
import { formatScaleCss, scaleDesignTokenGroups } from "./scale-export";
import { defaultSpacingScale } from "./spacing";

function palette(): ColorTrack[] {
  return generatePalettes({
    tracks: [
      { id: "t-primary", name: "primary", seedHex: "#7646ab" },
      { id: "neutral", name: "neutral", seedHex: "#737373" },
    ],
    lightnessValues: [97.5, 80, 60, 40, 20, 5],
  });
}

const shadow: ShadowLayer = {
  offsetXPx: 0,
  offsetYPx: 2,
  blurPx: 4,
  spreadPx: 0,
  opacity: { light: 0.1, dark: 0.4 },
};

/** A scale whose `low` level holds exactly the layers given. */
function scaleWith(...layers: ShadowLayer[]): ElevationScale {
  const scale = defaultElevationScale();
  return {
    ...scale,
    levels: scale.levels.map((level) =>
      level.id === "low" ? { ...level, layers } : level,
    ),
  };
}

function low(scale: ElevationScale, mode: "light" | "dark" = "light") {
  return resolveElevation(scale, palette(), mode).find(
    (level) => level.id === "low",
  )!;
}

function lowLayers(scale: ElevationScale): ShadowLayer[] {
  return scale.levels.find((level) => level.id === "low")!.layers;
}

describe("an inner shadow", () => {
  it("is written with `inset` in front", () => {
    const css = low(scaleWith({ ...shadow, type: "inner" })).css;
    expect(css).toMatch(/^inset 0px 2px 4px 0px rgba\(/);
  });

  it("sits beside a drop shadow in one stack, each written as itself", () => {
    const css = low(scaleWith(shadow, { ...shadow, type: "inner" })).css;
    // Layers are split where one rgba() ends, not on the commas inside it.
    const [first, second] = css.split(/(?<=\)),\s/);
    expect(first).toMatch(/^0px 2px/);
    expect(second).toMatch(/^inset 0px 2px/);
  });

  it("carries `inset: true` into Design Tokens, and a drop shadow does not", () => {
    const elevation = scaleWith(shadow, { ...shadow, type: "inner" });
    const groups = scaleDesignTokenGroups({
      spacing: defaultSpacingScale(),
      radius: defaultRadiusScale(),
      elevation,
      palettes: palette(),
    }) as {
      shadow: { light: Record<string, { $value: Record<string, unknown>[] }> };
    };
    const [drop, inner] = groups.shadow.light.low!.$value;
    expect(drop).not.toHaveProperty("inset");
    expect(inner).toMatchObject({ inset: true });
  });

  it("reaches the exported variables", () => {
    const elevation = scaleWith({ ...shadow, type: "inner" });
    const variables = formatScaleCss({
      spacing: defaultSpacingScale(),
      radius: defaultRadiusScale(),
      elevation,
      palettes: palette(),
    });
    expect(variables).toContain("--shadow-low: inset 0px 2px 4px 0px");
  });
});

describe("a hidden layer", () => {
  it("is left out of the shadow", () => {
    const css = low(
      scaleWith(shadow, { ...shadow, blurPx: 20, hidden: true }),
    ).css;
    expect(css).not.toContain("20px");
    expect(css.split("rgba")).toHaveLength(2);
  });

  it("leaves `none` when every layer is hidden", () => {
    expect(low(scaleWith({ ...shadow, hidden: true })).css).toBe("none");
  });

  it("is not counted among the layers a row reports", () => {
    const rows = elevationRows(
      scaleWith(shadow, { ...shadow, hidden: true }),
      palette(),
    );
    expect(rows.rows.find((row) => row.id === "low")!.layerCount).toBe(1);
  });
});

describe("a layer's own colour", () => {
  it("draws that layer in its shade and the rest in the scale's", () => {
    const tracks = palette();
    const primary = tracks.find((track) => track.id === "t-primary")!;
    const shade = primary.shades[2]!;
    const layers = low(
      scaleWith(shadow, {
        ...shadow,
        colour: { trackId: primary.id, weight: shade.weight },
      }),
    ).layers;
    const hex = `#${layers[1]!.rgb.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
    expect(hex).toBe(shade.hex.toLowerCase());
    expect(layers[0]!.rgb).not.toEqual(layers[1]!.rgb);
  });

  it("does not move the scale's colour, even on the first layer", () => {
    /* The swatch and the scale rows used to read the colour off the first
       layer of the first level. */
    const tracks = palette();
    const plain = resolveElevationColour(defaultElevationScale(), tracks);
    const tinted = scaleWith({
      ...shadow,
      colour: { trackId: "t-primary", weight: tracks[0]!.shades[0]!.weight },
    });
    expect(resolveElevationColour(tinted, tracks).hex).toBe(plain.hex);
    expect(elevationRows(tinted, tracks).colour.hex).toBe(plain.hex);
  });

  it("is copied, not shared, by a history snapshot", () => {
    const elevation = scaleWith({
      ...shadow,
      colour: { trackId: "t-primary", weight: 500 },
    });
    const snapshot = cloneScaleSnapshot({
      spacing: defaultSpacingScale(),
      radius: defaultRadiusScale(),
      elevation,
      layout: [],
    });
    expect(lowLayers(snapshot.elevation)[0]!.colour).toEqual(
      lowLayers(elevation)[0]!.colour,
    );
    expect(lowLayers(snapshot.elevation)[0]!.colour).not.toBe(
      lowLayers(elevation)[0]!.colour,
    );
  });
});

describe("a scale saved before layers had a type", () => {
  it("reads back exactly as it was", () => {
    const saved = JSON.parse(JSON.stringify(defaultElevationScale()));
    expect(normalizeElevationScale(saved)).toEqual(defaultElevationScale());
  });

  it("draws drop shadows, with no `inset` anywhere", () => {
    for (const level of resolveElevation(
      defaultElevationScale(),
      palette(),
      "light",
    )) {
      expect(level.css).not.toContain("inset");
      expect(level.layers.every((layer) => !layer.inset)).toBe(true);
    }
  });
});

describe("normalizeElevationScale, for the new fields", () => {
  it("keeps an inner type, a hidden flag and a layer colour", () => {
    const saved = scaleWith({
      ...shadow,
      type: "inner",
      hidden: true,
      colour: { trackId: "t-primary", weight: 500 },
    });
    expect(lowLayers(normalizeElevationScale(saved))[0]).toEqual({
      ...shadow,
      type: "inner",
      hidden: true,
      colour: { trackId: "t-primary", weight: 500 },
    });
  });

  it("drops what is not one of them", () => {
    const saved = scaleWith({
      ...shadow,
      type: "outer" as never,
      hidden: "yes" as never,
      colour: { trackId: "", weight: 500 },
    });
    expect(lowLayers(normalizeElevationScale(saved))[0]).toEqual(shadow);
  });
});

describe("addShadowLayer", () => {
  it("appends a plain drop shadow to the level", () => {
    const next = addShadowLayer(scaleWith(shadow), "low");
    expect(lowLayers(next)).toEqual([shadow, DEFAULT_SHADOW_LAYER]);
  });

  it("adds a copy, so editing one level cannot reach another", () => {
    const once = addShadowLayer(scaleWith(), "low");
    const twice = addShadowLayer(once, "low");
    expect(lowLayers(twice)[0]!.opacity).not.toBe(lowLayers(twice)[1]!.opacity);
    expect(lowLayers(twice)[0]!.opacity).not.toBe(DEFAULT_SHADOW_LAYER.opacity);
  });

  it("leaves an unknown level alone", () => {
    const scale = scaleWith(shadow);
    expect(addShadowLayer(scale, "missing")).toBe(scale);
  });
});

describe("removeShadowLayer", () => {
  it("removes the layer at the index and keeps the others in order", () => {
    const a = { ...shadow, blurPx: 1 };
    const b = { ...shadow, blurPx: 2 };
    const c = { ...shadow, blurPx: 3 };
    expect(lowLayers(removeShadowLayer(scaleWith(a, b, c), "low", 1))).toEqual([
      a,
      c,
    ]);
  });

  it("can take the last one, leaving `none`", () => {
    const next = removeShadowLayer(scaleWith(shadow), "low", 0);
    expect(low(next).css).toBe("none");
  });

  it("leaves the scale alone for an index past the end", () => {
    const scale = scaleWith(shadow);
    expect(removeShadowLayer(scale, "low", 3)).toBe(scale);
    expect(removeShadowLayer(scale, "low", -1)).toBe(scale);
  });
});

describe("toggleShadowLayerVisibility", () => {
  it("hides a layer and shows it again, keeping its values", () => {
    const hidden = toggleShadowLayerVisibility(scaleWith(shadow), "low", 0);
    expect(lowLayers(hidden)[0]).toEqual({ ...shadow, hidden: true });
    const shown = toggleShadowLayerVisibility(hidden, "low", 0);
    // Back to the saved shape: no `hidden: false` left behind.
    expect(lowLayers(shown)[0]).toEqual(shadow);
  });
});

describe("updateShadowLayer", () => {
  const update = (patch: Parameters<typeof updateShadowLayer>[3]) =>
    lowLayers(updateShadowLayer(scaleWith(shadow), "low", 0, patch))[0]!;

  it("changes the geometry it is given and nothing else", () => {
    expect(update({ offsetXPx: -3, spreadPx: -1 })).toEqual({
      ...shadow,
      offsetXPx: -3,
      spreadPx: -1,
    });
  });

  it("switches a layer to inner and back to a plain drop shadow", () => {
    expect(update({ type: "inner" }).type).toBe("inner");
    const back = lowLayers(
      updateShadowLayer(
        updateShadowLayer(scaleWith(shadow), "low", 0, { type: "inner" }),
        "low",
        0,
        { type: "drop" },
      ),
    )[0];
    expect(back).toEqual(shadow);
  });

  it("stops blur at 0, since CSS has no negative blur", () => {
    expect(update({ blurPx: -4 }).blurPx).toBe(0);
  });

  it("sets one mode's opacity and holds it to 0–1", () => {
    expect(update({ opacity: { dark: 0.9 } }).opacity).toEqual({
      light: 0.1,
      dark: 0.9,
    });
    expect(update({ opacity: { light: 4, dark: -1 } }).opacity).toEqual({
      light: 1,
      dark: 0,
    });
  });

  it("ignores a value that is not a finite number", () => {
    expect(update({ offsetYPx: Number.NaN, blurPx: Infinity })).toEqual(shadow);
  });

  it("sets a colour and clears it back to the scale's", () => {
    const coloured = updateShadowLayer(scaleWith(shadow), "low", 0, {
      colour: { trackId: "t-primary", weight: 500, alpha: 0.5 },
    });
    // The alpha is the layer's opacity's job, so the reference drops it.
    expect(lowLayers(coloured)[0]!.colour).toEqual({
      trackId: "t-primary",
      weight: 500,
    });
    const cleared = updateShadowLayer(coloured, "low", 0, { colour: null });
    expect(lowLayers(cleared)[0]).toEqual(shadow);
  });

  it("leaves the scale alone for an unknown level or layer", () => {
    const scale = scaleWith(shadow);
    expect(updateShadowLayer(scale, "missing", 0, { blurPx: 9 })).toBe(scale);
    expect(updateShadowLayer(scale, "low", 5, { blurPx: 9 })).toBe(scale);
  });
});

describe("isSimpleElevationLevel", () => {
  const level = (...layers: ShadowLayer[]) => lowLayers(scaleWith(...layers));
  const simple = (...layers: ShadowLayer[]) =>
    isSimpleElevationLevel({
      id: "low",
      name: "Low",
      description: "",
      layers: level(...layers),
    });

  it("is true for every seeded level", () => {
    for (const each of defaultElevationScale().levels) {
      expect(isSimpleElevationLevel(each)).toBe(true);
    }
  });

  it("is false for any shape the pads cannot describe", () => {
    expect(simple(shadow)).toBe(false);
    expect(simple(shadow, shadow, shadow)).toBe(false);
    expect(simple(shadow, { ...shadow, type: "inner" })).toBe(false);
    expect(simple(shadow, { ...shadow, hidden: true })).toBe(false);
    expect(
      simple(shadow, { ...shadow, colour: { trackId: "neutral", weight: 50 } }),
    ).toBe(false);
  });
});

describe("how the layer list names a layer", () => {
  it("names its type and sums up its geometry", () => {
    expect(shadowLayerTypeLabel(shadow)).toBe("Drop shadow");
    expect(shadowLayerTypeLabel({ type: "inner" })).toBe("Inner shadow");
    expect(shadowLayerSummary({ ...shadow, offsetXPx: -2 })).toBe(
      "X -2 · Y 2 · B 4 · S 0",
    );
  });
});

describe("elevation presets", () => {
  it("replaces one level's layers and keeps its name, id and description", () => {
    const scale = defaultElevationScale();
    const next = applyElevationPreset(scale, "med", "inset", palette());
    const before = scale.levels.find((level) => level.id === "med")!;
    const after = next.levels.find((level) => level.id === "med")!;
    expect(after).toMatchObject({
      id: before.id,
      name: before.name,
      description: before.description,
    });
    expect(after.layers.every((layer) => layer.type === "inner")).toBe(true);
    // The other levels are untouched.
    expect(next.levels.filter((level) => level.id !== "med")).toEqual(
      scale.levels.filter((level) => level.id !== "med"),
    );
  });

  it("keeps Standard and Subtle card to the shape the pads edit", () => {
    const scale = defaultElevationScale();
    for (const id of ["standard", "subtle-card"] as const) {
      const next = applyElevationPreset(scale, "low", id, palette());
      expect(isSimpleElevationLevel(next.levels[0]!)).toBe(true);
    }
  });

  it("lights Neumorphic's highlight with a shade the track really has", () => {
    /* A missing weight falls back to the darkest shade, which would turn the
       highlight into a second shadow. */
    const tracks = palette();
    const [, highlight] = elevationPresetLayers(
      "neumorphic",
      defaultElevationScale(),
      tracks,
    );
    const neutral = tracks.find((track) => track.id === "neutral")!;
    const lightest = Math.min(...neutral.shades.map((shade) => shade.weight));
    expect(highlight!.colour).toEqual({ trackId: "neutral", weight: lightest });
    expect(highlight!.offsetXPx).toBeLessThan(0);
  });

  it("draws Glow in a shade of the primary track", () => {
    const tracks = palette();
    const primary = tracks.find((track) => track.id === "t-primary")!;
    for (const layer of elevationPresetLayers(
      "glow",
      defaultElevationScale(),
      tracks,
    )) {
      expect(layer.colour?.trackId).toBe("t-primary");
      expect(
        primary.shades.some((shade) => shade.weight === layer.colour?.weight),
      ).toBe(true);
    }
  });

  it("still draws every preset without a palette", () => {
    for (const preset of ELEVATION_PRESETS) {
      const next = applyElevationPreset(
        defaultElevationScale(),
        "low",
        preset.id,
        [],
      );
      expect(
        resolveElevation(next, [], "light").find((l) => l.id === "low")!.css,
      ).not.toBe("none");
    }
  });

  it("leaves an unknown level alone", () => {
    const scale = defaultElevationScale();
    expect(applyElevationPreset(scale, "missing", "glow", palette())).toBe(
      scale,
    );
  });
});

describe("shadowLayerIconShadow", () => {
  const icon = (type: "drop" | "inner", offsetXPx: number, offsetYPx: number) =>
    shadowLayerIconShadow({ type, offsetXPx, offsetYPx });

  it("casts a hard copy in the layer's direction, in the text colour", () => {
    expect(icon("drop", 0, 4)).toBe("0px 2px 0 0 currentColor");
    expect(icon("drop", 3, 4)).toBe("2px 2px 0 0 currentColor");
    expect(icon("drop", -6, -6)).toBe("-2px -2px 0 0 currentColor");
  });

  it("keeps the direction only, so a long offset is no heavier", () => {
    expect(icon("drop", 0, 40)).toBe(icon("drop", 0, 1));
  });

  it("makes an inner layer's shadow inset, which CSS draws on the far side", () => {
    /* inset 0 2px: the shadow shows along the top inside edge. The sign is
       the layer's own; CSS puts it where it goes. */
    expect(icon("inner", 0, 4)).toBe("inset 0px 2px 0 0 currentColor");
  });

  it("spreads evenly at half strength when there is no offset", () => {
    expect(icon("drop", 0, 0)).toBe(
      "0 0 0 1px color-mix(in srgb, currentColor 50%, transparent)",
    );
    expect(icon("inner", 0, 0)).toMatch(/^inset 0 0 0 1px/);
  });

  it("writes a straight shadow's zero as 0px, never -0px", () => {
    expect(icon("drop", -0, 4)).toBe("0px 2px 0 0 currentColor");
  });

  it("reads a layer saved without a type as a drop shadow", () => {
    expect(shadowLayerIconShadow({ offsetXPx: 0, offsetYPx: 2 })).not.toMatch(
      /inset/,
    );
  });
});

describe("matchingElevationPreset", () => {
  const tracks = palette();

  it("names the preset a level was just set to", () => {
    for (const preset of ELEVATION_PRESETS) {
      const scale = applyElevationPreset(
        defaultElevationScale(),
        "low",
        preset.id,
        tracks,
      );
      expect(matchingElevationPreset(scale.levels[0]!, scale, tracks)).toBe(
        preset.id,
      );
    }
  });

  it("is null once any value moves, so the selector says Custom", () => {
    const scale = applyElevationPreset(
      defaultElevationScale(),
      "low",
      "standard",
      tracks,
    );
    const edited = updateShadowLayer(scale, "low", 1, {
      opacity: { light: 0.15 },
    });
    expect(
      matchingElevationPreset(edited.levels[0]!, edited, tracks),
    ).toBeNull();
  });

  it("is null for a hidden layer, which draws a different shadow", () => {
    const scale = applyElevationPreset(
      defaultElevationScale(),
      "low",
      "standard",
      tracks,
    );
    const hidden = toggleShadowLayerVisibility(scale, "low", 0);
    expect(
      matchingElevationPreset(hidden.levels[0]!, hidden, tracks),
    ).toBeNull();
  });
});

describe("elevationPresetCss", () => {
  const tracks = palette();

  it("is what applying the preset draws, per mode", () => {
    const scale = defaultElevationScale();
    for (const mode of ["light", "dark"] as const) {
      const applied = applyElevationPreset(scale, "med", "inset", tracks);
      const drawn = resolveElevation(applied, tracks, mode).find(
        (level) => level.id === "med",
      )!.css;
      expect(elevationPresetCss("inset", scale, tracks, mode)).toBe(drawn);
    }
  });

  it("draws Inset as inner shadows", () => {
    expect(
      elevationPresetCss("inset", defaultElevationScale(), tracks, "light"),
    ).toMatch(/^inset /);
  });
});

describe("a level's own colour", () => {
  const tracks = palette();
  const glow = () =>
    applyElevationPreset(defaultElevationScale(), "low", "glow", tracks);
  const primary = tracks.find((track) => track.id === "t-primary")!;

  it("is the shade Glow's layers share", () => {
    const scale = glow();
    const colour = elevationLevelColour(scale.levels[0]!);
    expect(colour?.trackId).toBe("t-primary");
    // The same shade the glow is drawn in, not the scale's black.
    expect(colour).toEqual(scale.levels[0]!.layers[0]!.colour);
  });

  it("is null for a level on the scale's colour, or one of mixed shades", () => {
    const scale = defaultElevationScale();
    expect(elevationLevelColour(scale.levels[0]!)).toBeNull();
    // Neumorphic: a shadow in the scale's colour and a highlight of its own.
    const neumorphic = applyElevationPreset(scale, "low", "neumorphic", tracks);
    expect(elevationLevelColour(neumorphic.levels[0]!)).toBeNull();
  });

  it("recolours that level only, and the glow draws in the new shade", () => {
    const shade = primary.shades[1]!;
    const next = setElevationLevelColour(glow(), "low", {
      trackId: primary.id,
      weight: shade.weight,
    });
    expect(elevationLevelColour(next.levels[0]!)?.weight).toBe(shade.weight);
    const drawn = resolveElevation(next, tracks, "light")[0]!.layers[0]!;
    const hex = `#${drawn.rgb.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
    expect(hex).toBe(shade.hex.toLowerCase());
    // Medium and High keep the scale's colour.
    expect(next.levels.slice(1)).toEqual(glow().levels.slice(1));
  });

  it("goes back to the scale's colour when cleared", () => {
    const cleared = setElevationLevelColour(glow(), "low", null);
    expect(elevationLevelColour(cleared.levels[0]!)).toBeNull();
    expect(
      cleared.levels[0]!.layers.every((layer) => !("colour" in layer)),
    ).toBe(true);
  });

  it("leaves a recoloured Glow a Glow, not Custom", () => {
    const next = setElevationLevelColour(glow(), "low", {
      trackId: "neutral",
      weight: 500,
    });
    expect(matchingElevationPreset(next.levels[0]!, next, tracks)).toBe("glow");
  });

  it("still makes Standard Custom once a layer takes a colour of its own", () => {
    const standard = applyElevationPreset(
      defaultElevationScale(),
      "low",
      "standard",
      tracks,
    );
    const tinted = setElevationLevelColour(standard, "low", {
      trackId: "t-primary",
      weight: 500,
    });
    expect(
      matchingElevationPreset(tinted.levels[0]!, tinted, tracks),
    ).toBeNull();
  });
});
