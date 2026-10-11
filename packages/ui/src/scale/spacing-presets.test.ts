import { describe, expect, it } from "vitest";
import { defaultLayoutTokens, type LayoutToken } from "./layout-tokens";
import {
  defaultSpacingScale,
  resolveSpacing,
  spacingStepName,
  toggleSpacingStep,
  type SpacingScale,
} from "./spacing";
import {
  SPACING_PRESETS,
  applySpacingPreset,
  applySpacingPresetLayout,
  applySpacingPresetWithLayout,
  matchingSpacingPreset,
  type SpacingPresetId,
} from "./spacing-presets";

const px = (scale: SpacingScale) => resolveSpacing(scale).map((t) => t.px);

describe("SPACING_PRESETS", () => {
  it("resolve to the sizes each grid is known by", () => {
    const scale = (id: (typeof SPACING_PRESETS)[number]["id"]) =>
      applySpacingPreset(defaultSpacingScale(), id);
    expect(px(scale("8pt"))).toEqual([0, 4, 8, 16, 24, 32, 48, 64, 96]);
    expect(px(scale("4pt-compact"))).toEqual([
      0, 2, 4, 6, 8, 12, 16, 20, 24, 32,
    ]);
    expect(px(scale("tailwind"))).toEqual([
      0, 2, 4, 6, 8, 10, 12, 16, 20, 24, 32, 40, 48, 64,
    ]);
    expect(px(scale("spacious"))).toEqual([0, 8, 16, 32, 48, 64, 96, 128]);
  });

  it("are within what a scale may hold, so applying one loses nothing", () => {
    for (const preset of SPACING_PRESETS) {
      const applied = applySpacingPreset(defaultSpacingScale(), preset.id);
      expect(applied.baseUnitPx).toBe(preset.baseUnitPx);
      expect(applied.steps).toEqual([...preset.steps]);
    }
  });
});

describe("applySpacingPreset", () => {
  it("resets density, so the preset's steps are the sizes it names", () => {
    const dense = { ...defaultSpacingScale(), density: 1.5 };
    expect(applySpacingPreset(dense, "8pt").density).toBe(1);
  });

  it("leaves the scale alone for an unknown preset", () => {
    const scale = defaultSpacingScale();
    expect(applySpacingPreset(scale, "nope" as never)).toBe(scale);
  });
});

describe("matchingSpacingPreset", () => {
  it("names each preset once it is applied", () => {
    for (const preset of SPACING_PRESETS) {
      expect(
        matchingSpacingPreset(
          applySpacingPreset(defaultSpacingScale(), preset.id),
        ),
      ).toBe(preset.id);
    }
  });

  it("is custom once a step is pruned or added, or the base unit moves", () => {
    const grid = applySpacingPreset(defaultSpacingScale(), "8pt");
    expect(matchingSpacingPreset(toggleSpacingStep(grid, 6))).toBeNull();
    expect(matchingSpacingPreset(toggleSpacingStep(grid, 5))).toBeNull();
    expect(matchingSpacingPreset({ ...grid, baseUnitPx: 6 })).toBeNull();
  });

  it("keeps the preset when only density moves", () => {
    const grid = applySpacingPreset(defaultSpacingScale(), "spacious");
    expect(matchingSpacingPreset({ ...grid, density: 1.25 })).toBe("spacious");
  });

  it("calls the seeded scale custom: it is no preset", () => {
    expect(matchingSpacingPreset(defaultSpacingScale())).toBeNull();
  });
});

describe("the layout a preset gives", () => {
  const devices = ["phone", "tablet", "desktop"] as const;

  /** The size a use comes to on a frame, under a preset's own grid. */
  const sizeOf = (
    layout: readonly LayoutToken[],
    presetId: SpacingPresetId,
    use: string,
    device: string,
  ): number | undefined => {
    const name = layout.find((token) => token.id === use)?.byDevice[device];
    const tokens = resolveSpacing(
      applySpacingPreset(defaultSpacingScale(), presetId),
    );
    return tokens.find((token) => spacingStepName(token.step) === name)?.px;
  };

  const applied = (id: SpacingPresetId) =>
    applySpacingPresetLayout(defaultLayoutTokens(), id);

  it("names only steps its own grid keeps, on every frame", () => {
    for (const preset of SPACING_PRESETS) {
      const kept = preset.steps.map(spacingStepName);
      for (const [use, byDevice] of Object.entries(preset.layout ?? {})) {
        for (const value of Object.values(byDevice)) {
          expect({
            preset: preset.id,
            use,
            value,
            kept: kept.includes(value),
          }).toEqual({ preset: preset.id, use, value, kept: true });
        }
      }
    }
  });

  it("keeps the navigation bar the size it is on the 4px grid, where the grid has the step", () => {
    for (const id of ["8pt", "4pt-compact", "tailwind"] as const) {
      expect({
        id,
        y: sizeOf(applied(id), id, "inset-nav-y", "desktop"),
      }).toEqual({ id, y: 16 });
      expect({
        id,
        gap: sizeOf(applied(id), id, "gap-nav", "desktop"),
      }).toEqual({ id, gap: 24 });
    }
  });

  it("gives Spacious the bar's padding as it was, and the nearest roomier gap", () => {
    const layout = applied("spacious");
    for (const device of devices) {
      expect(sizeOf(layout, "spacious", "inset-nav-y", device)).toBe(16);
    }
    /* 24px is not a step of this grid: 32 is the next one up. */
    expect(sizeOf(layout, "spacious", "gap-nav", "desktop")).toBe(32);
    expect(sizeOf(layout, "spacious", "gap-nav", "tablet")).toBe(16);
  });

  it("does not let a bigger base unit stretch the bar, as leaving the use on its step does", () => {
    const left = defaultLayoutTokens();
    expect(sizeOf(left, "spacious", "inset-nav-y", "desktop")).toBe(32);
    expect(sizeOf(left, "spacious", "gap-nav", "desktop")).toBe(48);
  });

  it("puts the default back when another preset is chosen, leaving nothing of the last", () => {
    const spacious = applied("spacious");
    const back = applySpacingPresetLayout(spacious, "tailwind");
    const nav = (layout: readonly LayoutToken[], use: string) =>
      layout.find((token) => token.id === use)?.byDevice;
    expect(nav(back, "gap-nav")).toEqual(nav(defaultLayoutTokens(), "gap-nav"));
    expect(nav(back, "inset-nav-y")).toEqual(
      nav(defaultLayoutTokens(), "inset-nav-y"),
    );
  });

  it("moves only the uses a preset binds, and a frame of one it does not mention stays", () => {
    const start = defaultLayoutTokens().map((token) =>
      token.id === "gap-nav"
        ? { ...token, byDevice: { ...token.byDevice, watch: "2" } }
        : token,
    );
    const next = applySpacingPresetLayout(start, "spacious");
    for (const token of start) {
      if (token.id === "gap-nav" || token.id === "inset-nav-y") continue;
      expect(next.find((each) => each.id === token.id)).toBe(token);
    }
    expect(next.find((token) => token.id === "gap-nav")?.byDevice.watch).toBe(
      "2",
    );
  });

  it("is one edit with the scale", () => {
    const edit = applySpacingPresetWithLayout(
      defaultSpacingScale(),
      defaultLayoutTokens(),
      "spacious",
    );
    expect(matchingSpacingPreset(edit.spacing)).toBe("spacious");
    expect(
      edit.layout.find((token) => token.id === "inset-nav-y")?.byDevice.desktop,
    ).toBe("2");
  });

  it("leaves a list alone for a preset it does not know", () => {
    const start = defaultLayoutTokens();
    expect(applySpacingPresetLayout(start, "nope" as SpacingPresetId)).toEqual(
      start,
    );
  });
});
