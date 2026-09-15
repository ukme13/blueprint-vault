import { describe, expect, it } from "vitest";
import {
  MAX_RADIUS_PX,
  defaultRadiusScale,
  resolveRadius,
  scaledRadiusPx,
} from "./radius";
import {
  RADIUS_LINK_PRESET_ID,
  bindRadiusToken,
  radiusLinkPreset,
  unlinkRadiusToken,
} from "./radius-edit";

function token(scale = defaultRadiusScale(), id: string) {
  return resolveRadius(scale).find((each) => each.id === id)!;
}

describe("unlinkRadiusToken", () => {
  it("holds a named use still while the multiplier moves the rest", () => {
    /* The point of unlinking: squarer buttons, rounder cards. */
    const unlinked = unlinkRadiusToken(defaultRadiusScale(), "element", 20);
    const doubled = { ...unlinked, multiplier: 2 };

    expect(token(doubled, "element")).toMatchObject({
      px: 20,
      linked: false,
    });
    expect(token(doubled, "container")!.px).toBe(24);
    expect(token(doubled, "none")!.px).toBe(0);
    expect(token(unlinked, "full")!.px).toBe(9999);
  });

  it("does not rebind when the typed px matches the current scale", () => {
    const unlinked = unlinkRadiusToken(defaultRadiusScale(), "element", 8);
    expect(token(unlinked, "element")).toMatchObject({ px: 8, linked: false });
    expect(token({ ...unlinked, multiplier: 2 }, "element")!.px).toBe(8);
  });

  it("leaves none and full alone", () => {
    const scale = unlinkRadiusToken(defaultRadiusScale(), "none", 20);
    expect(scale.tokens.find((each) => each.id === "none")!.unlinkedPx).toBe(
      undefined,
    );
    expect(token(scale, "none")!.px).toBe(0);
  });

  it("clamps rather than storing a value a corner cannot use", () => {
    const scale = unlinkRadiusToken(defaultRadiusScale(), "element", 400);
    expect(scale.tokens.find((each) => each.id === "element")!.unlinkedPx).toBe(
      MAX_RADIUS_PX,
    );
  });
});

describe("bindRadiusToken", () => {
  it("puts a use back on the multiplier", () => {
    const bound = bindRadiusToken(
      unlinkRadiusToken(defaultRadiusScale(), "element", 20),
      "element",
    );

    expect(bound.tokens.find((each) => each.id === "element")!.unlinkedPx).toBe(
      undefined,
    );
    expect(token({ ...bound, multiplier: 2 }, "element")!.px).toBe(16);
  });
});

describe("radiusLinkPreset", () => {
  it("names the one value that means follow roundness", () => {
    const scale = defaultRadiusScale();
    const element = scale.tokens.find((each) => each.id === "element")!;
    const preset = radiusLinkPreset(scaledRadiusPx(element, scale.multiplier));

    expect(preset).toEqual({
      id: RADIUS_LINK_PRESET_ID,
      name: "Follow roundness",
      value: 8,
    });
  });
});
