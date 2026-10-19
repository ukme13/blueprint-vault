import { describe, expect, it } from "vitest";
import { defaultMotionScale, stageDuration, stageEasing } from "./index";
import { easingToken } from "./easing";

const scale = (ids: Array<[string, number]>) => ({
  durations: ids.map(([id, ms]) => ({ id, name: id, ms })),
  easings: [easingToken("standard", "Standard", [0.2, 0, 0, 1])],
});

describe("which token the stage plays a moment with", () => {
  it("is the one of the name, in the default scale", () => {
    const motion = defaultMotionScale();
    expect(stageDuration(motion, "press")?.id).toBe("fast");
    expect(stageDuration(motion, "panel")?.id).toBe("normal");
    expect(stageDuration(motion, "dialog")?.id).toBe("moderate");
  });

  it("is the token at the same place in the ramp when the name is not there", () => {
    /* Carbon's six, with none of the three names. */
    const carbon = scale([
      ["fast-01", 70],
      ["fast-02", 110],
      ["moderate-01", 150],
      ["moderate-02", 240],
      ["slow-01", 400],
      ["slow-02", 700],
    ]);
    expect(stageDuration(carbon, "press")?.id).toBe("fast-02");
    expect(stageDuration(carbon, "panel")?.id).toBe("moderate-02");
    expect(stageDuration(carbon, "dialog")?.id).toBe("slow-01");
  });

  it("takes the name where it has it and the ramp where it has not, in one scale", () => {
    const primer = scale([
      ["fast", 150],
      ["normal", 200],
      ["slow", 300],
    ]);
    expect(stageDuration(primer, "press")?.ms).toBe(150);
    expect(stageDuration(primer, "panel")?.ms).toBe(200);
    expect(stageDuration(primer, "dialog")?.ms).toBe(300);
  });

  it("is always a token the scale has, however short", () => {
    const one = scale([["only", 90]]);
    for (const moment of ["press", "panel", "dialog"] as const) {
      expect(stageDuration(one, moment)?.id).toBe("only");
    }
  });

  it("is nothing for a scale with no durations", () => {
    expect(stageDuration({ durations: [], easings: [] }, "press")).toBeNull();
    expect(stageEasing({ durations: [], easings: [] })).toBeNull();
  });

  it("plays with the standard curve, or the first one there is", () => {
    expect(stageEasing(defaultMotionScale())?.id).toBe("standard");
    const other = {
      durations: [],
      easings: [easingToken("glide", "Glide", [0.1, 0.9, 0.2, 1])],
    };
    expect(stageEasing(other)?.id).toBe("glide");
  });
});
