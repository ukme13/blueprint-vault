import { describe, expect, it } from "vitest";
import {
  MAX_RADIUS_MULTIPLIER,
  MIN_RADIUS_MULTIPLIER,
  RADIUS_FULL_PX,
  defaultRadiusScale,
  normalizeRadiusScale,
  radiusCssVariables,
  resolveRadius,
} from "./radius";

function byId(scale = defaultRadiusScale(), multiplier?: number) {
  const resolved = resolveRadius(
    multiplier === undefined ? scale : { ...scale, multiplier },
  );
  return new Map(resolved.map((token) => [token.id, token]));
}

describe("the default scale", () => {
  it("names tokens for what they go on, not for their size", () => {
    /* --radius-container says where it goes; --radius-3 only says it is the
       third biggest. */
    expect(defaultRadiusScale().tokens.map((token) => token.id)).toEqual([
      "none",
      "inner",
      "element",
      "container",
      "page",
      "full",
    ]);
  });

  it("hands back a copy, not the shared tokens", () => {
    const first = defaultRadiusScale();
    first.tokens[1]!.basePx = 99;
    expect(defaultRadiusScale().tokens[1]!.basePx).toBe(4);
  });
});

describe("the multiplier", () => {
  it("moves every named size together", () => {
    /* One decision — "make the whole thing rounder" — rather than five edits
       that drift apart. */
    const doubled = byId(undefined, 2);
    expect(doubled.get("inner")!.px).toBe(8);
    expect(doubled.get("element")!.px).toBe(16);
    expect(doubled.get("container")!.px).toBe(24);
    expect(doubled.get("page")!.px).toBe(56);
  });

  it("leaves a square corner square and a pill a pill", () => {
    /* Zero scaled is still zero, and half of 9999px is still a pill, so
       neither is a size the multiplier can say anything useful about. */
    for (const multiplier of [0, 1, 2, 3]) {
      const tokens = byId(undefined, multiplier);
      expect(tokens.get("none")!.px).toBe(0);
      expect(tokens.get("full")!.px).toBe(RADIUS_FULL_PX);
    }
  });

  it("squares the named corners at zero", () => {
    /* A real choice, which is why zero is the floor rather than clamped away
       from. */
    const squared = byId(undefined, 0);
    expect(squared.get("element")!.px).toBe(0);
    expect(squared.get("page")!.px).toBe(0);
  });

  it("rounds to whole pixels", () => {
    expect(byId(undefined, 1.1).get("inner")!.px).toBe(4);
    expect(byId(undefined, 1.5).get("page")!.px).toBe(42);
  });
});

describe("normalizeRadiusScale", () => {
  it("clamps rather than replaces", () => {
    /* A 4× experiment comes back as 3: the intent was rounder, and resetting
       to 1 loses it. */
    expect(normalizeRadiusScale({ multiplier: 4, tokens: [] }).multiplier).toBe(
      MAX_RADIUS_MULTIPLIER,
    );
    expect(
      normalizeRadiusScale({ multiplier: -1, tokens: [] }).multiplier,
    ).toBe(MIN_RADIUS_MULTIPLIER);
  });

  it("drops a duplicate id", () => {
    /* Two tokens sharing an id export one variable twice and the later one
       silently wins. */
    const scale = normalizeRadiusScale({
      multiplier: 1,
      tokens: [
        { id: "element", name: "A", description: "", basePx: 8, scales: true },
        { id: "element", name: "B", description: "", basePx: 2, scales: true },
      ],
    });
    expect(scale.tokens).toHaveLength(1);
    expect(scale.tokens[0]!.name).toBe("A");
  });

  it("treats a token stored without `scales` as one that scales", () => {
    const scale = normalizeRadiusScale({
      multiplier: 2,
      tokens: [
        { id: "element", name: "E", description: "", basePx: 8 },
      ] as never,
    });
    expect(resolveRadius(scale)[0]!.px).toBe(16);
  });

  it("falls back rather than leaving nothing to render", () => {
    expect(
      normalizeRadiusScale({ multiplier: 1, tokens: [] }).tokens,
    ).toHaveLength(6);
  });
});

describe("radiusCssVariables", () => {
  it("emits px, not rem", () => {
    /* Spacing should grow when somebody raises their browser font size; a 4px
       corner should not. */
    const variables = radiusCssVariables(defaultRadiusScale());
    expect(variables["--radius-element"]).toBe("8px");
    expect(
      Object.values(variables).every((value) => value.endsWith("px")),
    ).toBe(true);
  });
});
