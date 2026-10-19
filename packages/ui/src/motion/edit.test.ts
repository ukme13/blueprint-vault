import { describe, expect, it } from "vitest";
import {
  CURVE_VIEW,
  EASING_PRESETS,
  MOTION_SPEEDS,
  curveDrawing,
  curveToPixel,
  defaultMotionScale,
  formatCurveText,
  matchEasingPreset,
  moveCurveHandle,
  parseCurveText,
  pixelToCurve,
  playedMs,
  setDurationMs,
  setEasingCurve,
  type CurveFrame,
} from "./index";

const frame: CurveFrame = { width: 220, height: 200, padding: 20 };

describe("playing at a speed", () => {
  it("offers 1x, 0.5x and 0.25x", () => {
    expect([...MOTION_SPEEDS]).toEqual([1, 0.5, 0.25]);
  });

  it("takes longer the slower it is played, in whole milliseconds", () => {
    expect(playedMs(250, 1)).toBe(250);
    expect(playedMs(250, 0.5)).toBe(500);
    expect(playedMs(250, 0.25)).toBe(1000);
    expect(playedMs(70, 0.25)).toBe(280);
    expect(playedMs(0, 0.25)).toBe(0);
  });
});

describe("the easing presets", () => {
  it("are the five a person reaches for, by name", () => {
    expect(EASING_PRESETS.map((preset) => preset.name)).toEqual([
      "Ease In Out",
      "Ease Out",
      "Ease In",
      "Standard",
      "Emphasized",
    ]);
  });

  it("are the curves those names mean", () => {
    const css = Object.fromEntries(
      EASING_PRESETS.map((preset) => [preset.id, preset.css]),
    );
    expect(css["ease-in-out"]).toBe("cubic-bezier(0.42, 0, 0.58, 1)");
    expect(css["ease-out"]).toBe("cubic-bezier(0, 0, 0.58, 1)");
    expect(css["ease-in"]).toBe("cubic-bezier(0.42, 0, 1, 1)");
    expect(css.standard).toBe("cubic-bezier(0.2, 0, 0, 1)");
    expect(css.emphasized).toBe("cubic-bezier(0.05, 0.7, 0.1, 1)");
  });

  it("are all curves CSS accepts, unchanged by being read", () => {
    for (const preset of EASING_PRESETS) {
      const set = setEasingCurve(
        { durations: [], easings: [{ ...preset, id: "x" }] },
        "x",
        preset.curve,
      );
      expect(set.easings[0]!.curve).toEqual(preset.curve);
    }
  });

  it("names a curve that is one of them, and none that is not", () => {
    expect(matchEasingPreset([0.42, 0, 0.58, 1])?.name).toBe("Ease In Out");
    expect(matchEasingPreset([0.2, 0, 0, 1])?.name).toBe("Standard");
    expect(matchEasingPreset([0.42, 0, 0.58, 0.99])).toBeNull();
  });
});

describe("changing a duration", () => {
  it("sets one token and leaves the others as they were", () => {
    const scale = defaultMotionScale();
    const next = setDurationMs(scale, "normal", 275);
    expect(next.durations.find((token) => token.id === "normal")!.ms).toBe(275);
    expect(next.durations.filter((token) => token.id !== "normal")).toEqual(
      scale.durations.filter((token) => token.id !== "normal"),
    );
    expect(next.easings).toBe(scale.easings);
  });

  it("does not edit the scale it was given", () => {
    const scale = defaultMotionScale();
    setDurationMs(scale, "fast", 10);
    expect(scale.durations[1]!.ms).toBe(150);
  });

  it("holds the value to a duration a page can use", () => {
    const scale = defaultMotionScale();
    const ms = (value: number) =>
      setDurationMs(scale, "fast", value).durations[1]!.ms;
    expect(ms(-40)).toBe(0);
    expect(ms(99_999)).toBe(10_000);
    expect(ms(149.6)).toBe(150);
  });

  it("ignores a value that is not a number, and a token that is not there", () => {
    const scale = defaultMotionScale();
    expect(setDurationMs(scale, "fast", Number.NaN)).toBe(scale);
    expect(setDurationMs(scale, "nope", 10).durations).toEqual(scale.durations);
  });
});

describe("changing a curve", () => {
  it("sets one easing, with its CSS written from the new numbers", () => {
    const scale = defaultMotionScale();
    const next = setEasingCurve(scale, "standard", [0.1, 0.2, 0.3, 0.4]);
    expect(next.easings[0]).toMatchObject({
      id: "standard",
      name: "Standard",
      curve: [0.1, 0.2, 0.3, 0.4],
      css: "cubic-bezier(0.1, 0.2, 0.3, 0.4)",
    });
    expect(next.easings.slice(1)).toEqual(scale.easings.slice(1));
  });

  it("holds an x to 0 to 1, which is what CSS accepts", () => {
    const next = setEasingCurve(
      defaultMotionScale(),
      "standard",
      [-1, 0, 2, 1],
    );
    expect(next.easings[0]!.curve).toEqual([0, 0, 1, 1]);
  });

  it("ignores a curve that is not four numbers", () => {
    const scale = defaultMotionScale();
    expect(
      setEasingCurve(scale, "standard", [0, 0, 1] as unknown as [
        number,
        number,
        number,
        number,
      ]),
    ).toBe(scale);
  });
});

describe("a curve as text", () => {
  it("is written as four numbers", () => {
    expect(formatCurveText([0.42, 0, 0.58, 1])).toBe("0.42, 0, 0.58, 1");
    expect(formatCurveText([0.05, 0.7, 0.1, 1])).toBe("0.05, 0.7, 0.1, 1");
  });

  it("is read from commas, spaces, or the CSS function", () => {
    const expected = [0.42, 0, 0.58, 1];
    expect(parseCurveText("0.42, 0, 0.58, 1")).toEqual(expected);
    expect(parseCurveText("0.42 0 0.58 1")).toEqual(expected);
    expect(parseCurveText("cubic-bezier(0.42, 0, 0.58, 1)")).toEqual(expected);
    expect(parseCurveText(".42,0,.58,1")).toEqual(expected);
  });

  it("is null for what is not yet four numbers, so it is left to be finished", () => {
    expect(parseCurveText("")).toBeNull();
    expect(parseCurveText("0.4, 0, 0.5")).toBeNull();
    expect(parseCurveText("0.4, 0, 0.5, 1, 1")).toBeNull();
    expect(parseCurveText("fast")).toBeNull();
  });

  it("holds what it reads to what CSS accepts", () => {
    expect(parseCurveText("5, 0, 5, 1")).toEqual([1, 0, 1, 1]);
  });

  it("round-trips every preset", () => {
    for (const preset of EASING_PRESETS) {
      expect(parseCurveText(formatCurveText(preset.curve))).toEqual(
        preset.curve,
      );
    }
  });
});

describe("drawing a curve", () => {
  it("puts the corners where 0,0 and 1,1 are, with room round them", () => {
    const start = curveToPixel({ x: 0, y: 0 }, frame);
    const end = curveToPixel({ x: 1, y: 1 }, frame);
    expect(start.x).toBe(frame.padding);
    expect(end.x).toBe(frame.width - frame.padding);
    /* y runs up the page: the end is higher than the start. */
    expect(end.y).toBeLessThan(start.y);
  });

  it("keeps y in the view, so an overshoot has room above and below", () => {
    const top = curveToPixel({ x: 0, y: CURVE_VIEW.maxY }, frame);
    const bottom = curveToPixel({ x: 0, y: CURVE_VIEW.minY }, frame);
    expect(top.y).toBe(frame.padding);
    expect(bottom.y).toBe(frame.height - frame.padding);
  });

  it("turns a pixel back into the value that drew it", () => {
    for (const point of [
      { x: 0, y: 0 },
      { x: 0.42, y: 0 },
      { x: 0.58, y: 1 },
      { x: 1, y: 1.2 },
      { x: 0.3, y: -0.4 },
    ]) {
      expect(pixelToCurve(curveToPixel(point, frame), frame)).toEqual(point);
    }
  });

  it("holds a pixel outside the frame to the view's edge", () => {
    expect(pixelToCurve({ x: -500, y: 9_000 }, frame)).toEqual({
      x: 0,
      y: CURVE_VIEW.minY,
    });
    expect(pixelToCurve({ x: 9_000, y: -500 }, frame)).toEqual({
      x: 1,
      y: CURVE_VIEW.maxY,
    });
  });

  it("describes the path from the first corner to the last through both handles", () => {
    const drawing = curveDrawing([0.42, 0, 0.58, 1], frame);
    const [start, end] = [drawing.start, drawing.end];
    expect(drawing.path).toBe(
      `M ${start.x} ${start.y} C ${drawing.handle1.x} ${drawing.handle1.y}, ` +
        `${drawing.handle2.x} ${drawing.handle2.y}, ${end.x} ${end.y}`,
    );
    expect(drawing.handle1).toEqual(curveToPixel({ x: 0.42, y: 0 }, frame));
    expect(drawing.handle2).toEqual(curveToPixel({ x: 0.58, y: 1 }, frame));
  });

  it("moves one handle and leaves the other", () => {
    const curve: [number, number, number, number] = [0.2, 0, 0, 1];
    expect(moveCurveHandle(curve, 1, { x: 0.5, y: 0.25 })).toEqual([
      0.5, 0.25, 0, 1,
    ]);
    expect(moveCurveHandle(curve, 2, { x: 0.6, y: 0.9 })).toEqual([
      0.2, 0, 0.6, 0.9,
    ]);
    expect(curve).toEqual([0.2, 0, 0, 1]);
  });
});
