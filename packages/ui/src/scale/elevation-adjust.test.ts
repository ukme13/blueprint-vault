import { describe, expect, it } from "vitest";
import { generatePalettes } from "../color/palette";
import type { ColorTrack } from "../color/types";
import {
  defaultElevationScale,
  normalizeElevationScale,
  type ElevationScale,
} from "./elevation";
import {
  ELEVATION_ADJUSTMENTS,
  elevationAdjustmentStyle,
  readLevelAdjustmentValues,
  tuneElevationLevel,
  tuneGlowElevation,
  tuneInsetElevation,
  tuneNeumorphicElevation,
  tuneStandardElevation,
} from "./elevation-adjust";
import { addElevationLevel, updateShadowLayer } from "./elevation-edit";
import {
  applyElevationPreset,
  defaultAdjustmentValue,
  levelAdjustmentDefault,
  matchingElevationPreset,
  type ElevationPresetId,
} from "./elevation-presets";

const tracks: ColorTrack[] = generatePalettes({
  tracks: [
    { id: "t-primary", name: "primary", seedHex: "#7646ab" },
    { id: "neutral", name: "neutral", seedHex: "#737373" },
  ],
  lightnessValues: [97.5, 80, 60, 40, 20, 5],
});

const preset = (id: ElevationPresetId) =>
  applyElevationPreset(defaultElevationScale(), "low", id, tracks);
const low = (scale: ElevationScale) => scale.levels[0]!;
const layers = (scale: ElevationScale) => low(scale).layers;
const name = (scale: ElevationScale) =>
  matchingElevationPreset(low(scale), scale, tracks);

describe("which sliders a level gets", () => {
  it("names each preset's kind, and none for a custom stack", () => {
    expect(elevationAdjustmentStyle(low(preset("standard")))).toBe("standard");
    expect(elevationAdjustmentStyle(low(preset("subtle-card")))).toBe(
      "standard",
    );
    expect(elevationAdjustmentStyle(low(preset("inset")))).toBe("inset");
    expect(elevationAdjustmentStyle(low(preset("neumorphic")))).toBe(
      "neumorphic",
    );
    expect(elevationAdjustmentStyle(low(preset("glow")))).toBe("glow");
    // The seeded levels are two plain drop shadows: Standard's sliders.
    expect(elevationAdjustmentStyle(defaultElevationScale().levels[0]!)).toBe(
      "standard",
    );
    const mixed = updateShadowLayer(preset("standard"), "low", 0, {
      type: "inner",
    });
    expect(elevationAdjustmentStyle(low(mixed))).toBeNull();
  });

  it("reads each value off the layer that leads it, for the mode", () => {
    expect(readLevelAdjustmentValues(low(preset("standard")), "dark")).toEqual({
      style: "standard",
      values: { distance: 4, softness: 12, spread: 0, opacity: 0.45 },
    });
    expect(
      readLevelAdjustmentValues(low(preset("neumorphic")), "light")?.values,
    ).toEqual({ distance: 6, softness: 12, highlight: 0.9, shadow: 0.15 });
    expect(
      readLevelAdjustmentValues(low(preset("glow")), "light")?.values,
    ).toEqual({ radius: 16, spread: 2, intensity: 0.35 });
  });
});

describe("tuneStandardElevation", () => {
  it("moves the cast and keeps the contact tight, at a quarter", () => {
    const next = tuneStandardElevation(
      preset("standard"),
      "low",
      { distance: 16, softness: 40 },
      "light",
    );
    const [contact, cast] = layers(next);
    expect([cast!.offsetYPx, cast!.blurPx]).toEqual([16, 40]);
    expect([contact!.offsetYPx, contact!.blurPx]).toEqual([4, 10]);
  });

  it("sets spread on the cast and opacity on both, for one mode", () => {
    const next = tuneStandardElevation(
      preset("standard"),
      "low",
      { spread: -4, opacity: 0.3 },
      "dark",
    );
    const [contact, cast] = layers(next);
    expect(cast!.spreadPx).toBe(-4);
    expect([contact!.opacity.dark, cast!.opacity.dark]).toEqual([0.3, 0.3]);
    expect(cast!.opacity.light).toBe(0.1);
  });

  it("holds each value to its slider's range", () => {
    const next = tuneStandardElevation(
      preset("standard"),
      "low",
      { distance: 99, softness: 0, spread: -50, opacity: 2 },
      "light",
    );
    const [, cast] = layers(next);
    expect([cast!.offsetYPx, cast!.blurPx, cast!.spreadPx]).toEqual([
      32, 1, -8,
    ]);
    expect(cast!.opacity.light).toBe(1);
  });

  it("keeps a tuned Standard Standard, and a tuned Subtle card Subtle card", () => {
    for (const id of ["standard", "subtle-card"] as const) {
      const tuned = tuneStandardElevation(
        preset(id),
        "low",
        { distance: 20 },
        "light",
      );
      expect(name(tuned)).toBe(id);
    }
  });

  it("remembers the preset through a save and a load", () => {
    const tuned = tuneStandardElevation(
      preset("subtle-card"),
      "low",
      { softness: 30 },
      "light",
    );
    const loaded = normalizeElevationScale(JSON.parse(JSON.stringify(tuned)));
    expect(name(loaded)).toBe("subtle-card");
  });

  it("is Custom once its shape no longer fits", () => {
    const mixed = updateShadowLayer(preset("standard"), "low", 1, {
      type: "inner",
    });
    expect(name(mixed)).toBeNull();
  });

  it("leaves a level of another kind alone", () => {
    const glow = preset("glow");
    expect(tuneStandardElevation(glow, "low", { distance: 8 }, "light")).toBe(
      glow,
    );
  });
});

describe("tuneInsetElevation", () => {
  it("deepens and softens the main layer, the edge following", () => {
    const next = tuneInsetElevation(
      preset("inset"),
      "low",
      { depth: 12, softness: 20, opacity: 0.4 },
      "light",
    );
    const [main, edge] = layers(next);
    expect([main!.offsetYPx, main!.blurPx, main!.opacity.light]).toEqual([
      12, 20, 0.4,
    ]);
    expect([edge!.offsetYPx, edge!.blurPx, edge!.opacity.light]).toEqual([
      6, 5, 0.3,
    ]);
    expect(layers(next).every((layer) => layer.type === "inner")).toBe(true);
    expect(name(next)).toBe("inset");
  });
});

describe("tuneNeumorphicElevation", () => {
  it("moves shadow and highlight apart together and blurs both", () => {
    const next = tuneNeumorphicElevation(
      preset("neumorphic"),
      "low",
      { distance: 14, softness: 30 },
      "light",
    );
    const [shadow, highlight] = layers(next);
    expect([shadow!.offsetXPx, shadow!.offsetYPx, shadow!.blurPx]).toEqual([
      14, 14, 30,
    ]);
    expect([
      highlight!.offsetXPx,
      highlight!.offsetYPx,
      highlight!.blurPx,
    ]).toEqual([-14, -14, 30]);
    expect(name(next)).toBe("neumorphic");
  });

  it("sets the highlight and the shadow for one mode", () => {
    const next = tuneNeumorphicElevation(
      preset("neumorphic"),
      "low",
      { highlight: 0.5, shadow: 0.7 },
      "dark",
    );
    const [shadow, highlight] = layers(next);
    expect([shadow!.opacity.dark, highlight!.opacity.dark]).toEqual([0.7, 0.5]);
    expect(highlight!.opacity.light).toBe(0.9);
  });
});

describe("tuneGlowElevation", () => {
  it("widens the glow and spreads it, the tight layer following", () => {
    const next = tuneGlowElevation(
      preset("glow"),
      "low",
      { radius: 40, spread: 10 },
      "light",
    );
    const [inner, outer] = layers(next);
    expect(inner!.blurPx).toBe(10);
    expect([outer!.blurPx, outer!.spreadPx]).toEqual([40, 10]);
    expect(name(next)).toBe("glow");
  });

  it("sets intensity for one mode, the wide layer a little fainter", () => {
    const [inner, outer] = layers(
      tuneGlowElevation(preset("glow"), "low", { intensity: 0.8 }, "dark"),
    );
    expect([inner!.opacity.dark, outer!.opacity.dark]).toEqual([0.8, 0.75]);
  });
});

describe("tuneElevationLevel", () => {
  it("sends a slider's change to the level's kind of shadow", () => {
    const next = tuneElevationLevel(
      preset("glow"),
      "low",
      "radius",
      24,
      "light",
    );
    expect(layers(next)[1]!.blurPx).toBe(24);
  });

  it("leaves a custom stack alone", () => {
    const custom = updateShadowLayer(preset("standard"), "low", 1, {
      type: "inner",
    });
    expect(tuneElevationLevel(custom, "low", "distance", 8, "light")).toBe(
      custom,
    );
  });

  it("has a range for every slider it reads", () => {
    for (const [style, ranges] of Object.entries(ELEVATION_ADJUSTMENTS)) {
      const scale =
        style === "standard" ? preset("standard") : preset(style as never);
      const read = readLevelAdjustmentValues(low(scale), "light");
      expect(Object.keys(read!.values).sort()).toEqual(
        ranges.map((range) => range.key).sort(),
      );
    }
  });
});

describe("defaultAdjustmentValue", () => {
  it("is the value the preset starts with, per mode", () => {
    expect(defaultAdjustmentValue("standard", "distance", "light")).toBe(4);
    expect(defaultAdjustmentValue("standard", "opacity", "dark")).toBe(0.45);
    expect(defaultAdjustmentValue("inset", "depth", "light")).toBe(2);
    expect(defaultAdjustmentValue("neumorphic", "highlight", "light")).toBe(
      0.9,
    );
    expect(defaultAdjustmentValue("glow", "radius", "dark")).toBe(16);
  });

  it("resets a Subtle card to Subtle card's values, not Standard's", () => {
    expect(
      defaultAdjustmentValue("standard", "softness", "light", "subtle-card"),
    ).toBe(4);
    expect(defaultAdjustmentValue("standard", "softness", "light")).toBe(12);
  });

  it("puts a tuned preset back where applying it put it", () => {
    for (const id of ["standard", "inset", "neumorphic", "glow"] as const) {
      const applied = preset(id);
      const style = elevationAdjustmentStyle(low(applied))!;
      for (const range of ELEVATION_ADJUSTMENTS[style]) {
        const moved = tuneElevationLevel(
          applied,
          "low",
          range.key,
          range.max,
          "light",
        );
        const reset = tuneElevationLevel(
          moved,
          "low",
          range.key,
          defaultAdjustmentValue(style, range.key, "light", id)!,
          "light",
        );
        expect(
          readLevelAdjustmentValues(low(reset), "light")!.values[range.key],
          `${id} ${range.key}`,
        ).toBe(
          readLevelAdjustmentValues(low(applied), "light")!.values[range.key],
        );
      }
    }
  });
});

describe("levelAdjustmentDefault", () => {
  it("is a seeded level's own seed, so an untouched one has nothing to reset", () => {
    const scale = defaultElevationScale();
    for (const level of scale.levels) {
      const read = readLevelAdjustmentValues(level, "dark")!;
      for (const range of ELEVATION_ADJUSTMENTS[read.style]) {
        expect(
          levelAdjustmentDefault(level, range.key, "dark"),
          `${level.id} ${range.key}`,
        ).toBe(read.values[range.key]);
      }
    }
  });

  it("is the preset's value once a preset is applied", () => {
    const subtle = low(preset("subtle-card"));
    expect(levelAdjustmentDefault(subtle, "softness", "light")).toBe(4);
    const glow = low(preset("glow"));
    expect(levelAdjustmentDefault(glow, "radius", "light")).toBe(16);
  });

  it("is Standard's for an added level no preset has touched", () => {
    const added = addElevationLevel(defaultElevationScale()).levels.at(-1)!;
    expect(levelAdjustmentDefault(added, "softness", "light")).toBe(12);
  });

  it("is undefined for a custom stack", () => {
    const mixed = updateShadowLayer(preset("standard"), "low", 0, {
      type: "inner",
    });
    expect(levelAdjustmentDefault(low(mixed), "distance", "light")).toBe(
      undefined,
    );
  });
});
