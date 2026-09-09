import { describe, expect, it } from "vitest";
import { generateTypeSteps } from "./typography/scale";
import { TYPE_SCALE_RATIO_PRESETS } from "./typography/presets";
import {
  bindPreset,
  clampHybridValue,
  detachValue,
  filterPresets,
  formatBoundValue,
  formatListValue,
  formatRawInput,
  hybridPresetsFromModularScale,
  hybridPresetsFromTypeSteps,
  hybridValueFromStepOffset,
  moveHighlight,
  nudgeValue,
  parseRawNumber,
  resolveHybridValue,
  valuesMatch,
  type HybridTokenPreset,
} from "./hybrid-tokenized-input";

const RATIOS = hybridPresetsFromModularScale(TYPE_SCALE_RATIO_PRESETS);

const SPACING: HybridTokenPreset[] = [
  { id: "base-2", name: "Dense", value: 2 },
  { id: "base-4", name: "Default", value: 4 },
  { id: "base-8", name: "Comfortable", value: 8 },
];

describe("hybridPresetsFromModularScale", () => {
  it("exposes every musical interval as a hybrid preset", () => {
    expect(RATIOS.map((preset) => [preset.id, preset.value])).toEqual([
      ["minor-second", 1.067],
      ["major-second", 1.125],
      ["minor-third", 1.2],
      ["major-third", 1.25],
      ["perfect-fourth", 1.333],
      ["augmented-fourth", 1.414],
      ["perfect-fifth", 1.5],
      ["golden-ratio", 1.618],
    ]);
  });
});

describe("hybridPresetsFromTypeSteps", () => {
  it("names each step by its offset and keeps the given order", () => {
    const steps = generateTypeSteps(16, 1.25, 5);
    const presets = hybridPresetsFromTypeSteps(steps);
    expect(presets.map((preset) => preset.id)).toEqual(
      steps.map((step) => String(step.offset)),
    );
    expect(presets.map((preset) => preset.value)).toEqual(
      steps.map((step) => step.fontSizePx),
    );
    expect(presets.find((preset) => preset.id === "0")?.name).toBe("+0");
  });
});

describe("hybridValueFromStepOffset", () => {
  it("binds a following role to the step id", () => {
    expect(hybridValueFromStepOffset(3, 31)).toEqual({
      isPreset: true,
      presetId: "3",
      value: 31,
    });
  });

  it("stays raw when the size was typed", () => {
    expect(hybridValueFromStepOffset(null, 14)).toEqual({
      isPreset: false,
      value: 14,
    });
  });
});

describe("bindPreset and detachValue", () => {
  it("binds the preset id and resolved number", () => {
    expect(bindPreset(RATIOS[3]!)).toEqual({
      isPreset: true,
      presetId: "major-third",
      value: 1.25,
    });
  });

  it("drops the preset id when detaching", () => {
    expect(detachValue(1.25)).toEqual({ isPreset: false, value: 1.25 });
  });
});

describe("filterPresets", () => {
  it("matches on name, id, or numeric ratio", () => {
    expect(filterPresets(RATIOS, "golden").map((preset) => preset.id)).toEqual([
      "golden-ratio",
    ]);
    expect(filterPresets(RATIOS, "1.25").map((preset) => preset.id)).toEqual([
      "major-third",
    ]);
    expect(
      filterPresets(RATIOS, "MAJOR-THIRD").map((preset) => preset.id),
    ).toEqual(["major-third"]);
  });

  it("returns nothing when the query misses", () => {
    expect(filterPresets(RATIOS, "no such scale")).toEqual([]);
  });
});

describe("resolveHybridValue", () => {
  it("binds a stored number that matches a preset", () => {
    expect(resolveHybridValue(1.25, RATIOS, null)).toEqual({
      isPreset: true,
      presetId: "major-third",
      value: 1.25,
    });
  });

  it("stays raw after a deliberate detach of a matching number", () => {
    expect(resolveHybridValue(1.25, RATIOS, 1.25)).toEqual({
      isPreset: false,
      value: 1.25,
    });
  });

  it("binds again once the number no longer matches the detach", () => {
    expect(resolveHybridValue(1.618, RATIOS, 1.25).presetId).toBe(
      "golden-ratio",
    );
  });

  it("stays raw when no preset matches", () => {
    expect(resolveHybridValue(1.28, RATIOS, null)).toEqual({
      isPreset: false,
      value: 1.28,
    });
  });
});

describe("parseRawNumber and nudgeValue", () => {
  it("clamps and rounds a typed ratio", () => {
    expect(
      parseRawNumber("1.2804", 1.25, { min: 1.05, max: 2, decimals: 3 }),
    ).toBe(1.28);
    expect(parseRawNumber("9", 1.25, { min: 1.05, max: 2, decimals: 3 })).toBe(
      2,
    );
    expect(parseRawNumber("nope", 1.25, { min: 1.05, max: 2 })).toBe(1.25);
  });

  it("nudges a custom value by step without crossing the bounds", () => {
    expect(nudgeValue(1.25, 1, 0.001, 1.05, 2)).toBe(1.251);
    expect(nudgeValue(1.05, -1, 0.001, 1.05, 2)).toBe(1.05);
    expect(nudgeValue(4, 1, 1, 1, 16, 0)).toBe(5);
  });
});

describe("formatting and highlight", () => {
  it("pads bound ratios and leaves raw input unpadded", () => {
    expect(formatBoundValue(1.25)).toBe("1.250");
    expect(formatRawInput(1.25)).toBe("1.25");
    expect(formatListValue(4, 0, "px")).toBe("4px");
  });

  it("wraps highlight through the filtered list", () => {
    expect(moveHighlight(0, -1, 8)).toBe(7);
    expect(moveHighlight(7, 1, 8)).toBe(0);
    expect(moveHighlight(-1, 1, 8)).toBe(0);
    expect(moveHighlight(0, 1, 0)).toBe(-1);
  });

  it("treats 1.250 and 1.25 as the same bound value", () => {
    expect(valuesMatch(1.25, 1.25)).toBe(true);
    expect(valuesMatch(1.25, 1.28)).toBe(false);
    expect(clampHybridValue(0, 1, 16)).toBe(1);
  });

  it("does not let a spacing preset leave the grid", () => {
    for (const preset of SPACING) {
      expect(preset.value).toBeGreaterThanOrEqual(1);
      expect(preset.value).toBeLessThanOrEqual(16);
    }
  });
});
