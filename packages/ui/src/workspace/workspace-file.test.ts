import { describe, expect, it } from "vitest";
import { formatBlueprintPaletteProject } from "../color/export";
import { defaultSystem } from "../typography/system";
import {
  formatBlueprintWorkspace,
  parseBlueprintWorkspace,
} from "./workspace-file";
import type { WorkspaceProject } from "./types";

const LIGHTNESS = [
  97.5, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50, 45, 40, 35, 30, 25, 20, 15, 10,
  5,
];

const palette = () => ({
  name: "My colour system",
  tracks: [
    {
      id: "primary",
      name: "primary",
      seedHex: "#7646ab",
      adjustments: { anchors: {}, manualOverrides: {} },
    },
  ],
  lightnessPattern: "custom" as const,
  lightnessValues: LIGHTNESS,
});

const workspace = (over: Partial<WorkspaceProject> = {}): WorkspaceProject => ({
  name: "Brand",
  palette: palette(),
  typography: {
    system: defaultSystem("Brand", ["Inter"], 16, 1.25, 9),
    unit: "px",
    specimenText: "Sphinx",
    template: "article",
  },
  semantics: null,
  ...over,
});

describe("a workspace file carries both halves", () => {
  it("round-trips a whole workspace", () => {
    const before = workspace();
    const after = parseBlueprintWorkspace(formatBlueprintWorkspace(before));

    expect(after.name).toBe("Brand");
    expect(after.palette?.tracks).toHaveLength(1);
    /* The gap this format exists to close: a palette-only file lost the type
       scale on every export and re-import. */
    expect(after.typography?.system.name).toBe("Brand");
    expect(after.typography?.unit).toBe("px");
    expect(after.typography?.specimenText).toBe("Sphinx");
  });

  it("keeps a workspace whose typography has never been opened", () => {
    const after = parseBlueprintWorkspace(
      formatBlueprintWorkspace(workspace({ typography: null })),
    );
    // null, not an empty scale: the studio must still offer creation.
    expect(after.typography).toBeNull();
    expect(after.palette).not.toBeNull();
  });

  it("keeps a workspace that is only a type scale", () => {
    const after = parseBlueprintWorkspace(
      formatBlueprintWorkspace(workspace({ palette: null })),
    );
    expect(after.palette).toBeNull();
    expect(after.typography).not.toBeNull();
  });
});

describe("older palette files still import", () => {
  it("reads a blueprint-palette file into the palette half", () => {
    /* People have these. A format change is not a reason to orphan them. */
    const older = formatBlueprintPaletteProject(palette());
    const after = parseBlueprintWorkspace(older);

    expect(after.name).toBe("My colour system");
    expect(after.palette?.tracks).toHaveLength(1);
    expect(after.typography).toBeNull();
  });

  it("does not need the caller to know which kind it was handed", () => {
    // One parser, two formats, same return type.
    const fromPalette = parseBlueprintWorkspace(
      formatBlueprintPaletteProject(palette()),
    );
    const fromWorkspace = parseBlueprintWorkspace(
      formatBlueprintWorkspace(workspace({ typography: null })),
    );
    expect(Object.keys(fromPalette).sort()).toEqual(
      Object.keys(fromWorkspace).sort(),
    );
  });
});

describe("a file that is not one of ours", () => {
  const refuses = (source: string) =>
    expect(() => parseBlueprintWorkspace(source)).toThrow();

  it("refuses text that is not JSON", () => {
    refuses("not json at all");
  });

  it("refuses JSON that is not a Blueprint file", () => {
    refuses(JSON.stringify({ hello: "world" }));
    refuses(JSON.stringify([1, 2, 3]));
  });

  it("refuses a kind it does not know", () => {
    refuses(
      JSON.stringify({ kind: "blueprint-something", version: 1, project: {} }),
    );
  });

  it("refuses a version it does not know", () => {
    refuses(
      JSON.stringify({
        kind: "blueprint-workspace",
        version: 99,
        project: workspace(),
      }),
    );
  });

  it("refuses a workspace with nothing usable in either half", () => {
    refuses(
      JSON.stringify({
        kind: "blueprint-workspace",
        version: 1,
        project: { name: "Empty", palette: "broken", typography: "broken" },
      }),
    );
  });

  it("refuses a workspace with no name", () => {
    refuses(
      JSON.stringify({
        kind: "blueprint-workspace",
        version: 1,
        project: { ...workspace(), name: "   " },
      }),
    );
  });

  it("keeps the half that survived when the other is damaged", () => {
    /* Throwing here would cost someone the palette that was fine. */
    const after = parseBlueprintWorkspace(
      JSON.stringify({
        kind: "blueprint-workspace",
        version: 1,
        project: { ...workspace(), typography: { system: "damaged" } },
      }),
    );
    expect(after.palette?.tracks).toHaveLength(1);
    expect(after.typography).toBeNull();
  });
});

describe("a version 1 file still opens", () => {
  /* The check that shipped was a strict equality on the current version, so
     adding the semantic slice would have refused every file anybody had
     already saved. A version says what a file contains, not which build wrote
     it. */
  it("reads a file written before semantics existed", () => {
    const before = workspace();
    const v1 = JSON.stringify({
      kind: "blueprint-workspace",
      version: 1,
      project: {
        name: before.name,
        palette: before.palette,
        typography: before.typography,
      },
    });

    const after = parseBlueprintWorkspace(v1);
    expect(after.name).toBe("Brand");
    expect(after.palette?.tracks).toHaveLength(1);
    expect(after.typography?.system.name).toBe("Brand");
    // The upgrade: it arrives with the layer it never had.
    expect(after.semantics).toHaveLength(11);
  });

  it("writes the current version", () => {
    const file = JSON.parse(formatBlueprintWorkspace(workspace()));
    expect(file.version).toBe(2);
  });

  it("round-trips a chosen layer rather than reseeding it", () => {
    const chosen = [
      {
        id: "action.primary",
        name: "Action primary",
        description: "",
        light: { trackId: "primary", weight: 100 },
        dark: { trackId: "primary", weight: 900 },
      },
    ];
    const after = parseBlueprintWorkspace(
      formatBlueprintWorkspace(workspace({ semantics: chosen })),
    );

    expect(after.semantics).toEqual(chosen);
  });

  it("still refuses a version it does not know", () => {
    const future = JSON.stringify({
      kind: "blueprint-workspace",
      version: 3,
      project: workspace(),
    });
    expect(() => parseBlueprintWorkspace(future)).toThrow(/not supported/);
  });

  it("gives a palette-only file a layer too", () => {
    const paletteFile = JSON.stringify({
      kind: "blueprint-palette",
      version: 1,
      project: palette(),
    });

    const after = parseBlueprintWorkspace(paletteFile);
    expect(after.typography).toBeNull();
    expect(after.semantics).toHaveLength(11);
  });
});
