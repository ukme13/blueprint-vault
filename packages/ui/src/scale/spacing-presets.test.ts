import { describe, expect, it } from "vitest";
import {
  defaultSpacingScale,
  resolveSpacing,
  toggleSpacingStep,
  type SpacingScale,
} from "./spacing";
import {
  SPACING_PRESETS,
  applySpacingPreset,
  matchingSpacingPreset,
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
    expect(matchingSpacingPreset(toggleSpacingStep(grid, 6))).toBe("custom");
    expect(matchingSpacingPreset(toggleSpacingStep(grid, 5))).toBe("custom");
    expect(matchingSpacingPreset({ ...grid, baseUnitPx: 6 })).toBe("custom");
  });

  it("keeps the preset when only density moves", () => {
    const grid = applySpacingPreset(defaultSpacingScale(), "spacious");
    expect(matchingSpacingPreset({ ...grid, density: 1.25 })).toBe("spacious");
  });

  it("calls the seeded scale custom: it is no preset", () => {
    expect(matchingSpacingPreset(defaultSpacingScale())).toBe("custom");
  });
});
