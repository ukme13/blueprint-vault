import { describe, expect, it } from "vitest";
import {
  assignDefaultRoles,
  generateTypeScale,
  generateTypeSteps,
  MAX_STEP_COUNT,
  MIN_STEP_COUNT,
} from "./scale";

describe("generateTypeSteps", () => {
  it("holds the middle step at the base font size", () => {
    const steps = generateTypeSteps(16, 1.25, 5);

    expect(steps).toHaveLength(5);
    expect(steps[2]!.fontSizePx).toBeCloseTo(16);
    expect(steps[2]!.isBase).toBe(true);
  });

  it("grows steps above the base and shrinks steps below it by the ratio", () => {
    const steps = generateTypeSteps(16, 2, 5);

    expect(steps[3]!.fontSizePx).toBeCloseTo(32);
    expect(steps[4]!.fontSizePx).toBeCloseTo(64);
    expect(steps[1]!.fontSizePx).toBeCloseTo(8);
    expect(steps[0]!.fontSizePx).toBeCloseTo(4);
  });

  it("rejects out-of-range inputs", () => {
    expect(() => generateTypeSteps(16, 1.25, MIN_STEP_COUNT - 1)).toThrow(
      "Step count",
    );
    expect(() => generateTypeSteps(16, 1.25, MAX_STEP_COUNT + 1)).toThrow(
      "Step count",
    );
    expect(() => generateTypeSteps(4, 1.25, 5)).toThrow("Base font size");
    expect(() => generateTypeSteps(16, 3, 5)).toThrow("Scale ratio");
  });
});

describe("assignDefaultRoles", () => {
  it("maps the six semantic roles from the smallest to the largest step", () => {
    const steps = generateTypeSteps(16, 1.25, 9);
    const roles = assignDefaultRoles(steps);

    expect(roles.map((role) => role.role)).toEqual([
      "caption",
      "label",
      "body",
      "title",
      "heading",
      "display",
    ]);

    const captionStep = steps.find((step) => step.step === roles[0]!.step)!;
    const displayStep = steps.find((step) => step.step === roles.at(-1)!.step)!;
    expect(captionStep.fontSizePx).toBeLessThan(displayStep.fontSizePx);
  });

  it("keeps role sizes anchored to the base step regardless of step count", () => {
    const roleByName = (
      roles: ReturnType<typeof assignDefaultRoles>,
      role: string,
    ) => roles.find((candidate) => candidate.role === role)!;

    for (const stepCount of [9, 15, 21]) {
      const steps = generateTypeSteps(16, 1.25, stepCount);
      const roles = assignDefaultRoles(steps);
      const bodyStep = steps.find(
        (step) => step.step === roleByName(roles, "body").step,
      )!;
      const captionStep = steps.find(
        (step) => step.step === roleByName(roles, "caption").step,
      )!;

      expect(bodyStep.fontSizePx).toBeCloseTo(16);
      expect(captionStep.fontSizePx).toBeCloseTo(16 / 1.25 ** 2);
    }
  });

  it("still returns all six roles when the scale has fewer than six steps", () => {
    const steps = generateTypeSteps(16, 1.25, 3);
    const roles = assignDefaultRoles(steps);

    expect(roles).toHaveLength(6);
    roles.forEach((role) => {
      expect(steps.some((step) => step.step === role.step)).toBe(true);
    });
  });
});

describe("generateTypeScale", () => {
  it("produces steps and role assignments together", () => {
    const scale = generateTypeScale({
      fontFamily: "Inter, sans-serif",
      baseFontSizePx: 16,
      ratio: 1.25,
      stepCount: 7,
    });

    expect(scale.steps).toHaveLength(7);
    expect(scale.roles).toHaveLength(6);
    expect(scale.fontFamily).toBe("Inter, sans-serif");
  });
});
