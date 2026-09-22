import { describe, expect, it } from "vitest";
import {
  DEFAULT_WORKSPACE_PRESET_ID,
  WORKSPACE_PRESETS,
  findWorkspacePreset,
  instantiateWorkspacePreset,
  workspacePresetSwatches,
} from "./presets";
import { seedWorkspaceProject } from "./seed-project";
import { readWorkspaceProject } from "./workspace";

/** Every slice a create must fill. A preset that misses one lands broken. */
const SLICES = [
  "palette",
  "semantics",
  "removedSeedRoles",
  "buttonSchemes",
  "spacing",
  "radius",
  "elevation",
  "previewDevices",
  "layout",
  "typography",
] as const;

/** What a stored file is by the time it is read back. */
function roundTrip(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value));
}

describe("the preset catalogue", () => {
  it("offers a default that is one of the presets", () => {
    expect(findWorkspacePreset(DEFAULT_WORKSPACE_PRESET_ID)).toBeDefined();
  });

  it("gives every preset a distinct id", () => {
    const ids = WORKSPACE_PRESETS.map((preset) => preset.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("resolves an id nothing defines to nothing", () => {
    expect(findWorkspacePreset("not-a-preset")).toBeUndefined();
  });
});

describe("instantiating a preset", () => {
  it.each(WORKSPACE_PRESETS.map((preset) => [preset.id, preset] as const))(
    "%s fills every slice",
    (_id, preset) => {
      const project = instantiateWorkspacePreset(preset, "Test");
      expect(project.name).toBe("Test");
      for (const slice of SLICES) {
        expect(project[slice], `${preset.id} left ${slice} empty`).toBeTruthy();
      }
    },
  );

  it.each(WORKSPACE_PRESETS.map((preset) => [preset.id, preset] as const))(
    "%s survives the path a loaded file takes",
    (_id, preset) => {
      const project = instantiateWorkspacePreset(preset, "Test");
      /* The check that catches drift. A preset is only useful if the document
         it produces reads back the same way a saved one does. */
      const read = readWorkspaceProject(roundTrip(project));
      expect(read).not.toBeNull();
      expect(read!.name).toBe("Test");
      expect(read!.palette).not.toBeNull();
      expect(read!.typography).not.toBeNull();
    },
  );

  it("puts the brand seeds on the brand tracks, leaving the rest alone", () => {
    const editorial = findWorkspacePreset("editorial")!;
    const project = instantiateWorkspacePreset(editorial, "Test");
    const track = (id: string) =>
      project.palette!.tracks.find((entry) => entry.id === id);

    expect(track("primary")!.seedHex).toBe(editorial.primarySeedHex);
    expect(track("secondary")!.seedHex).toBe(editorial.secondarySeedHex);
    /* A preset chooses brand colour, not the status hues. */
    expect(track("error")!.seedHex).toBe(
      seedWorkspaceProject("Test").palette!.tracks.find(
        (entry) => entry.id === "error",
      )!.seedHex,
    );
  });

  it("carries typography overrides into the system", () => {
    const utility = findWorkspacePreset("utility")!;
    const system = instantiateWorkspacePreset(utility, "Test").typography!
      .system;

    expect(system.ratio).toBe(utility.typography!.ratio);
    expect(system.stepCount).toBe(utility.typography!.stepCount);
    expect(system.fonts[0]!.families[0]).toBe("ui-sans-serif");
    /* Left out of this preset, so it keeps the studio's own base size. */
    expect(system.baseFontSizePx).toBe(16);
  });

  it("takes the base size from a preset that sets one", () => {
    const editorial = findWorkspacePreset("editorial")!;
    const system = instantiateWorkspacePreset(editorial, "Test").typography!
      .system;

    expect(system.baseFontSizePx).toBe(17);
    expect(system.fonts[0]!.families[0]).toBe("Iowan Old Style");
  });

  it("leaves the default create untouched", () => {
    /* The control must not change what create already produced. If this fails,
       the default drifted behind the dialog rather than with it. */
    const preset = findWorkspacePreset(DEFAULT_WORKSPACE_PRESET_ID)!;
    expect(instantiateWorkspacePreset(preset, "Test")).toEqual(
      seedWorkspaceProject("Test"),
    );
  });
});

describe("preset swatches", () => {
  it("shows three colours for every preset", () => {
    for (const preset of WORKSPACE_PRESETS) {
      const swatches = workspacePresetSwatches(preset);
      expect(swatches).toHaveLength(3);
      for (const hex of swatches) {
        expect(hex).toMatch(/^#[0-9a-f]{6}$/i);
      }
    }
  });

  it("paints the preset's own brand seeds", () => {
    const utility = findWorkspacePreset("utility")!;
    const [primary, secondary] = workspacePresetSwatches(utility);

    expect(primary).toBe(utility.primarySeedHex);
    expect(secondary).toBe(utility.secondarySeedHex);
  });

  it("falls back to the seed tracks for a preset that overrides nothing", () => {
    const blueprint = findWorkspacePreset(DEFAULT_WORKSPACE_PRESET_ID)!;
    const swatches = workspacePresetSwatches(blueprint);
    const tracks = seedWorkspaceProject("Test").palette!.tracks;

    expect(swatches).toEqual([
      tracks.find((entry) => entry.id === "primary")!.seedHex,
      tracks.find((entry) => entry.id === "secondary")!.seedHex,
      tracks.find((entry) => entry.id === "neutral")!.seedHex,
    ]);
  });
});
