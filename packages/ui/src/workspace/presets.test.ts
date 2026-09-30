import { describe, expect, it } from "vitest";
import {
  DEFAULT_WORKSPACE_PRESET_ID,
  WORKSPACE_PRESETS,
  findWorkspacePreset,
  instantiateWorkspacePreset,
  workspacePresetDetails,
  workspacePresetSwatches,
} from "./presets";
import { defaultRadiusScale } from "../scale/radius";
import { detectTypeRolePreset } from "../typography/role-presets";
import { defaultSpacingScale } from "../scale/spacing";
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

  it("seeds all seven tracks from a preset's palette", () => {
    const project = instantiateWorkspacePreset(
      findWorkspacePreset("stripe")!,
      "Test",
    );
    const seeds = Object.fromEntries(
      project.palette!.tracks.map((track) => [track.id, track.seedHex]),
    );
    expect(seeds).toEqual({
      primary: "#635bff",
      secondary: "#00d4b2",
      neutral: "#425466",
      success: "#0570de",
      warning: "#f5a623",
      error: "#df1b41",
      info: "#635bff",
    });
  });

  it("keeps the studio's status hues for a preset that names none", () => {
    const project = instantiateWorkspacePreset(
      { id: "bare", name: "Bare", summary: "", primarySeedHex: "#123456" },
      "Test",
    );
    const track = (id: string) =>
      project.palette!.tracks.find((entry) => entry.id === id)!.seedHex;
    expect(track("primary")).toBe("#123456");
    expect(track("error")).toBe(
      seedWorkspaceProject("Test").palette!.tracks.find(
        (entry) => entry.id === "error",
      )!.seedHex,
    );
  });

  it("names the type by the preset's role groups, and shows its line", () => {
    const primer = instantiateWorkspacePreset(
      findWorkspacePreset("primer")!,
      "Test",
    ).typography!;
    expect(detectTypeRolePreset(primer.system)).toBe("enterprise");
    expect(primer.specimenText).toBe("Where the world builds software");
    const stripe = instantiateWorkspacePreset(
      findWorkspacePreset("stripe")!,
      "Test",
    ).typography!;
    expect(detectTypeRolePreset(stripe.system)).toBe("app-ui");
  });

  it("changes a corner's size and keeps its name and description", () => {
    const tokens = instantiateWorkspacePreset(
      findWorkspacePreset("primer")!,
      "Test",
    ).radius.tokens;
    const inner = tokens.find((token) => token.id === "inner")!;
    const defaults = defaultRadiusScale().tokens.find(
      (token) => token.id === "inner",
    )!;
    expect(inner.basePx).toBe(3);
    expect(inner.description).toBe(defaults.description);
    expect(inner.name).toBe(defaults.name);
  });

  it("carries typography overrides into the system", () => {
    const linear = findWorkspacePreset("linear")!;
    const system = instantiateWorkspacePreset(linear, "Test").typography!
      .system;

    expect(system.ratio).toBe(1.2);
    expect(system.stepCount).toBe(10);
    expect(system.fonts[0]!.families[0]).toBe("Inter");
  });

  it("seeds every preset on the 4px unit the layout uses are written against", () => {
    /* A layout use is a step number: step 16 is a 64px section gap on 4px.
       An 8px base doubled every use, and a density on top stretched it
       further; the preview sprawled. A preset's own rhythm is its steps. */
    for (const preset of WORKSPACE_PRESETS) {
      const { spacing } = instantiateWorkspacePreset(preset, "Test");
      expect([preset.id, spacing.baseUnitPx]).toEqual([preset.id, 4]);
      expect(spacing.density).toBeLessThanOrEqual(1);
    }
  });

  it("seeds each preset's authentic sizes, typed on every frame", () => {
    const expected: Record<string, Record<string, number>> = {
      primer: { "button-md": 14, "button-sm": 12, h1: 32, h4: 16, tag: 12 },
      stripe: { label: 14, "body-sm": 14, chip: 12, h1: 64, h3: 36 },
      carbon: { label: 14, "body-2": 14, h4: 28, h2: 42, h1: 54, code: 12 },
      linear: { "body-sm": 13, label: 13, "button-md": 13, chip: 12 },
      polaris: { "body-2": 13, "button-sm": 12, caption: 12 },
    };
    for (const [id, sizes] of Object.entries(expected)) {
      const preset = findWorkspacePreset(id)!;
      const system = instantiateWorkspacePreset(preset, "Test").typography!
        .system;
      for (const [roleId, px] of Object.entries(sizes)) {
        const role = system.roles.find((each) => each.id === roleId);
        expect([id, roleId, role?.unlinkedSizes]).toEqual([
          id,
          roleId,
          { desktop: px, tablet: px, phone: px },
        ]);
      }
    }
  });

  it("only overrides roles the preset's groups really have", () => {
    /* An id the role preset lacks would be ignored without a word. */
    for (const preset of WORKSPACE_PRESETS) {
      const system = instantiateWorkspacePreset(preset, "Test").typography!
        .system;
      const roleIds = new Set(system.roles.map((role) => role.id));
      for (const roleId of Object.keys(
        preset.typography?.roleOverrides ?? {},
      )) {
        expect([preset.id, roleId, roleIds.has(roleId)]).toEqual([
          preset.id,
          roleId,
          true,
        ]);
      }
    }
  });

  it("keeps each preset's role group name after its sizes are seeded", () => {
    for (const preset of WORKSPACE_PRESETS) {
      const system = instantiateWorkspacePreset(preset, "Test").typography!
        .system;
      expect(detectTypeRolePreset(system)).toBe(
        preset.typography?.rolePresetId,
      );
    }
  });

  it("seeds Primer's dialog corner at 12px", () => {
    const primer = instantiateWorkspacePreset(
      findWorkspacePreset("primer")!,
      "Test",
    );
    const corner = (id: string) =>
      primer.radius.tokens.find((token) => token.id === id)!.basePx;
    expect([corner("element"), corner("container")]).toEqual([6, 12]);
  });

  it("seeds spacing, radius, the neutral and each frame's ratio", () => {
    const stripe = instantiateWorkspacePreset(
      findWorkspacePreset("stripe")!,
      "Test",
    );
    expect(stripe.spacing).toMatchObject({ baseUnitPx: 4, density: 1 });
    const corner = (id: string) =>
      stripe.radius.tokens.find((token) => token.id === id)!.basePx;
    expect([corner("element"), corner("container")]).toEqual([8, 12]);
    /* Stripe's corners happen to be the defaults; Linear's are not. */
    const linear = instantiateWorkspacePreset(
      findWorkspacePreset("linear")!,
      "Test",
    ).radius.tokens;
    expect(
      ["element", "container"].map(
        (id) => linear.find((token) => token.id === id)!.basePx,
      ),
    ).toEqual([4, 8]);
    expect(
      stripe.palette!.tracks.find((track) => track.id === "neutral")!.seedHex,
    ).toBe("#425466");
    expect(
      Object.fromEntries(
        stripe.previewDevices.map((device) => [device.id, device.ratio]),
      ),
    ).toEqual({ phone: 1.2, tablet: 1.25, desktop: 1.333 });
    expect(stripe.typography!.system.ratio).toBe(1.333);
  });

  it("gives IBM Carbon square corners, and leaves a pill a pill", () => {
    const carbon = instantiateWorkspacePreset(
      findWorkspacePreset("carbon")!,
      "Test",
    );
    expect(carbon.radius.multiplier).toBe(0);
    expect(
      workspacePresetDetails(findWorkspacePreset("carbon")!),
    ).toMatchObject({ elementRadiusPx: 0, containerRadiusPx: 0 });
  });

  it("changes nothing for a create that asks for nothing", () => {
    /* The seed with no input is still the studio's own: every new slice
       input falls back to exactly the default it replaced. */
    const bare = instantiateWorkspacePreset(
      { id: "bare", name: "Bare", summary: "" },
      "Test",
    );
    expect(bare).toEqual(seedWorkspaceProject("Test"));
    expect(bare.spacing).toEqual(defaultSpacingScale());
    expect(bare.radius).toEqual(defaultRadiusScale());
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
  it("describes GitHub Primer in full", () => {
    expect(workspacePresetDetails(findWorkspacePreset("primer")!)).toEqual({
      primaryHex: "#0969da",
      secondaryHex: "#1a7f37",
      neutralHex: "#656d76",
      typeface: "System sans",
      baseFontSizePx: 14,
      ratio: 1.25,
      ratioName: "Major Third",
      stepCount: 9,
      roleGroups: "Enterprise",
      baseSpacingPx: 4,
      elementRadiusPx: 6,
      containerRadiusPx: 12,
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
