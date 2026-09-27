import { describe, expect, it } from "vitest";
import { generatePalettes } from "../color/palette";
import type { ColorTrack } from "../color/types";
import { defaultElevationScale, type ElevationScale } from "./elevation";
import {
  isSimpleElevationLevel,
  setLevelModeOpacities,
  updateShadowLayer,
} from "./elevation-edit";
import {
  applyElevationPreset,
  elevationPresetLayers,
  matchingElevationPreset,
  type ElevationPresetId,
} from "./elevation-presets";
import {
  GLOW_SIZE,
  NEUMORPHIC_DISTANCE,
  glowIntensity,
  glowSize,
  isGlowLevel,
  isInsetLevel,
  isNeumorphicLevel,
  neumorphicDistance,
  setGlowElevationIntensity,
  setGlowElevationSize,
  setNeumorphicElevationDistance,
  setNeumorphicElevationOpacities,
} from "./elevation-styles";

function palette(): ColorTrack[] {
  return generatePalettes({
    tracks: [
      { id: "t-primary", name: "primary", seedHex: "#7646ab" },
      { id: "neutral", name: "neutral", seedHex: "#737373" },
    ],
    lightnessValues: [97.5, 80, 60, 40, 20, 5],
  });
}

const tracks = palette();

/** A scale whose `low` level is the preset. */
function preset(id: ElevationPresetId): ElevationScale {
  return applyElevationPreset(defaultElevationScale(), "low", id, tracks);
}

const low = (scale: ElevationScale) => scale.levels[0]!;
const name = (scale: ElevationScale) =>
  matchingElevationPreset(low(scale), scale, tracks);

describe("each preset is recognised by its shape", () => {
  it("knows Inset, Neumorphic and Glow, and nothing else as them", () => {
    expect(isInsetLevel(low(preset("inset")))).toBe(true);
    expect(isNeumorphicLevel(low(preset("neumorphic")))).toBe(true);
    expect(isGlowLevel(low(preset("glow")))).toBe(true);
    for (const other of ["standard", "subtle-card"] as const) {
      const level = low(preset(other));
      expect(isInsetLevel(level)).toBe(false);
      expect(isNeumorphicLevel(level)).toBe(false);
      expect(isGlowLevel(level)).toBe(false);
    }
  });
});

describe("Inset in Simple", () => {
  it("is a contact and a cast the pads can set", () => {
    expect(isSimpleElevationLevel(low(preset("inset")))).toBe(true);
  });

  it("keeps its layers inner and stays Inset once the pads move it", () => {
    const pressed = setLevelModeOpacities(
      preset("inset"),
      "low",
      "light",
      0.3,
      0.2,
    );
    expect(low(pressed).layers.every((layer) => layer.type === "inner")).toBe(
      true,
    );
    expect(low(pressed).layers.map((layer) => layer.opacity.light)).toEqual([
      0.3, 0.2,
    ]);
    expect(name(pressed)).toBe("inset");
  });

  it("is still not simple with a drop beside an inner layer", () => {
    const mixed = updateShadowLayer(preset("inset"), "low", 0, {
      type: "drop",
    });
    expect(isSimpleElevationLevel(low(mixed))).toBe(false);
  });
});

describe("Neumorphic in Simple", () => {
  it("moves the shadow and the highlight apart together, blur following", () => {
    const next = setNeumorphicElevationDistance(
      preset("neumorphic"),
      "low",
      10,
    );
    const [shadow, highlight] = low(next).layers;
    expect([shadow!.offsetXPx, shadow!.offsetYPx, shadow!.blurPx]).toEqual([
      10, 10, 20,
    ]);
    expect([
      highlight!.offsetXPx,
      highlight!.offsetYPx,
      highlight!.blurPx,
    ]).toEqual([-10, -10, 20]);
    expect(neumorphicDistance(low(next))).toBe(10);
  });

  it("keeps its colours, opacities and name", () => {
    const before = low(preset("neumorphic"));
    const after = low(
      setNeumorphicElevationDistance(preset("neumorphic"), "low", 12),
    );
    expect(after.layers.map((layer) => [layer.colour, layer.opacity])).toEqual(
      before.layers.map((layer) => [layer.colour, layer.opacity]),
    );
    expect(
      name(setNeumorphicElevationDistance(preset("neumorphic"), "low", 12)),
    ).toBe("neumorphic");
  });

  it("holds the distance to its range", () => {
    const far = setNeumorphicElevationDistance(preset("neumorphic"), "low", 99);
    const near = setNeumorphicElevationDistance(
      preset("neumorphic"),
      "low",
      -3,
    );
    expect(neumorphicDistance(low(far))).toBe(NEUMORPHIC_DISTANCE.max);
    expect(neumorphicDistance(low(near))).toBe(NEUMORPHIC_DISTANCE.min);
  });

  it("sets the shadow's and the highlight's strength for one mode", () => {
    const next = setNeumorphicElevationOpacities(
      preset("neumorphic"),
      "low",
      "dark",
      0.6,
      0.2,
    );
    const [shadow, highlight] = low(next).layers;
    expect(shadow!.opacity).toEqual({ light: 0.15, dark: 0.6 });
    expect(highlight!.opacity).toEqual({ light: 0.9, dark: 0.2 });
    expect(name(next)).toBe("neumorphic");
  });

  it("leaves a level of another shape alone", () => {
    const standard = preset("standard");
    expect(setNeumorphicElevationDistance(standard, "low", 10)).toBe(standard);
    expect(
      setNeumorphicElevationOpacities(standard, "low", "light", 0.5, 0.5),
    ).toBe(standard);
  });
});

describe("Glow in Simple", () => {
  it("starts at the size the preset draws", () => {
    // The preset's own proportions are the ones the slider keeps.
    const start = setGlowElevationSize(preset("glow"), "low", 16);
    expect(low(start).layers).toEqual(
      elevationPresetLayers("glow", start, tracks),
    );
    expect(glowSize(low(preset("glow")))).toBe(16);
  });

  it("scales both layers' blur and spread together", () => {
    const [inner, outer] = low(
      setGlowElevationSize(preset("glow"), "low", 32),
    ).layers;
    expect([inner!.blurPx, inner!.spreadPx]).toEqual([8, 0]);
    expect([outer!.blurPx, outer!.spreadPx]).toEqual([32, 4]);
  });

  it("holds the size to its range, and stays a Glow", () => {
    const huge = setGlowElevationSize(preset("glow"), "low", 500);
    expect(glowSize(low(huge))).toBe(GLOW_SIZE.max);
    expect(name(huge)).toBe("glow");
  });

  it("sets intensity per mode, the wide layer a little fainter", () => {
    const next = setGlowElevationIntensity(preset("glow"), "low", "light", 0.8);
    const [inner, outer] = low(next).layers;
    expect(inner!.opacity.light).toBe(0.8);
    expect(outer!.opacity.light).toBe(0.75);
    // Dark is left as it was.
    expect(inner!.opacity.dark).toBe(
      low(preset("glow")).layers[0]!.opacity.dark,
    );
    expect(glowIntensity(low(next), "light")).toBe(0.8);
  });

  it("holds intensity to 0–1", () => {
    const [, outer] = low(
      setGlowElevationIntensity(preset("glow"), "low", "light", 0.02),
    ).layers;
    expect(outer!.opacity.light).toBe(0);
    expect(
      glowIntensity(
        low(setGlowElevationIntensity(preset("glow"), "low", "dark", 3)),
        "dark",
      ),
    ).toBe(1);
  });

  it("leaves a level of another shape alone", () => {
    const inset = preset("inset");
    expect(setGlowElevationSize(inset, "low", 20)).toBe(inset);
  });
});
