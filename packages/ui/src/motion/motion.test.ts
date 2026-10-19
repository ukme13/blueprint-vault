import { describe, expect, it } from "vitest";
import {
  DEFAULT_DURATIONS,
  DEFAULT_EASINGS,
  defaultMotionScale,
  cubicBezierCss,
  easingToken,
  formatMotionCss,
  formatMotionDesignTokens,
  formatMotionTailwind,
  motionCssLines,
  motionDesignTokenGroups,
  motionOrDefault,
  normalizeMotionScale,
  MAX_DURATION_MS,
} from "./index";

describe("the default motion scale", () => {
  it("has the five paces, in order", () => {
    expect(defaultMotionScale().durations).toEqual([
      { id: "instant", name: "Instant", ms: 100 },
      { id: "fast", name: "Fast", ms: 150 },
      { id: "normal", name: "Normal", ms: 250 },
      { id: "moderate", name: "Moderate", ms: 350 },
      { id: "slow", name: "Slow", ms: 500 },
    ]);
  });

  it("has the four curves, each with its CSS written from its numbers", () => {
    const easings = defaultMotionScale().easings;
    expect(easings.map((easing) => [easing.id, easing.curve])).toEqual([
      ["standard", [0.2, 0, 0, 1]],
      ["decelerate", [0, 0, 0.2, 1]],
      ["accelerate", [0.3, 0, 1, 1]],
      ["emphasized", [0.05, 0.7, 0.1, 1]],
    ]);
    expect(easings.map((easing) => easing.css)).toEqual([
      "cubic-bezier(0.2, 0, 0, 1)",
      "cubic-bezier(0, 0, 0.2, 1)",
      "cubic-bezier(0.3, 0, 1, 1)",
      "cubic-bezier(0.05, 0.7, 0.1, 1)",
    ]);
  });

  it("goes slower as the names do", () => {
    const ms = DEFAULT_DURATIONS.map((token) => token.ms);
    expect(ms).toEqual([...ms].sort((a, b) => a - b));
  });

  it("is a copy each time, so editing one workspace cannot edit the next", () => {
    const first = defaultMotionScale();
    first.durations[0]!.ms = 1;
    first.easings[0]!.curve[0] = 0.9;
    const second = defaultMotionScale();
    expect(second.durations[0]!.ms).toBe(DEFAULT_DURATIONS[0]!.ms);
    expect(second.easings[0]!.curve[0]).toBe(DEFAULT_EASINGS[0]!.curve[0]);
  });
});

describe("a curve as CSS", () => {
  it("writes numbers as a hand would", () => {
    expect(cubicBezierCss([0.05, 0.7, 0.1, 1.0])).toBe(
      "cubic-bezier(0.05, 0.7, 0.1, 1)",
    );
    expect(cubicBezierCss([0, 0, 0.58, 1])).toBe("cubic-bezier(0, 0, 0.58, 1)");
    expect(easingToken("x", "X", [0.25, 0.1, 0.25, 1]).css).toBe(
      "cubic-bezier(0.25, 0.1, 0.25, 1)",
    );
  });
});

describe("reading a motion scale", () => {
  it("fills a missing scale, a missing family and a non-object with the default", () => {
    expect(normalizeMotionScale(undefined)).toEqual(defaultMotionScale());
    expect(normalizeMotionScale(null)).toEqual(defaultMotionScale());
    expect(normalizeMotionScale("fast")).toEqual(defaultMotionScale());
    expect(normalizeMotionScale([])).toEqual(defaultMotionScale());
    const only = normalizeMotionScale({
      durations: [{ id: "tick", name: "Tick", ms: 40 }],
    });
    expect(only.durations).toEqual([{ id: "tick", name: "Tick", ms: 40 }]);
    expect(only.easings).toEqual(defaultMotionScale().easings);
  });

  it("round-trips a scale unchanged", () => {
    const scale = defaultMotionScale();
    expect(normalizeMotionScale(JSON.parse(JSON.stringify(scale)))).toEqual(
      scale,
    );
  });

  it("keeps the order a person put tokens in, and the first of a repeated id", () => {
    const read = normalizeMotionScale({
      durations: [
        { id: "slow", name: "Slow", ms: 400 },
        { id: "fast", name: "Fast", ms: 120 },
        { id: "slow", name: "Slower", ms: 900 },
      ],
    });
    expect(read.durations.map((token) => [token.id, token.ms])).toEqual([
      ["slow", 400],
      ["fast", 120],
    ]);
  });

  it("makes an id safe to use as a custom property, or leaves the token out", () => {
    const read = normalizeMotionScale({
      durations: [
        { id: " Fast ", name: "Fast", ms: 100 },
        { id: "two words", name: "Bad", ms: 100 },
        { id: "", name: "Empty", ms: 100 },
        { id: 7, name: "Number", ms: 100 },
        { id: "-lead", name: "Dash", ms: 100 },
      ],
    });
    expect(read.durations.map((token) => token.id)).toEqual(["fast"]);
  });

  it("rounds a duration to whole milliseconds and holds it in range", () => {
    const read = normalizeMotionScale({
      durations: [
        { id: "a", name: "A", ms: 149.6 },
        { id: "b", name: "B", ms: -20 },
        { id: "c", name: "C", ms: 1e9 },
      ],
    });
    expect(read.durations.map((token) => token.ms)).toEqual([
      150,
      0,
      MAX_DURATION_MS,
    ]);
  });

  it("drops a duration with no number, and names a token by its id when it has no name", () => {
    const read = normalizeMotionScale({
      durations: [
        { id: "nan", name: "N", ms: Number.NaN },
        { id: "text", name: "T", ms: "100" },
        { id: "bare", ms: 80 },
      ],
    });
    expect(read.durations).toEqual([{ id: "bare", name: "bare", ms: 80 }]);
  });

  it("holds a curve to what CSS accepts: x within 0 to 1, y within reason", () => {
    const read = normalizeMotionScale({
      easings: [
        { id: "wild", name: "Wild", curve: [-1, -9, 4, 9], css: "nonsense" },
      ],
    });
    expect(read.easings[0]!.curve).toEqual([0, -2, 1, 3]);
    expect(read.easings[0]!.css).toBe("cubic-bezier(0, -2, 1, 3)");
  });

  it("allows an overshoot in y, which is how a spring is drawn", () => {
    const read = normalizeMotionScale({
      easings: [{ id: "back", name: "Back", curve: [0.34, 1.56, 0.64, 1] }],
    });
    expect(read.easings[0]!.curve).toEqual([0.34, 1.56, 0.64, 1]);
  });

  it("writes the CSS from the numbers, not from the stored text", () => {
    const read = normalizeMotionScale({
      easings: [
        {
          id: "e",
          name: "E",
          curve: [0.2, 0, 0, 1],
          css: "cubic-bezier(9, 9, 9, 9)",
        },
      ],
    });
    expect(read.easings[0]!.css).toBe("cubic-bezier(0.2, 0, 0, 1)");
  });

  it("drops a curve that is not four numbers", () => {
    const read = normalizeMotionScale({
      easings: [
        { id: "short", name: "S", curve: [0, 0, 1] },
        { id: "text", name: "T", curve: [0, 0, "1", 1] },
        { id: "ok", name: "Ok", curve: [0, 0, 1, 1] },
      ],
    });
    expect(read.easings.map((easing) => easing.id)).toEqual(["ok"]);
  });

  it("keeps a family that is empty on purpose, and refills one that is only damage", () => {
    const defaults = defaultMotionScale();
    expect(normalizeMotionScale({ durations: [] }).durations).toEqual([]);
    expect(
      normalizeMotionScale({ durations: [{ nope: true }, 3, null] }).durations,
    ).toEqual(defaults.durations);
  });

  it("reads each family on its own", () => {
    const read = normalizeMotionScale({
      durations: "broken",
      easings: [{ id: "linear", name: "Linear", curve: [0, 0, 1, 1] }],
    });
    expect(read.durations).toEqual(defaultMotionScale().durations);
    expect(read.easings.map((easing) => easing.id)).toEqual(["linear"]);
  });

  it("is what the workspace reads its slice through", () => {
    expect(motionOrDefault(undefined)).toEqual(defaultMotionScale());
  });
});

describe("motion exports", () => {
  const scale = defaultMotionScale();

  it("writes custom properties, durations then easings", () => {
    expect(motionCssLines(scale)).toEqual([
      "  --duration-instant: 100ms;",
      "  --duration-fast: 150ms;",
      "  --duration-normal: 250ms;",
      "  --duration-moderate: 350ms;",
      "  --duration-slow: 500ms;",
      "",
      "  --ease-standard: cubic-bezier(0.2, 0, 0, 1);",
      "  --ease-decelerate: cubic-bezier(0, 0, 0.2, 1);",
      "  --ease-accelerate: cubic-bezier(0.3, 0, 1, 1);",
      "  --ease-emphasized: cubic-bezier(0.05, 0.7, 0.1, 1);",
    ]);
  });

  it("indents as asked, for a block it is placed in", () => {
    expect(motionCssLines(scale, "    ")[0]).toBe(
      "    --duration-instant: 100ms;",
    );
  });

  it("leaves out the blank line between families when one is empty", () => {
    const lines = motionCssLines({ durations: [], easings: scale.easings });
    expect(lines[0]).toBe("  --ease-standard: cubic-bezier(0.2, 0, 0, 1);");
    expect(lines).not.toContain("");
  });

  it("wraps the CSS in :root", () => {
    const css = formatMotionCss(scale);
    expect(css.startsWith(":root {\n  --duration-instant: 100ms;")).toBe(true);
    expect(css.endsWith("\n}")).toBe(true);
    expect(css).toContain("--ease-standard: cubic-bezier(0.2, 0, 0, 1);");
  });

  it("declares the theme for Tailwind, and a utility for each duration", () => {
    const tailwind = formatMotionTailwind(scale);
    expect(
      tailwind.startsWith("@theme static {\n  --duration-instant: 100ms;"),
    ).toBe(true);
    expect(tailwind).toContain(
      "--ease-decelerate: cubic-bezier(0, 0, 0.2, 1);",
    );
    expect(tailwind).toContain(
      "@utility duration-fast {\n  transition-duration: var(--duration-fast);\n}",
    );
    expect(tailwind.match(/@utility /g)).toHaveLength(scale.durations.length);
    /* An easing needs no utility: --ease-* is a theme namespace. */
    expect(tailwind).not.toContain("@utility ease-");
  });

  it("writes Design Tokens with a unit on a duration and four numbers on a curve", () => {
    const groups = motionDesignTokenGroups(scale) as {
      motion: {
        duration: Record<string, unknown>;
        easing: Record<string, unknown>;
      };
    };
    expect(groups.motion.duration).toMatchObject({
      $type: "duration",
      fast: { $value: "150ms" },
      slow: { $value: "500ms" },
    });
    expect(groups.motion.easing).toMatchObject({
      $type: "cubicBezier",
      standard: { $value: [0.2, 0, 0, 1] },
      emphasized: { $value: [0.05, 0.7, 0.1, 1] },
    });
    expect(JSON.parse(formatMotionDesignTokens(scale))).toEqual(groups);
  });

  it("never lets an export edit the scale it was given", () => {
    const own = defaultMotionScale();
    const groups = motionDesignTokenGroups(own) as {
      motion: { easing: { standard: { $value: number[] } } };
    };
    groups.motion.easing.standard.$value[0] = 0.9;
    expect(own.easings[0]!.curve[0]).toBe(0.2);
  });

  it("writes an empty scale as empty blocks, not as an error", () => {
    const empty = { durations: [], easings: [] };
    expect(formatMotionCss(empty)).toBe(":root {\n}");
    expect(formatMotionTailwind(empty)).toBe("@theme static {\n}");
  });
});
