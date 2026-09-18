import { describe, expect, it } from "vitest";
import { generatePalettes } from "../color/palette";
import type { ColorTrack } from "../color/types";
import { defaultElevationScale, resolveElevation } from "./elevation";
import {
  elevationColourOnTrack,
  elevationLayerName,
  elevationPreviewSurfaces,
  setElevationColour,
  setLayerOpacity,
  setLevelModeOpacities,
  snapElevationOpacity,
} from "./elevation-edit";

function palette(): ColorTrack[] {
  return generatePalettes({
    tracks: [
      { id: "t-primary", name: "primary", seedHex: "#7646ab" },
      { id: "neutral", name: "neutral", seedHex: "#737373" },
    ],
    lightnessValues: [97.5, 80, 60, 40, 20, 5],
  });
}

describe("setLayerOpacity", () => {
  it("writes one layer in one mode and leaves the rest", () => {
    /* High's seed disagrees with itself on dark: contact 0.2, cast 0.3. A
       slider that painted every layer would make that state unreachable. */
    const start = defaultElevationScale();
    const high = start.levels.find((level) => level.id === "high")!;
    expect(high.layers[0]!.opacity.dark).toBe(0.2);
    expect(high.layers[1]!.opacity.dark).toBe(0.3);

    const next = setLayerOpacity(start, "high", 1, "dark", 0.45);
    const edited = next.levels.find((level) => level.id === "high")!;

    expect(edited.layers[1]!.opacity.dark).toBe(0.45);
    expect(edited.layers[0]!.opacity.dark).toBe(0.2);
    expect(edited.layers[1]!.opacity.light).toBe(0.1);
    expect(
      next.levels.find((level) => level.id === "low")!.layers[0]!.opacity.dark,
    ).toBe(0.2);
  });

  it("clamps rather than storing an alpha a shadow cannot use", () => {
    const next = setLayerOpacity(defaultElevationScale(), "low", 0, "light", 4);
    expect(next.levels[0]!.layers[0]!.opacity.light).toBe(1);
  });
});

describe("setLevelModeOpacities", () => {
  it("writes contact and cast of one mode and leaves the other", () => {
    const start = defaultElevationScale();
    const next = setLevelModeOpacities(start, "high", "dark", 0.15, 0.45);
    const high = next.levels.find((level) => level.id === "high")!;

    expect(high.layers[0]!.opacity.dark).toBe(0.15);
    expect(high.layers[1]!.opacity.dark).toBe(0.45);
    expect(high.layers[0]!.opacity.light).toBe(0.1);
    expect(high.layers[1]!.opacity.light).toBe(0.1);
    expect(
      next.levels.find((level) => level.id === "low")!.layers[1]!.opacity.dark,
    ).toBe(0.2);
  });

  it("leaves a missing level alone", () => {
    const start = defaultElevationScale();
    expect(setLevelModeOpacities(start, "none", "light", 0.4, 0.4)).toBe(start);
  });
});

describe("snapElevationOpacity", () => {
  it("lands on the editor step and will not pass the ceiling", () => {
    expect(snapElevationOpacity(0.12)).toBe(0.1);
    expect(snapElevationOpacity(0.13)).toBe(0.15);
    expect(snapElevationOpacity(4)).toBe(0.6);
  });
});

describe("setElevationColour", () => {
  it("repoints the reference and does not touch opacity", () => {
    const start = defaultElevationScale();
    const next = setElevationColour(start, {
      trackId: "t-primary",
      weight: 800,
    });

    expect(next.colour).toEqual({ trackId: "t-primary", weight: 800 });
    expect(next.levels[0]!.layers[0]!.opacity).toEqual(
      start.levels[0]!.layers[0]!.opacity,
    );
  });

  it("changes the channels resolveElevation draws", () => {
    const tracks = palette();
    const fromNeutral = resolveElevation(
      defaultElevationScale(),
      tracks,
      "light",
    )[0]!.layers[0]!.rgb;
    const fromPrimary = resolveElevation(
      setElevationColour(defaultElevationScale(), {
        trackId: "t-primary",
        weight: 800,
      }),
      tracks,
      "light",
    )[0]!.layers[0]!.rgb;

    expect(fromPrimary).not.toEqual(fromNeutral);
  });
});

describe("elevationColourOnTrack", () => {
  it("keeps the weight when the new ramp has it", () => {
    const tracks = palette();
    const primary = tracks.find((track) => track.id === "t-primary")!;
    const next = elevationColourOnTrack(
      { trackId: "neutral", weight: primary.shades[0]!.weight },
      primary,
    );
    expect(next).toEqual({
      trackId: "t-primary",
      weight: primary.shades[0]!.weight,
    });
  });

  it("falls to the darkest shade when it does not", () => {
    const tracks = palette();
    const primary = tracks.find((track) => track.id === "t-primary")!;
    const next = elevationColourOnTrack(
      { trackId: "neutral", weight: 12_345 },
      primary,
    );
    const darkest = Math.max(...primary.shades.map((shade) => shade.weight));
    expect(next.weight).toBe(darkest);
  });
});

describe("elevationLayerName", () => {
  it("calls a pair contact and cast", () => {
    expect(elevationLayerName(0, 2)).toBe("Contact");
    expect(elevationLayerName(1, 2)).toBe("Cast");
  });

  it("numbers any other count", () => {
    expect(elevationLayerName(0, 1)).toBe("Layer 1");
    expect(elevationLayerName(2, 3)).toBe("Layer 3");
  });
});

describe("elevationPreviewSurfaces", () => {
  it("gives the dark sample a dark card, not a light one", () => {
    const surfaces = elevationPreviewSurfaces(palette());
    /* A light sticker on a dark ground is what this is here to stop. Hex
       string order is a stand-in for lightness on a greyscale ramp. */
    expect(surfaces.dark.card).not.toBe(surfaces.light.card);
    expect(surfaces.dark.card < surfaces.light.card).toBe(true);
  });
});
