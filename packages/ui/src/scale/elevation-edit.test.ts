import { describe, expect, it } from "vitest";
import { generatePalettes } from "../color/palette";
import type { ColorTrack } from "../color/types";
import {
  defaultElevationScale,
  elevationVariableName,
  isSystemElevationLevel,
  resolveElevation,
  SYSTEM_ELEVATION_LEVEL_IDS,
  type ElevationScale,
} from "./elevation";
import {
  addElevationLevel,
  ELEVATION_OPACITY_MAX,
  elevationColourOnTrack,
  elevationLayerName,
  elevationPreviewSurfaces,
  removeElevationLevel,
  renameElevationLevel,
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

describe("the seeded opacities", () => {
  it("leave the editor room to go stronger", () => {
    /* A seed on ELEVATION_OPACITY_MAX starts the control at its ceiling: the
       editor cannot raise it, and the pad parks its thumb in the corner. High's
       dark cast went to 0.6 once, and only an end-to-end test that pressed
       ArrowUp and saw nothing move noticed. */
    for (const level of defaultElevationScale().levels) {
      for (const [index, layer] of level.layers.entries()) {
        for (const mode of ["light", "dark"] as const) {
          expect(
            layer.opacity[mode],
            `${level.id} layer ${index} ${mode}`,
          ).toBeLessThan(ELEVATION_OPACITY_MAX);
        }
      }
    }
  });
});

describe("setLayerOpacity", () => {
  it("writes one layer in one mode and leaves the rest", () => {
    /* High's seed disagrees with itself on dark: contact 0.4, cast 0.55. A
       slider that painted every layer would make that state unreachable. */
    const start = defaultElevationScale();
    const high = start.levels.find((level) => level.id === "high")!;
    expect(high.layers[0]!.opacity.dark).toBe(0.4);
    expect(high.layers[1]!.opacity.dark).toBe(0.55);

    const next = setLayerOpacity(start, "high", 1, "dark", 0.45);
    const edited = next.levels.find((level) => level.id === "high")!;

    expect(edited.layers[1]!.opacity.dark).toBe(0.45);
    expect(edited.layers[0]!.opacity.dark).toBe(0.4);
    expect(edited.layers[1]!.opacity.light).toBe(0.1);
    expect(
      next.levels.find((level) => level.id === "low")!.layers[0]!.opacity.dark,
    ).toBe(0.4);
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
    ).toBe(0.4);
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
  it("never paints the dark ground in the shadow's own shade", () => {
    /* The default shadow is the darkest neutral. A ground of that same shade
       composites any opacity of it to nothing, which is how every dark
       shadow went invisible in the preview. */
    const tracks = palette();
    const surfaces = elevationPreviewSurfaces(tracks);
    const neutral = tracks.find((track) => track.name === "neutral")!;
    const darkest = [...neutral.shades].sort((a, b) => b.weight - a.weight)[0]!;
    expect(surfaces.dark.ground).not.toBe(darkest.hex);
  });

  it("lifts the dark card off the dark ground", () => {
    const surfaces = elevationPreviewSurfaces(palette());
    /* Lighter than its ground, as a raised surface is in dark mode. Hex
       string order stands in for lightness on a greyscale ramp. */
    expect(surfaces.dark.card > surfaces.dark.ground).toBe(true);
  });

  it("gives the dark sample a dark card, not a light one", () => {
    const surfaces = elevationPreviewSurfaces(palette());
    /* A light sticker on a dark ground is what this is here to stop. Hex
       string order is a stand-in for lightness on a greyscale ramp. */
    expect(surfaces.dark.card).not.toBe(surfaces.light.card);
    expect(surfaces.dark.card < surfaces.light.card).toBe(true);
  });
});

describe("adding, removing and renaming levels", () => {
  const base = () => defaultElevationScale();
  const ids = (scale: ElevationScale) => scale.levels.map((level) => level.id);

  it("knows the three system levels", () => {
    expect([...SYSTEM_ELEVATION_LEVEL_IDS]).toEqual(["low", "med", "high"]);
    expect(isSystemElevationLevel("high")).toBe(true);
    expect(isSystemElevationLevel("float")).toBe(false);
  });

  it("adds a level after the others, with two layers and a free name", () => {
    const once = addElevationLevel(base());
    expect(ids(once)).toEqual(["low", "med", "high", "new-level"]);
    expect(once.levels.at(-1)).toMatchObject({
      name: "New level",
      description: "",
    });
    expect(once.levels.at(-1)!.layers).toHaveLength(2);
    expect(elevationVariableName(once.levels.at(-1)!.id)).toBe(
      "--shadow-new-level",
    );
    expect(ids(addElevationLevel(once))).toContain("new-level-2");
  });

  it("never gives a new level a system level's name", () => {
    const added = addElevationLevel(base(), "low").levels.at(-1)!;
    expect(added).toMatchObject({ id: "low-2", name: "low 2" });
  });

  it("removes a custom level and never a system one", () => {
    const withFloat = addElevationLevel(base(), "Float");
    expect(ids(removeElevationLevel(withFloat, "float"))).toEqual([
      "low",
      "med",
      "high",
    ]);
    for (const id of SYSTEM_ELEVATION_LEVEL_IDS) {
      expect(removeElevationLevel(withFloat, id)).toBe(withFloat);
    }
  });

  it("renames a custom level and its variable, keeping it unique", () => {
    const withTwo = addElevationLevel(
      addElevationLevel(base(), "Float"),
      "Modal",
    );
    const renamed = renameElevationLevel(
      withTwo,
      "float",
      "Sticky bar",
      "A bar pinned to the top.",
    );
    expect(
      renamed.levels.find((level) => level.id === "sticky-bar"),
    ).toMatchObject({
      name: "Sticky bar",
      description: "A bar pinned to the top.",
    });
    expect(ids(renamed)).not.toContain("float");
    /* Onto another level's name, in any case: numbered instead. */
    const clash = renameElevationLevel(withTwo, "float", "MODAL");
    expect(clash.levels.find((level) => level.name === "MODAL 2")?.id).toBe(
      "modal-2",
    );
  });

  it("lets a system level take a description but keep its name", () => {
    const next = renameElevationLevel(
      base(),
      "low",
      "Ground",
      "Flat on the page.",
    );
    expect(next.levels[0]).toMatchObject({
      id: "low",
      name: "Low",
      description: "Flat on the page.",
    });
  });

  it("returns the same scale when nothing changes", () => {
    const scale = base();
    expect(renameElevationLevel(scale, "low", "Low")).toBe(scale);
    expect(renameElevationLevel(scale, "gone", "Anything")).toBe(scale);
  });
});
