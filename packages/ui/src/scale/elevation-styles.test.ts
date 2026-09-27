import { describe, expect, it } from "vitest";
import { generatePalettes } from "../color/palette";
import type { ColorTrack } from "../color/types";
import { defaultElevationScale, type ElevationScale } from "./elevation";
import {
  applyElevationPreset,
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
