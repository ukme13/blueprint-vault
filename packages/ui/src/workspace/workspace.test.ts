import { describe, expect, it } from "vitest";
import { defaultElevationScale } from "../scale/elevation";
import { defaultRadiusScale } from "../scale/radius";
import { defaultSpacingScale } from "../scale/spacing";
import { defaultSystem } from "../typography/system";
import {
  DEFAULT_PREVIEW_TEMPLATE,
  DEFAULT_SPECIMEN_TEXT,
  DEFAULT_TYPE_SCALE_UNIT,
} from "./typography-project";
import {
  readLegacyPaletteName,
  readPaletteProjectData,
} from "./palette-project";
import {
  DEFAULT_WORKSPACE_NAME,
  LEGACY_PALETTE_STORAGE_KEY,
  LEGACY_TYPOGRAPHY_STORAGE_KEY,
  WORKSPACE_STORAGE_KEY,
  loadWorkspace,
  retireLegacyKeys,
  readWorkspaceProject,
  withPaletteSlice,
  withRadiusSlice,
  withSemanticsSlice,
  withSpacingSlice,
  withSharedName,
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
    expect(project).toEqual({
      name: "Empty",
      palette: null,
      typography: null,
      semantics: null,
      spacing: defaultSpacingScale(),
      radius: defaultRadiusScale(),
      elevation: defaultElevationScale(),
    });
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

describe("withSharedName", () => {
  const both = workspaceFromLegacy(legacyPalette(), legacyTypography())!;

  it("gives the typography slice the workspace name", () => {
    // Migration took the palette name; the scale adopts it rather than
    // keeping "My type scale" and overwriting on its next save.
    const named = withSharedName(both);
    expect(named.name).toBe("My colour system");
    expect(named.typography?.system.name).toBe("My colour system");
  });

  it("puts no name on the palette slice", () => {
    /* Typography keeps a copy because its export and the accessibility report
       read one. Nothing outside the topbar ever read the palette's, so the
       slice does not carry the field at all. */
    const named = withSharedName(both);
    expect(named.palette).not.toBeNull();
    expect(named.palette).not.toHaveProperty("name");
  });

  it("leaves an unopened studio unopened", () => {
    const named = withSharedName({ ...both, typography: null });
    expect(named.typography).toBeNull();
  });

  it("changes nothing else about a slice", () => {
    const named = withSharedName(both);
    expect(named.typography?.unit).toBe(both.typography?.unit);
    expect(named.palette?.tracks).toEqual(both.palette?.tracks);
  });
});

describe("the name on pre-workspace palette data", () => {
  it("is read off the raw value, not off the slice", () => {
    expect(readLegacyPaletteName(legacyPalette())).toBe("My colour system");
    expect(readPaletteProjectData(legacyPalette())).not.toHaveProperty("name");
  });

  it("treats a blank name as no name", () => {
    /* A workspace called "" is a topbar someone has to guess at, so blank has
       to fall through to the default rather than win as a name. */
    expect(readLegacyPaletteName(legacyPalette({ name: "   " }))).toBeNull();
    expect(readLegacyPaletteName(legacyPalette({ name: 7 }))).toBeNull();
    expect(readLegacyPaletteName({ tracks: [] })).toBeNull();
    expect(readLegacyPaletteName(null)).toBeNull();
  });

  it("migrates a nameless palette rather than discarding it", () => {
    /* The name used to be part of the "is this a palette?" gate, so a blob
       without one was thrown away along with its colours. Tracks are what
       make it a palette; the name never was. */
    const nameless = legacyPalette();
    delete (nameless as Record<string, unknown>).name;

    const project = workspaceFromLegacy(nameless, null);
    expect(project?.palette?.tracks).toHaveLength(1);
    expect(project?.name).toBe(DEFAULT_WORKSPACE_NAME);
  });

  it("still prefers the palette name over the type scale name", () => {
    const project = workspaceFromLegacy(legacyPalette(), legacyTypography());
    expect(project?.name).toBe("My colour system");
  });
});

describe("the semantic slice", () => {
  /* The upgrade this stage exists for. A workspace saved before semantics
     existed has a palette and every reason to have a layer over it. */
  it("seeds a layer for a workspace stored without one", () => {
    const stored = readWorkspaceProject({
      name: "Brand",
      palette: legacyPalette(),
      typography: null,
    })!;

    expect(stored.semantics).toHaveLength(72);
    expect(stored.semantics!.every((token) => token.light && token.dark)).toBe(
      true,
    );
  });

  it("seeds nothing when there is no palette to point at", () => {
    const stored = readWorkspaceProject({
      name: "Brand",
      palette: null,
      typography: legacyTypography(),
    })!;

    expect(stored.semantics).toBeNull();
  });

  it("keeps a stored layer rather than reseeding it", () => {
    const chosen = [
      {
        id: "action.primary",
        name: "Action primary",
        description: "",
        light: { trackId: "primary", weight: 100 },
        dark: { trackId: "primary", weight: 900 },
      },
    ];
    const stored = readWorkspaceProject({
      name: "Brand",
      palette: legacyPalette(),
      typography: null,
      semantics: chosen,
    })!;

    expect(stored.semantics).toHaveLength(72);
    expect(stored.semantics![0]!.light.weight).toBe(100);
  });

  it("drops a damaged token without losing the rest", () => {
    const stored = readWorkspaceProject({
      name: "Brand",
      palette: legacyPalette(),
      typography: null,
      semantics: [
        {
          id: "action.primary",
          name: "Action primary",
          description: "",
          light: { trackId: "primary", weight: 550 },
          dark: { trackId: "primary", weight: 400 },
        },
        /* One mode only. Guessing the other would put a colour nobody chose
           into an export. */
        {
          id: "surface.raised",
          light: { trackId: "primary", weight: 100 },
        },
        "not a token",
      ],
    })!;

    expect(stored.semantics).toHaveLength(72);
    expect(stored.semantics![0]!.id).toBe("action.primary");
  });

  it("seeds a layer when the workspace is rebuilt from the old keys", () => {
    const project = workspaceFromLegacy(legacyPalette(), legacyTypography())!;
    expect(project.semantics).toHaveLength(72);
  });

  it("gives a first palette a layer, and leaves an edited one alone", () => {
    const first = withPaletteSlice(null, legacyPalette() as never);
    expect(first.semantics).toHaveLength(72);

    const edited = withPaletteSlice(
      { ...first, semantics: [] },
      legacyPalette({ name: "Renamed" }) as never,
    );
    /* An edit must not reseed: the references follow the primitives on their
       own, and reseeding would silently discard what somebody chose. */
    expect(edited.semantics).toEqual([]);
  });

  it("replaces only its own slice", () => {
    const base = withPaletteSlice(null, legacyPalette() as never);
    const next = withSemanticsSlice(base, []);

    expect(next.semantics).toEqual([]);
    expect(next.palette).toBe(base.palette);
    expect(next.typography).toBe(base.typography);
    expect(next.name).toBe(base.name);
  });
});

describe("a layer stored under the first names", () => {
  it("comes back on the usage-based ones", () => {
    /* End to end through the reader, because the rename is only useful if it
       happens on the path the studio actually loads through. */
    const stored = readWorkspaceProject({
      name: "Brand",
      palette: legacyPalette(),
      typography: null,
      semantics: [
        {
          id: "neutral.dark",
          name: "Neutral dark",
          description: "",
          light: { trackId: "primary", weight: 950 },
          dark: { trackId: "primary", weight: 25 },
        },
      ],
    })!;

    expect(stored.semantics).toHaveLength(72);
    expect(stored.semantics![0]!.id).toBe("fg.primary");
    expect(stored.semantics![0]!.light.weight).toBe(950);
  });
});

describe("the spacing slice", () => {
  it("gives a workspace stored without one the default scale", () => {
    /* Unlike a studio nobody has opened, a workspace with no spacing scale is
       one laying itself out on numbers nobody chose. */
    const stored = readWorkspaceProject({
      name: "Brand",
      palette: legacyPalette(),
      typography: null,
    })!;

    expect(stored.spacing).toEqual(defaultSpacingScale());
  });

  it("keeps a stored scale, normalised", () => {
    const stored = readWorkspaceProject({
      name: "Brand",
      palette: null,
      typography: legacyTypography(),
      spacing: { baseUnitPx: 8, steps: [2, 1, 2, 4] },
    })!;

    expect(stored.spacing.baseUnitPx).toBe(8);
    expect(stored.spacing.steps).toEqual([1, 2, 4]);
  });

  it("falls back when the stored scale is unreadable", () => {
    const stored = readWorkspaceProject({
      name: "Brand",
      palette: legacyPalette(),
      typography: null,
      spacing: "not a scale",
    })!;

    expect(stored.spacing).toEqual(defaultSpacingScale());
  });

  it("replaces only its own slice", () => {
    const base = withPaletteSlice(null, legacyPalette() as never);
    const next = withSpacingSlice(base, { baseUnitPx: 8, steps: [1, 2] });

    expect(next.spacing.baseUnitPx).toBe(8);
    expect(next.palette).toBe(base.palette);
    expect(next.semantics).toBe(base.semantics);
    expect(next.typography).toBe(base.typography);
  });
});

describe("the radius slice", () => {
  it("gives a workspace stored without one the default scale", () => {
    const stored = readWorkspaceProject({
      name: "Brand",
      palette: legacyPalette(),
      typography: null,
    })!;

    expect(stored.radius).toEqual(defaultRadiusScale());
  });

  it("keeps a stored multiplier", () => {
    const stored = readWorkspaceProject({
      name: "Brand",
      palette: null,
      typography: legacyTypography(),
      radius: { multiplier: 2, tokens: defaultRadiusScale().tokens },
    })!;

    expect(stored.radius.multiplier).toBe(2);
  });

  it("replaces only its own slice", () => {
    const base = withPaletteSlice(null, legacyPalette() as never);
    const next = withRadiusSlice(base, {
      ...defaultRadiusScale(),
      multiplier: 0,
    });

    expect(next.radius.multiplier).toBe(0);
    expect(next.spacing).toBe(base.spacing);
    expect(next.palette).toBe(base.palette);
  });
});

/** Just enough of Storage for `retireLegacyKeys`, and a record of the removals. */
function fakeStorage(entries: Record<string, string>) {
  const held = { ...entries };
  const removed: string[] = [];
  return {
    removed,
    held,
    getItem: (key: string) => held[key] ?? null,
    removeItem: (key: string) => {
      removed.push(key);
      delete held[key];
    },
  };
}

describe("retiring the keys the workspace grew out of", () => {
  const workspace = () =>
    json(withPaletteSlice(null, legacyPalette() as never));

  it("removes them once the workspace reads back", () => {
    const storage = fakeStorage({
      [WORKSPACE_STORAGE_KEY]: workspace(),
      [LEGACY_PALETTE_STORAGE_KEY]: json(legacyPalette()),
      [LEGACY_TYPOGRAPHY_STORAGE_KEY]: json(legacyTypography()),
    });

    expect(retireLegacyKeys(storage)).toBe(true);
    expect(storage.removed.sort()).toEqual(
      [LEGACY_PALETTE_STORAGE_KEY, LEGACY_TYPOGRAPHY_STORAGE_KEY].sort(),
    );
    expect(storage.held[WORKSPACE_STORAGE_KEY]).toBeTruthy();
  });

  it("keeps them while there is no workspace to keep them for", () => {
    /* The migration has not been persisted yet, so the legacy keys are still
       the only copy of the project. Removing them here would be removing the
       thing the workspace is about to be built from. */
    const storage = fakeStorage({
      [LEGACY_PALETTE_STORAGE_KEY]: json(legacyPalette()),
      [LEGACY_TYPOGRAPHY_STORAGE_KEY]: json(legacyTypography()),
    });

    expect(retireLegacyKeys(storage)).toBe(false);
    expect(storage.removed).toEqual([]);
  });

  it("keeps them when the workspace key holds something unreadable", () => {
    /* A half-written or corrupted workspace is exactly the case the keys were
       kept for, so this is the one time the old behaviour still applies. */
    for (const broken of ["{ not json", "null", "[]", json({ nope: true })]) {
      const storage = fakeStorage({
        [WORKSPACE_STORAGE_KEY]: broken,
        [LEGACY_PALETTE_STORAGE_KEY]: json(legacyPalette()),
      });

      expect(retireLegacyKeys(storage), broken).toBe(false);
      expect(storage.removed, broken).toEqual([]);
    }
  });

  it("keeps them when the workspace key holds a legacy palette", () => {
    /* A legacy palette project also carries a name, and mistaking one for a
       workspace here would drop the only copy of it. */
    const storage = fakeStorage({
      [WORKSPACE_STORAGE_KEY]: json(legacyPalette()),
      [LEGACY_PALETTE_STORAGE_KEY]: json(legacyPalette()),
    });

    expect(retireLegacyKeys(storage)).toBe(false);
    expect(storage.removed).toEqual([]);
  });

  it("touches nothing when they are already gone", () => {
    /* Called on every load, so the second call and every one after it has to
       be free of side effects. */
    const storage = fakeStorage({ [WORKSPACE_STORAGE_KEY]: workspace() });

    expect(retireLegacyKeys(storage)).toBe(false);
    expect(storage.removed).toEqual([]);
  });

  it("is idempotent", () => {
    const storage = fakeStorage({
      [WORKSPACE_STORAGE_KEY]: workspace(),
      [LEGACY_PALETTE_STORAGE_KEY]: json(legacyPalette()),
    });

    expect(retireLegacyKeys(storage)).toBe(true);
    expect(retireLegacyKeys(storage)).toBe(false);
    expect(storage.removed).toEqual([LEGACY_PALETTE_STORAGE_KEY]);
  });

  it("leaves every other key alone", () => {
    const storage = fakeStorage({
      [WORKSPACE_STORAGE_KEY]: workspace(),
      [LEGACY_PALETTE_STORAGE_KEY]: json(legacyPalette()),
      "blueprint.colour-format.v1": "hex",
      "blueprint.palette-view.v1": json({ deficiency: "protanopia" }),
    });

    retireLegacyKeys(storage);

    expect(storage.held["blueprint.colour-format.v1"]).toBe("hex");
    expect(storage.held["blueprint.palette-view.v1"]).toBeTruthy();
  });
});
