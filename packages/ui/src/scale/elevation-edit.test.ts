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
  elevationColourOnTrack,
  elevationPreviewSurfaces,
  removeElevationLevel,
  renameElevationLevel,
  setElevationColour,
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
