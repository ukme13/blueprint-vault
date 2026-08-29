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
