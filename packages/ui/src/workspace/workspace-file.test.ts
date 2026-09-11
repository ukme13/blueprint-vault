import { describe, expect, it } from "vitest";
import { generatePalettes } from "../color/palette";
import {
  rememberRemovedSeedRoles,
  seedSemanticTokens,
} from "../color/semantic";
import { deleteTokens, dropButtonScheme } from "../color/selection-ops";
import { defaultElevationScale } from "../scale/elevation";
import { defaultRadiusScale } from "../scale/radius";
import { defaultSpacingScale } from "../scale/spacing";
import { normalizeButtonSchemes } from "../button-tones";
import { defaultPreviewDevices } from "../typography/preview-devices";
import { defaultSystem } from "../typography/system";
import {
  BLUEPRINT_WORKSPACE_FILE_VERSION,
  formatBlueprintWorkspace,
  parseBlueprintWorkspace,
  SUPPORTED_WORKSPACE_FILE_VERSIONS,
} from "./workspace-file";
import { DEFAULT_WORKSPACE_NAME, readWorkspaceProject } from "./workspace";
import type { WorkspaceProject } from "./types";
import type { ColorTrack } from "../color/types";
import type { BlueprintWorkspaceFile } from "./workspace-file";

const LIGHTNESS = [
  97.5, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50, 45, 40, 35, 30, 25, 20, 15, 10,
  5,
];

const palette = () => ({
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

/*
 * A `blueprint-palette` file exactly as it was written, spelled out here.
 *
 * Hardcoded rather than produced by a formatter. The formatter that wrote
 * these is gone, and generating the fixture from current code was the reason
 * to keep it — which would have made this test follow every future change to
 * the workspace shape and quietly stop proving anything about the old one.
 * A compatibility test has to hold a copy of what it is compatible with.
 *
 * Note the `name` on the project: the palette slice has not had one since it
 * became a slice, and reading it out of a file like this is the only reason
 * anything still looks for it.
 */
const LEGACY_PALETTE_FILE = JSON.stringify({
  kind: "blueprint-palette",
  version: 1,
  project: {
    name: "My colour system",
    tracks: [
      {
        id: "primary",
        name: "primary",
        seedHex: "#7646ab",
        adjustments: { anchors: {}, manualOverrides: {} },
      },
    ],
    lightnessPattern: "custom",
    lightnessValues: LIGHTNESS,
  },
});

const workspace = (over: Partial<WorkspaceProject> = {}): WorkspaceProject => ({
  name: "Brand",
  palette: palette(),
  typography: {
    system: defaultSystem("Brand", ["Inter"], 16, 1.25, 9),
    unit: "px",
    specimenText: "Sphinx",
    template: "article",
    previewDevices: defaultPreviewDevices(1.25),
  },
  semantics: null,
  removedSeedRoles: [],
  buttonSchemes: normalizeButtonSchemes(undefined),
  spacing: defaultSpacingScale(),
  radius: defaultRadiusScale(),
  elevation: defaultElevationScale(),
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
    const after = parseBlueprintWorkspace(LEGACY_PALETTE_FILE);

    /* The workspace takes its name from the file, since a palette file is the
       one input that still carries one. */
    expect(after.name).toBe("My colour system");
    expect(after.palette?.tracks).toHaveLength(1);
    expect(after.typography).toBeNull();
  });

  it("refuses a palette file version it does not know", () => {
    expect(() =>
      parseBlueprintWorkspace(
        JSON.stringify({
          ...JSON.parse(LEGACY_PALETTE_FILE),
          version: 2,
        }),
      ),
    ).toThrow("not supported");
  });

  it("falls back to the default name when the file has none", () => {
    const nameless = JSON.parse(LEGACY_PALETTE_FILE);
    delete nameless.project.name;
    /* The tracks are what make it a palette, so it still imports. Before the
       slice lost its name this returned null and the file was refused. */
    const after = parseBlueprintWorkspace(JSON.stringify(nameless));

    expect(after.palette?.tracks).toHaveLength(1);
    expect(after.name).toBe(DEFAULT_WORKSPACE_NAME);
  });

  it("does not need the caller to know which kind it was handed", () => {
    // One parser, two formats, same return type.
    const fromPalette = parseBlueprintWorkspace(LEGACY_PALETTE_FILE);
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
    expect(after.semantics).toHaveLength(72);
  });

  it("writes the current version", () => {
    const file = JSON.parse(formatBlueprintWorkspace(workspace()));
    /* The constant rather than the number. Which version is current changes;
       that the writer stamps it is the claim, and a literal here made every
       version bump edit a test that was not about the bump. */
    expect(file.version).toBe(BLUEPRINT_WORKSPACE_FILE_VERSION);
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

    /* What the file chose comes back untouched and still first. The rest of
       the seed set is appended behind it, the same way stored data is topped
       up — a file saved before a role existed would otherwise export a layer
       missing it forever, and be the one door into the workspace that never
       migrates. */
    expect(after.semantics!.slice(0, 1)).toEqual(chosen);
    expect(after.semantics).toHaveLength(72);
  });

  it("still refuses a version it does not know", () => {
    const future = JSON.stringify({
      kind: "blueprint-workspace",
      version: BLUEPRINT_WORKSPACE_FILE_VERSION + 1,
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
    expect(after.semantics).toHaveLength(72);
  });
});

describe("a version 2 file still opens", () => {
  it("reads a file written before the spacing scale existed", () => {
    /* The check that shipped was a strict equality on the current version and
       would have refused every saved file. Each earlier version differs only by
       lacking a slice that is filled on the way in. */
    const before = workspace();
    const v2 = JSON.stringify({
      kind: "blueprint-workspace",
      version: 2,
      project: {
        name: before.name,
        palette: before.palette,
        typography: before.typography,
        semantics: before.semantics,
      },
    });

    const after = parseBlueprintWorkspace(v2);
    expect(after.name).toBe("Brand");
    expect(after.palette?.tracks).toHaveLength(1);
    expect(after.spacing).toEqual(defaultSpacingScale());
  });

  it("round-trips an edited scale rather than defaulting it", () => {
    const after = parseBlueprintWorkspace(
      formatBlueprintWorkspace(
        workspace({ spacing: { baseUnitPx: 8, steps: [1, 2, 4] } }),
      ),
    );
    expect(after.spacing).toEqual({ baseUnitPx: 8, steps: [1, 2, 4] });
  });
});

describe("a version 3 file still opens", () => {
  it("reads a file written before radius existed", () => {
    const before = workspace();
    const v3 = JSON.stringify({
      kind: "blueprint-workspace",
      version: 3,
      project: {
        name: before.name,
        palette: before.palette,
        typography: before.typography,
        semantics: before.semantics,
        spacing: before.spacing,
      },
    });

    const after = parseBlueprintWorkspace(v3);
    expect(after.spacing).toEqual(defaultSpacingScale());
    expect(after.radius).toEqual(defaultRadiusScale());
  });
});

describe("a version 5 file still opens, and a version 6 file carries alpha", () => {
  /* A semantic layer of one token, so the assertions are about the reference
     and not about which of seventy-two roles moved. */
  const layer = (alpha?: number) => [
    {
      id: "border.subtle",
      name: "Subtle border",
      description: "",
      light:
        alpha === undefined
          ? { trackId: "primary", weight: 200 }
          : { trackId: "primary", weight: 200, alpha },
      dark:
        alpha === undefined
          ? { trackId: "primary", weight: 800 }
          : { trackId: "primary", weight: 800, alpha },
    },
  ];

  const fileAt = (version: number, alpha?: number) =>
    JSON.stringify({
      kind: "blueprint-workspace",
      version,
      project: { ...workspace({ semantics: layer(alpha) }) },
    });

  it("reads a file written before alpha existed as opaque", () => {
    /* Version 6 is the first that is not a missing slice: an absent alpha is
       already what opaque means, so a version 5 file needs nothing filled and
       has to come back unchanged. */
    const after = parseBlueprintWorkspace(fileAt(5));
    const token = after.semantics!.find((each) => each.id === "border.subtle")!;

    expect(token.light).toEqual({ trackId: "primary", weight: 200 });
    expect(token.light.alpha).toBeUndefined();
    expect(token.dark.alpha).toBeUndefined();
  });

  it("round-trips an alpha identically", () => {
    /* Both directions. The reader that shipped before this dropped every field
       it did not name, so a file written at 12% came back solid — a silent
       change to somebody's system with nothing anywhere saying so. */
    const written = formatBlueprintWorkspace(
      workspace({ semantics: layer(0.12) }),
    );
    expect(written).toContain('"alpha": 0.12');

    const after = parseBlueprintWorkspace(written);
    const token = after.semantics!.find((each) => each.id === "border.subtle")!;

    expect(token.light).toEqual({
      trackId: "primary",
      weight: 200,
      alpha: 0.12,
    });
    expect(token.dark.alpha).toBe(0.12);

    /* And out again unchanged, which is the half that catches a reader that
       reads the field and a writer that forgets it. */
    expect(formatBlueprintWorkspace(after)).toContain('"alpha": 0.12');
  });

  it("moved the version, and kept the ones before it", () => {
    /* Spelled out once, because this is the test about the bumps themselves.
       Six was alpha and seven is the removed-seed list; every earlier version
       stays supported, because each is still a file this build understands
       completely. */
    expect(BLUEPRINT_WORKSPACE_FILE_VERSION).toBe(7);
    expect(SUPPORTED_WORKSPACE_FILE_VERSIONS).toEqual([1, 2, 3, 4, 5, 6, 7]);

    /* And the reason the number moved at all. A build handed a file from
       after it must refuse the file rather than read the parts it recognises
       and drop an alpha on the floor. */
    expect(() =>
      parseBlueprintWorkspace(
        fileAt(BLUEPRINT_WORKSPACE_FILE_VERSION + 1, 0.12),
      ),
    ).toThrow(TypeError);
  });

  it("keeps an out-of-range alpha rather than dropping the token", () => {
    /* Reading is not the place to correct it. The value stays as stored, is
       clamped where it resolves, and is reported there — so the studio can say
       the number is wrong instead of quietly rewriting somebody's file. */
    const after = parseBlueprintWorkspace(fileAt(6, 1.4));
    const token = after.semantics!.find((each) => each.id === "border.subtle")!;
    expect(token.light.alpha).toBe(1.4);
  });

  it("treats an alpha that is not a number as no alpha at all", () => {
    /* A `null` or a string is not a transparency somebody set, and dropping
       the whole token over one would cost a role for a field that is
       optional. */
    /* Cast, because the point is a file the types say cannot exist: a
       hand-edited document, or one from a build that wrote the field
       differently. The reader's job is to survive it. */
    const damaged = JSON.stringify({
      kind: "blueprint-workspace",
      version: 6,
      project: {
        ...workspace(),
        semantics: [
          {
            id: "border.subtle",
            name: "Subtle border",
            description: "",
            light: { trackId: "primary", weight: 200, alpha: "0.5" },
            dark: { trackId: "primary", weight: 800, alpha: null },
          },
        ],
      } as unknown as WorkspaceProject,
    });

    const after = parseBlueprintWorkspace(damaged);
    const token = after.semantics!.find((each) => each.id === "border.subtle")!;
    expect(token.light.alpha).toBeUndefined();
    expect(token.dark.alpha).toBeUndefined();
  });
});

describe("a seed role somebody deleted stays deleted", () => {
  /**
   * A workspace whose layer is the seed set minus one role, deliberately.
   *
   * `border.subtle` because it is one of the two seed roles nothing reads by
   * name, which is what makes it deletable at all — see `usedBy`.
   */
  function withoutSubtleBorder(): {
    project: WorkspaceProject;
    tracks: ColorTrack[];
  } {
    const base = workspace();
    const tracks = generatePalettes({
      tracks: base.palette!.tracks,
      lightnessValues: base.palette!.lightnessValues,
    });
    const seeded = seedSemanticTokens(tracks);
    const gone = deleteTokens(seeded, ["border.subtle"]);

    expect(gone.refusals).toEqual([]);
    expect(gone.removed).toEqual(["border.subtle"]);

    return {
      project: {
        ...base,
        semantics: gone.layer,
        removedSeedRoles: gone.removed,
      },
      tracks,
    };
  }

  it("is not put back when the file is opened again", () => {
    /* Without the list, `fillSeedRoles` cannot tell a role somebody threw away
       from one added to the seed set since the save, and puts both back — so
       the deletion undoes itself on the next open. */
    const { project } = withoutSubtleBorder();
    const after = parseBlueprintWorkspace(formatBlueprintWorkspace(project));

    expect(after.semantics!.map((token) => token.id)).not.toContain(
      "border.subtle",
    );
    expect(after.removedSeedRoles).toEqual(["border.subtle"]);
  });

  it("comes back, and is forgotten, when the id is added again", () => {
    /* Reconciled against the layer rather than against the operation, so a
       duplicate renamed onto the id clears the list exactly like a token added
       by hand does. */
    const { project, tracks } = withoutSubtleBorder();
    const back = seedSemanticTokens(tracks).find(
      (token) => token.id === "border.subtle",
    )!;

    const readded = parseBlueprintWorkspace(
      formatBlueprintWorkspace({
        ...project,
        semantics: [...project.semantics!, back],
        removedSeedRoles: rememberRemovedSeedRoles(project.removedSeedRoles, [
          ...project.semantics!,
          back,
        ]),
      }),
    );

    expect(readded.semantics!.map((token) => token.id)).toContain(
      "border.subtle",
    );
    expect(readded.removedSeedRoles).toEqual([]);
  });

  it("fills a role added to the seed set since the save, as it always did", () => {
    /* The half the list must not break. An absent id still means "missing" for
       every role that is not on the list, so a workspace saved before a role
       existed still gains it. */
    const { project } = withoutSubtleBorder();
    const short = {
      ...project,
      semantics: project.semantics!.filter(
        (token) => token.id !== "focus.ring",
      ),
    };

    const after = parseBlueprintWorkspace(formatBlueprintWorkspace(short));
    const ids = after.semantics!.map((token) => token.id);

    expect(ids).toContain("focus.ring");
    expect(ids).not.toContain("border.subtle");
  });

  it("reads the same through storage as through a file", () => {
    /* Both doors, because the semantic top-up itself shipped with only one of
       them wired: the same document gave two answers depending on which way it
       came in, and the docs app kept exporting nineteen roles. */
    const { project } = withoutSubtleBorder();
    const raw = JSON.parse(
      formatBlueprintWorkspace(project),
    ) as BlueprintWorkspaceFile;

    const fromFile = parseBlueprintWorkspace(formatBlueprintWorkspace(project));
    const fromStorage = readWorkspaceProject(raw.project)!;

    expect(fromStorage.removedSeedRoles).toEqual(fromFile.removedSeedRoles);
    expect(fromStorage.semantics!.map((token) => token.id)).toEqual(
      fromFile.semantics!.map((token) => token.id),
    );
    expect(fromStorage.semantics!.map((token) => token.id)).not.toContain(
      "border.subtle",
    );
  });

  it("keeps only ids the seed set actually has", () => {
    /* The list only ever changes what `fillSeedRoles` does, so an id it will
       never seed is an entry that can only grow. */
    const { project } = withoutSubtleBorder();
    const after = parseBlueprintWorkspace(
      formatBlueprintWorkspace({
        ...project,
        removedSeedRoles: ["border.subtle", "brand.wash", "border.subtle"],
      }),
    );

    expect(after.removedSeedRoles).toEqual(["border.subtle"]);
  });
});

describe("buttonSchemes", () => {
  it("treats a missing field as every seed scheme", () => {
    const file = JSON.parse(formatBlueprintWorkspace(workspace())) as {
      project: Record<string, unknown>;
    };
    delete file.project.buttonSchemes;
    const after = parseBlueprintWorkspace(JSON.stringify(file));
    expect(after.buttonSchemes).toEqual(normalizeButtonSchemes(undefined));
  });

  it("keeps a dropped tone dropped through the file", () => {
    const base = workspace();
    const tracks = generatePalettes({
      tracks: base.palette!.tracks,
      lightnessValues: base.palette!.lightnessValues,
    });
    const dropped = dropButtonScheme(
      seedSemanticTokens(tracks),
      normalizeButtonSchemes(undefined),
      "info",
    );
    const after = parseBlueprintWorkspace(
      formatBlueprintWorkspace({
        ...base,
        semantics: dropped.edit.layer,
        removedSeedRoles: dropped.edit.removed,
        buttonSchemes: dropped.buttonSchemes,
      }),
    );

    expect(after.buttonSchemes).not.toContain("info");
    expect(after.semantics!.map((token) => token.id)).not.toContain(
      "status.info",
    );
  });
});
