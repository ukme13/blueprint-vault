import { describe, expect, it } from "vitest";
import { defaultSystem } from "../typography/system";
import {
  DEFAULT_PREVIEW_TEMPLATE,
  DEFAULT_SPECIMEN_TEXT,
  DEFAULT_TYPE_SCALE_UNIT,
} from "./typography-project";
import {
  DEFAULT_WORKSPACE_NAME,
  loadWorkspace,
  readWorkspaceProject,
  withPaletteSlice,
  withTypographySlice,
  workspaceFromLegacy,
} from "./workspace";

const LIGHTNESS = [
  97.5, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50, 45, 40, 35, 30, 25, 20, 15, 10,
  5,
];

function legacyPalette(over: Record<string, unknown> = {}) {
  return {
    name: "My colour system",
    tracks: [{ id: "primary", name: "primary", seedHex: "#7646ab" }],
    lightnessPattern: "custom",
    lightnessValues: LIGHTNESS,
    ...over,
  };
}

function legacyTypography(over: Record<string, unknown> = {}) {
  return {
    system: defaultSystem("My type scale", ["Inter"], 16, 1.25, 9),
    unit: "px",
    specimenText: "Sphinx of black quartz",
    template: "article",
    ...over,
  };
}

/** The pre-merge shape: a flat fontFamily and roleStyles, with no system. */
function preMergeTypography() {
  return {
    name: "Old scale",
    fontFamily: "Inter, sans-serif",
    baseFontSizePx: 16,
    ratio: 1.25,
    stepCount: 9,
    roleStyles: {
      display: { fontWeight: 700, lineHeight: 1.1, letterSpacingPx: -0.5 },
      heading: { fontWeight: 700, lineHeight: 1.2, letterSpacingPx: -0.25 },
      title: { fontWeight: 600, lineHeight: 1.3, letterSpacingPx: 0 },
      body: { fontWeight: 400, lineHeight: 1.5, letterSpacingPx: 0 },
      label: { fontWeight: 500, lineHeight: 1.4, letterSpacingPx: 0.1 },
      caption: { fontWeight: 400, lineHeight: 1.4, letterSpacingPx: 0.2 },
    },
  };
}

const json = (value: unknown) => JSON.stringify(value);

describe("loadWorkspace — what a browser might already hold", () => {
  it("finds nothing when nothing is stored", () => {
    const { project, migrated } = loadWorkspace({
      workspace: null,
      legacyPalette: null,
      legacyTypography: null,
    });
    expect(project).toBeNull();
    // Nothing was upgraded, so nothing needs writing back.
    expect(migrated).toBe(false);
  });

  it("migrates a palette on its own, leaving typography unopened", () => {
    const { project, migrated } = loadWorkspace({
      workspace: null,
      legacyPalette: json(legacyPalette()),
      legacyTypography: null,
    });
    expect(migrated).toBe(true);
    expect(project?.name).toBe("My colour system");
    expect(project?.palette?.tracks).toHaveLength(1);
    // null, not an empty scale: the studio must still offer creation.
    expect(project?.typography).toBeNull();
  });

  it("migrates a type scale on its own, taking its name", () => {
    const { project, migrated } = loadWorkspace({
      workspace: null,
      legacyPalette: null,
      legacyTypography: json(legacyTypography()),
    });
    expect(migrated).toBe(true);
    expect(project?.name).toBe("My type scale");
    expect(project?.palette).toBeNull();
    expect(project?.typography?.unit).toBe("px");
  });

  it("prefers the palette's name when both exist", () => {
    const { project } = loadWorkspace({
      workspace: null,
      legacyPalette: json(legacyPalette()),
      legacyTypography: json(legacyTypography()),
    });
    expect(project?.name).toBe("My colour system");
    // The scale keeps its own name on the system it belongs to.
    expect(project?.typography?.system.name).toBe("My type scale");
  });

  it("migrates the pre-merge typography shape", () => {
    const { project, migrated } = loadWorkspace({
      workspace: null,
      legacyPalette: null,
      legacyTypography: json(preMergeTypography()),
    });
    expect(migrated).toBe(true);
    expect(project?.typography?.system.roles.length).toBeGreaterThan(0);
    expect(project?.typography?.system.groups.length).toBeGreaterThan(0);
  });

  it("defaults the preferences a pre-merge project never had", () => {
    const { project } = loadWorkspace({
      workspace: null,
      legacyPalette: null,
      legacyTypography: json(preMergeTypography()),
    });
    expect(project?.typography?.unit).toBe(DEFAULT_TYPE_SCALE_UNIT);
    expect(project?.typography?.specimenText).toBe(DEFAULT_SPECIMEN_TEXT);
    expect(project?.typography?.template).toBe(DEFAULT_PREVIEW_TEMPLATE);
  });

  it("prefers a stored workspace over the legacy keys", () => {
    const { project, migrated } = loadWorkspace({
      workspace: json({ name: "Workspace", palette: null, typography: null }),
      legacyPalette: json(legacyPalette()),
      legacyTypography: json(legacyTypography()),
    });
    expect(migrated).toBe(false);
    expect(project?.name).toBe("Workspace");
    // The legacy keys are still there but are no longer the source of truth.
    expect(project?.palette).toBeNull();
  });

  it("is idempotent: migrating, storing, and loading again is a fixed point", () => {
    const input = {
      legacyPalette: json(legacyPalette()),
      legacyTypography: json(legacyTypography()),
    };
    const first = loadWorkspace({ workspace: null, ...input });
    const second = loadWorkspace({
      workspace: json(first.project),
      ...input,
    });
    expect(second.migrated).toBe(false);
    expect(second.project).toEqual(first.project);
  });

  it("falls back to the legacy keys when the workspace value is corrupt", () => {
    const { project, migrated } = loadWorkspace({
      workspace: "{ not json",
      legacyPalette: json(legacyPalette()),
      legacyTypography: null,
    });
    expect(migrated).toBe(true);
    expect(project?.palette?.tracks).toHaveLength(1);
  });
});

describe("workspaceFromLegacy", () => {
  it("names the workspace when neither half carried a usable name", () => {
    // A scale whose system has an empty name, and no palette at all.
    const typography = legacyTypography();
    typography.system = { ...typography.system, name: "" };
    const project = workspaceFromLegacy(null, typography);
    expect(project?.name).toBe(DEFAULT_WORKSPACE_NAME);
  });

  it("rejects a palette with no salvageable track", () => {
    const project = workspaceFromLegacy(
      legacyPalette({ tracks: [{ id: "x" }, "nonsense"] }),
      null,
    );
    expect(project).toBeNull();
  });

  it("keeps the readable tracks and drops the rest", () => {
    const project = workspaceFromLegacy(
      legacyPalette({
        tracks: [
          { id: "primary", name: "primary", seedHex: "#7646ab" },
          { id: "broken", name: "broken", seedHex: "not-a-colour" },
        ],
      }),
      null,
    );
    expect(project?.palette?.tracks.map((track) => track.id)).toEqual([
      "primary",
    ]);
  });

  it("replaces a lightness ramp that is too short to be real", () => {
    const project = workspaceFromLegacy(
      legacyPalette({ lightnessValues: [90, 10] }),
      null,
    );
    expect(project?.palette?.lightnessValues.length).toBeGreaterThan(2);
  });
});

describe("readWorkspaceProject", () => {
  it("does not mistake a legacy palette project for a workspace", () => {
    // It has a name, but names no slice — so it is the older document.
    expect(readWorkspaceProject(legacyPalette())).toBeNull();
  });

  it("accepts a workspace whose studios are both unopened", () => {
    const project = readWorkspaceProject({
      name: "Empty",
      palette: null,
      typography: null,
    });
    expect(project).toEqual({ name: "Empty", palette: null, typography: null });
  });

  it("keeps one slice when the other is unreadable", () => {
    const project = readWorkspaceProject({
      name: "Half",
      palette: { name: "p", tracks: "not an array" },
      typography: legacyTypography(),
    });
    expect(project?.palette).toBeNull();
    expect(project?.typography?.system.name).toBe("My type scale");
  });
});

describe("slice writes", () => {
  const both = workspaceFromLegacy(legacyPalette(), legacyTypography())!;

  it("leaves the other slice alone", () => {
    const next = withPaletteSlice(both, null);
    expect(next.palette).toBeNull();
    // Clearing a palette is not a reason to lose a type scale.
    expect(next.typography?.system.name).toBe("My type scale");
  });

  it("keeps the palette when typography is cleared", () => {
    const next = withTypographySlice(both, null);
    expect(next.typography).toBeNull();
    expect(next.palette?.tracks).toHaveLength(1);
  });

  it("builds a workspace when there is not one yet", () => {
    const next = withPaletteSlice(null, both.palette, "Fresh");
    expect(next.name).toBe("Fresh");
    expect(next.typography).toBeNull();
  });

  it("keeps the existing name when the new one is blank", () => {
    // An empty topbar should not rename the workspace to nothing.
    expect(withPaletteSlice(both, both.palette, "   ").name).toBe(both.name);
  });

  it("renames the workspace when a studio renames its project", () => {
    expect(withPaletteSlice(both, both.palette, "Renamed").name).toBe(
      "Renamed",
    );
  });
});
