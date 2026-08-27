import { describe, expect, it } from "vitest";
import {
  MIN_GENERATED_FONT_SIZE_PX,
  roundToEvenPx,
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
    // The ratio governs the exact value; fontSizePx is that value rounded even
    // and floored at 11, so the maths is asserted against exactFontSizePx.
    const steps = generateTypeSteps(16, 2, 5);

    expect(steps[3]!.exactFontSizePx).toBeCloseTo(32);
    expect(steps[4]!.exactFontSizePx).toBeCloseTo(64);
    expect(steps[1]!.exactFontSizePx).toBeCloseTo(8);
    expect(steps[0]!.exactFontSizePx).toBeCloseTo(4);

    // Both bottom steps fall under the floor and clamp to it.
    expect(steps[0]!.fontSizePx).toBe(11);
    expect(steps[1]!.fontSizePx).toBe(11);
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

      expect(bodyStep.exactFontSizePx).toBeCloseTo(16);
      expect(captionStep.exactFontSizePx).toBeCloseTo(16 / 1.25 ** 2);
      // Base is even already; caption falls under the floor and clamps.
      expect(bodyStep.fontSizePx).toBe(16);
      expect(captionStep.fontSizePx).toBe(11);
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

describe("ramp shape", () => {
  it("puts base two steps up from the bottom, with the rest above", () => {
    // A scale needs a little room under body and a lot above it, so a centred
    // ramp spent half its steps on sizes nobody sets.
    const steps = generateTypeSteps(16, 1.25, 9);
    expect(steps.map((step) => step.offset)).toEqual([
      -2, -1, 0, 1, 2, 3, 4, 5, 6,
    ]);
  });

  it("never goes below two steps under base", () => {
    [5, 9, 16, 24].forEach((count) => {
      const steps = generateTypeSteps(16, 1.25, count);
      expect(Math.min(...steps.map((step) => step.offset))).toBe(-2);
    });
  });

  it("copes when there are fewer steps than the room below base", () => {
    const steps = generateTypeSteps(16, 1.25, 3);
    expect(steps.filter((step) => step.isBase)).toHaveLength(1);
  });
});

describe("roundToEvenPx", () => {
  it("rounds to the nearest even number", () => {
    expect(roundToEvenPx(31.25)).toBe(32);
    expect(roundToEvenPx(12.8)).toBe(12);
    expect(roundToEvenPx(48.83)).toBe(48);
  });

  it("breaks a tie toward the multiple of four", () => {
    // 25 sits between 24 and 26 and appears on the default scale.
    expect(roundToEvenPx(25)).toBe(24);
    // 27 sits between 26 and 28; 28 is the multiple of four.
    expect(roundToEvenPx(27)).toBe(28);
  });

  it("never goes below the floor, the one odd size allowed", () => {
    expect(roundToEvenPx(10.24)).toBe(MIN_GENERATED_FONT_SIZE_PX);
    expect(roundToEvenPx(4)).toBe(MIN_GENERATED_FONT_SIZE_PX);
    expect(MIN_GENERATED_FONT_SIZE_PX).toBe(11);
  });

  it("leaves an even value alone", () => {
    [12, 16, 20, 64].forEach((px) => expect(roundToEvenPx(px)).toBe(px));
  });
});

describe("generated sizes", () => {
  it("are all even, apart from the floor", () => {
    const steps = generateTypeSteps(16, 1.25, 9);
    steps.forEach((step) => {
      const isEven = step.fontSizePx % 2 === 0;
      expect(isEven || step.fontSizePx === MIN_GENERATED_FONT_SIZE_PX).toBe(
        true,
      );
    });
  });

  it("keeps the exact value so the drift stays visible", () => {
    const steps = generateTypeSteps(16, 1.25, 9);
    const plusTwo = steps.find((step) => step.offset === 2)!;
    expect(plusTwo.exactFontSizePx).toBe(25);
    expect(plusTwo.fontSizePx).toBe(24);
  });

  it("allows two steps to share a size at a tight ratio", () => {
    /* Forcing them apart would distort the ratio to hide a choice the user
       made. Two steps really do land on 14 here. */
    const steps = generateTypeSteps(16, 1.1, 5);
    const sizes = steps.map((step) => step.fontSizePx);
    expect(new Set(sizes).size).toBeLessThan(sizes.length);
  });
});
