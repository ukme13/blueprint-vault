import { describe, expect, it } from "vitest";
import {
  toggleSpacingStep,
  DEFAULT_SPACING_BASE_UNIT_PX,
  DEFAULT_SPACING_DENSITY,
  MAX_SPACING_BASE_UNIT_PX,
  MAX_SPACING_DENSITY,
  MIN_SPACING_BASE_UNIT_PX,
  MIN_SPACING_DENSITY,
  SPACING_DENSITY_PRESETS,
  SPACING_BASE_UNIT_PRESETS,
  defaultSpacingScale,
  generateSpacingSteps,
  normalizeSpacingScale,
  resolveSpacing,
  resolveSpacingSlots,
  SPACING_SLOT_STEPS,
  spacingDensityBehavior,
  spacingChipSteps,
  nearestSpacingToken,
  matchingSpacingDensityPreset,
  spacingStepName,
  spacingVariableName,
} from "./spacing";

describe("the default scale", () => {
  it("counts a base unit out linearly, not by a ratio", () => {
    /* The correction the plan was written around. A ratio of 1.25 from 4px
       gives 4, 5, 6.25, 7.81; every step here is a whole multiple of 4 or a
       half of one, which is what a page is actually laid out on. */
    const tokens = resolveSpacing(defaultSpacingScale());
    const pixels = tokens.map((token) => token.px);

    expect(pixels).toEqual([0, 2, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48, 64]);
    for (const px of pixels) {
      expect(px % 2).toBe(0);
    }
  });

  it("uses 4px, the unit Astryx and Tailwind both use", () => {
    expect(defaultSpacingScale().baseUnitPx).toBe(4);
    expect(DEFAULT_SPACING_BASE_UNIT_PX).toBe(4);
  });

  it("keeps named bases inside the allowed range", () => {
    expect(SPACING_BASE_UNIT_PRESETS.map((preset) => preset.value)).toEqual([
      2, 4, 8,
    ]);
    for (const preset of SPACING_BASE_UNIT_PRESETS) {
      expect(preset.value).toBeGreaterThanOrEqual(MIN_SPACING_BASE_UNIT_PX);
      expect(preset.value).toBeLessThanOrEqual(MAX_SPACING_BASE_UNIT_PX);
    }
  });

  it("hands back a copy, not the shared list", () => {
    /* A caller that sorted or spliced the default in place would change it for
       every workspace opened afterwards in the same session. */
    const first = defaultSpacingScale();
    first.steps.push(99);
    expect(defaultSpacingScale().steps).not.toContain(99);
  });
});

describe("resolveSpacing", () => {
  it("measures rem against the browser root, not the type scale", () => {
    /* A page with an 18px body still has 16px rems unless somebody moved the
       root, and spacing that assumed otherwise would be an eighth too large
       everywhere. */
    const tokens = resolveSpacing({
      baseUnitPx: 4,
      density: 1,
      steps: [1, 4],
    });
    expect(tokens[0]!.rem).toBe(0.25);
    expect(tokens[1]!.rem).toBe(1);
  });

  it("names a half step the way a custom property can carry it", () => {
    expect(spacingStepName(0.5)).toBe("0-5");
    expect(spacingStepName(2)).toBe("2");
    expect(spacingVariableName(1.5)).toBe("--spacing-1-5");
  });

  it("follows the base unit", () => {
    const tokens = resolveSpacing({
      baseUnitPx: 8,
      density: 1,
      steps: [1, 2],
    });
    expect(tokens.map((token) => token.px)).toEqual([8, 16]);
  });

  it("gives no rem a long tail of floating point", () => {
    const tokens = resolveSpacing({
      baseUnitPx: 7,
      density: 1,
      steps: [3],
    });
    expect(String(tokens[0]!.rem).length).toBeLessThan(8);
  });

  it("scales layout gaps and leaves the fine grid", () => {
    /* Switching the base from 4 to 8 doubles the 2px hairline. Density is
       the control that makes the page roomier without doing that. */
    const tokens = resolveSpacing({
      baseUnitPx: 4,
      density: 2,
      steps: [0.5, 1, 1.5, 2, 4],
    });
    const byStep = new Map(tokens.map((token) => [token.step, token]));

    expect(byStep.get(0.5)).toMatchObject({
      px: 2,
      followsDensity: false,
    });
    expect(byStep.get(1)).toMatchObject({ px: 4, followsDensity: false });
    expect(byStep.get(1.5)).toMatchObject({ px: 6, followsDensity: false });
    expect(byStep.get(2)).toMatchObject({ px: 16, followsDensity: true });
    expect(byStep.get(4)).toMatchObject({ px: 32, followsDensity: true });
  });

  it("treats a missing density as 1, so an old file does not jump", () => {
    const tokens = resolveSpacing({
      baseUnitPx: 4,
      steps: [0.5, 4],
    } as never);
    expect(tokens.map((token) => token.px)).toEqual([2, 16]);
  });
});

describe("generateSpacingSteps", () => {
  it("offers halves at the bottom and whole numbers above", () => {
    /* Where 2px is a visible difference and where it is not. */
    expect(generateSpacingSteps(6)).toEqual([0, 0.5, 1, 1.5, 2, 3, 4, 5, 6]);
  });

  it("stays inside its bounds", () => {
    expect(generateSpacingSteps(0)).toEqual([0, 0.5, 1]);
    expect(generateSpacingSteps(9999).at(-1)).toBeLessThanOrEqual(64);
  });
});

describe("normalizeSpacingScale", () => {
  it("sorts and de-duplicates a stored list", () => {
    const scale = normalizeSpacingScale({
      baseUnitPx: 4,
      density: 1,
      steps: [4, 1, 4, 0.5, 2],
    });
    expect(scale.steps).toEqual([0.5, 1, 2, 4]);
  });

  it("clamps a base unit rather than replacing it", () => {
    /* A 20px experiment comes back as 16, not as 4: the intent was a roomy
       system, and resetting to the default loses it. */
    expect(
      normalizeSpacingScale({
        baseUnitPx: 20,
        density: 1,
        steps: [1],
      }).baseUnitPx,
    ).toBe(MAX_SPACING_BASE_UNIT_PX);
    expect(
      normalizeSpacingScale({
        baseUnitPx: 0,
        density: 1,
        steps: [1],
      }).baseUnitPx,
    ).toBe(MIN_SPACING_BASE_UNIT_PX);
  });

  it("drops a step that is not a usable multiple", () => {
    const scale = normalizeSpacingScale({
      baseUnitPx: 4,
      density: 1,
      steps: [1, -2, Number.NaN, 999, 2],
    });
    expect(scale.steps).toEqual([1, 2]);
  });

  it("falls back rather than leaving a scale with nothing in it", () => {
    /* An empty scale renders nothing and cannot be edited back into existence
       from the UI. */
    expect(
      normalizeSpacingScale({
        baseUnitPx: 4,
        density: 1,
        steps: [],
      }).steps,
    ).toEqual(defaultSpacingScale().steps);
  });

  it("clamps density rather than replacing it", () => {
    expect(
      normalizeSpacingScale({
        baseUnitPx: 4,
        density: 4,
        steps: [1],
      }).density,
    ).toBe(MAX_SPACING_DENSITY);
    expect(
      normalizeSpacingScale({
        baseUnitPx: 4,
        density: 0,
        steps: [1],
      }).density,
    ).toBe(MIN_SPACING_DENSITY);
  });

  it("fills a missing density so an old file stays at 1", () => {
    expect(
      normalizeSpacingScale({
        baseUnitPx: 4,
        steps: [1],
      } as never).density,
    ).toBe(DEFAULT_SPACING_DENSITY);
  });
});

describe("toggleSpacingStep", () => {
  it("prunes a kept step and keeps a pruned one, in order", () => {
    const scale = { ...defaultSpacingScale(), steps: [1, 2, 4] };
    expect(toggleSpacingStep(scale, 2).steps).toEqual([1, 4]);
    expect(toggleSpacingStep(scale, 3).steps).toEqual([1, 2, 3, 4]);
    expect(toggleSpacingStep(scale, 3)).toMatchObject({
      baseUnitPx: scale.baseUnitPx,
      density: scale.density,
    });
  });
});

describe("density presets", () => {
  it("sit inside the density bounds", () => {
    for (const preset of SPACING_DENSITY_PRESETS) {
      expect(preset.value).toBeGreaterThanOrEqual(MIN_SPACING_DENSITY);
      expect(preset.value).toBeLessThanOrEqual(MAX_SPACING_DENSITY);
    }
  });

  it("move the layout steps and leave the fine grid where it is", () => {
    const at = (density: number) =>
      Object.fromEntries(
        resolveSpacing({ ...defaultSpacingScale(), density }).map((token) => [
          token.step,
          token.px,
        ]),
      );
    const compact = at(0.75);
    const spacious = at(1.25);
    // The fine grid — 0.5, 1, 1.5 on a 4px base — is 2, 4 and 6px at any
    // density: the last step below where density starts.
    for (const step of [0.5, 1, 1.5]) {
      expect(compact[step]).toBe(step * 4);
      expect(spacious[step]).toBe(step * 4);
    }
    // Step 2, the first layout step, moves: 8px at 1x.
    expect(compact[2]).toBe(6);
    expect(spacious[2]).toBe(10);
    expect(spacious[16]).toBe(80);
  });
});

describe("spacingChipSteps", () => {
  it("offers the standard chips plus any step the scale holds", () => {
    const chips = spacingChipSteps({ steps: [0, 2.5, 4] });
    expect(chips).toContain(2.5);
    expect(chips).toEqual([...chips].sort((a, b) => a - b));
    expect(chips).toEqual(
      [...new Set([...generateSpacingSteps(16), 2.5])].sort((a, b) => a - b),
    );
  });
});

describe("nearestSpacingToken", () => {
  const tokens = resolveSpacing({ ...defaultSpacingScale(), steps: [0, 2, 6] });

  it("is the step itself when the scale has it", () => {
    expect(nearestSpacingToken(tokens, 2)?.step).toBe(2);
  });

  it("is the nearest step once it is pruned, the lower on a tie", () => {
    expect(nearestSpacingToken(tokens, 5)?.step).toBe(6);
    expect(nearestSpacingToken(tokens, 4)?.step).toBe(2);
  });

  it("is undefined for no tokens", () => {
    expect(nearestSpacingToken([], 4)).toBeUndefined();
  });
});

describe("spacingDensityBehavior", () => {
  const token = (step: number) =>
    resolveSpacing({ ...defaultSpacingScale(), steps: [step] })[0]!;

  it("calls a fine step grid, at any density", () => {
    expect(spacingDensityBehavior(token(1), 1)).toBe("grid");
    expect(spacingDensityBehavior(token(0.5), 1.25)).toBe("grid");
  });

  it("calls a layout step scaled only when density is not 1", () => {
    expect(spacingDensityBehavior(token(4), 1.25)).toBe("scaled");
    expect(spacingDensityBehavior(token(4), 1)).toBe("unchanged");
  });

  it("says nothing of step 0", () => {
    expect(spacingDensityBehavior(token(0), 0.75)).toBe("unchanged");
  });
});

describe("matchingSpacingDensityPreset", () => {
  it("names the preset a density is, and none between", () => {
    expect(matchingSpacingDensityPreset(0.75)?.id).toBe("compact");
    expect(matchingSpacingDensityPreset(1)?.id).toBe("default");
    expect(matchingSpacingDensityPreset(1.1)).toBeNull();
  });
});

describe("resolveSpacingSlots", () => {
  const tokens = resolveSpacing(defaultSpacingScale());

  it("gives each slot its own step, 24, 8 and 16px to start", () => {
    const slots = resolveSpacingSlots(tokens, SPACING_SLOT_STEPS)!;
    expect([slots.inset.px, slots.stack.px, slots.columns.px]).toEqual([
      24, 8, 16,
    ]);
  });

  it("moves only a slot whose step was pruned, to the nearest", () => {
    const pruned = resolveSpacing({
      ...defaultSpacingScale(),
      steps: [0, 1, 2, 4, 8],
    });
    const slots = resolveSpacingSlots(pruned, SPACING_SLOT_STEPS)!;
    // Inset's 6 is gone: 4 and 8 are as near, and the lower wins.
    expect(slots.inset.step).toBe(4);
    expect(slots.stack.step).toBe(2);
    expect(slots.columns.step).toBe(4);
  });

  it("is null for no tokens", () => {
    expect(resolveSpacingSlots([], SPACING_SLOT_STEPS)).toBeNull();
  });
});
