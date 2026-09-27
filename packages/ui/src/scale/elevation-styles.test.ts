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
  matchingElevationPreset,
  type ElevationPresetId,
} from "./elevation-presets";
import {
  isGlowLevel,
  isInsetLevel,
  isNeumorphicLevel,
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
