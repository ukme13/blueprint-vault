import { describe, expect, it } from "vitest";
import {
  DEFAULT_WORKSPACE_PRESET_ID,
  WORKSPACE_PRESETS,
  findWorkspacePreset,
  instantiateWorkspacePreset,
  workspacePresetDetails,
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
    const stripe = findWorkspacePreset("stripe")!;
    const project = instantiateWorkspacePreset(stripe, "Test");
    const track = (id: string) =>
      project.palette!.tracks.find((entry) => entry.id === id);

    expect(track("primary")!.seedHex).toBe("#635bff");
    expect(track("secondary")!.seedHex).toBe("#00d4b2");
    /* A preset chooses brand colour, not the status hues. */
    expect(track("error")!.seedHex).toBe(
      seedWorkspaceProject("Test").palette!.tracks.find(
        (entry) => entry.id === "error",
      )!.seedHex,
    );
  });

  it("carries typography overrides into the system", () => {
    const linear = findWorkspacePreset("linear")!;
    const system = instantiateWorkspacePreset(linear, "Test").typography!
      .system;

    expect(system.ratio).toBe(1.2);
    expect(system.stepCount).toBe(10);
    expect(system.fonts[0]!.families[0]).toBe("Inter");
  });

  it("keeps the studio's own defaults for what a preset leaves out", () => {
    /* No step count in Primer, so it keeps the studio's nine. */
    const primer = findWorkspacePreset("primer")!;
    const system = instantiateWorkspacePreset(primer, "Test").typography!
      .system;

    expect(system.stepCount).toBe(9);
    expect(system.baseFontSizePx).toBe(16);
  });

  it("opens the dialog on GitHub Primer", () => {
    const preset = findWorkspacePreset(DEFAULT_WORKSPACE_PRESET_ID)!;
    expect(preset.name).toBe("GitHub Primer");
    const tracks = instantiateWorkspacePreset(preset, "Test").palette!.tracks;
    expect(tracks.find((track) => track.id === "primary")!.seedHex).toBe(
      "#0969da",
    );
    expect(tracks.find((track) => track.id === "secondary")!.seedHex).toBe(
      "#1a7f37",
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
    const [primary, secondary] = workspacePresetSwatches(
      findWorkspacePreset("stripe")!,
    );

    expect(primary).toBe("#635bff");
    expect(secondary).toBe("#00d4b2");
  });

  it("falls back to the seed tracks for a preset that overrides nothing", () => {
    const bare = { id: "bare", name: "Bare", summary: "" };
    const swatches = workspacePresetSwatches(bare);
    const tracks = seedWorkspaceProject("Test").palette!.tracks;

    expect(swatches).toEqual([
      tracks.find((entry) => entry.id === "primary")!.seedHex,
      tracks.find((entry) => entry.id === "secondary")!.seedHex,
      tracks.find((entry) => entry.id === "neutral")!.seedHex,
    ]);
  });
});

describe("preset details", () => {
  it("describes GitHub Primer, the defaults it leaves filled in", () => {
    expect(workspacePresetDetails(findWorkspacePreset("primer")!)).toEqual({
      primaryHex: "#0969da",
      secondaryHex: "#1a7f37",
      neutralHex: "#737373",
      typeface: "System sans",
      baseFontSizePx: 16,
      ratio: 1.25,
      ratioName: "Major Third",
      stepCount: 9,
    });
  });

  it("names a quoted face as a person would", () => {
    expect(
      workspacePresetDetails(findWorkspacePreset("carbon")!),
    ).toMatchObject({ typeface: "IBM Plex Sans", ratioName: "Major Third" });
  });

  it("keeps what a preset overrides, and names its ratio", () => {
    expect(
      workspacePresetDetails(findWorkspacePreset("linear")!),
    ).toMatchObject({
      primaryHex: "#5e6ad2",
      typeface: "Inter",
      ratioName: "Minor Third",
      stepCount: 10,
    });
  });

  it("fills a bare preset from the studio's own seed", () => {
    expect(
      workspacePresetDetails({ id: "bare", name: "Bare", summary: "" }),
    ).toMatchObject({
      primaryHex: "#7646ab",
      secondaryHex: "#0f9d8f",
      typeface: "Inter",
    });
  });

  it("leaves an unnamed ratio unnamed rather than guessing", () => {
    const preset = {
      id: "x",
      name: "x",
      summary: "",
      typography: { ratio: 1.31 },
    };
    expect(workspacePresetDetails(preset).ratioName).toBeNull();
  });
});
