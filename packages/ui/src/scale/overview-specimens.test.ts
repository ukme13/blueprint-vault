import { describe, expect, it } from "vitest";
import { nestedRadii, spacingSpecimen } from "./overview-specimens";
import { defaultRadiusScale } from "./radius";
import { defaultSpacingScale } from "./spacing";

describe("nestedRadii", () => {
  it("nests page, container, element, inner and none, outermost first", () => {
    expect(
      nestedRadii(defaultRadiusScale()).map((token) => [token.id, token.px]),
    ).toEqual([
      ["page", 28],
      ["container", 12],
      ["element", 8],
      ["inner", 4],
      ["none", 0],
    ]);
  });

  it("follows the multiplier, except where a corner does not scale", () => {
    const scale = { ...defaultRadiusScale(), multiplier: 1.5 };
    const byId = Object.fromEntries(
      nestedRadii(scale).map((token) => [token.id, token.px]),
    );
    expect(byId.container).toBe(18);
    expect(byId.none).toBe(0);
  });

  it("shows the rest when the scale has dropped a corner", () => {
    const scale = defaultRadiusScale();
    const without = {
      ...scale,
      tokens: scale.tokens.filter((token) => token.id !== "element"),
    };
    expect(nestedRadii(without).map((token) => token.id)).toEqual([
      "page",
      "container",
      "inner",
      "none",
    ]);
  });
});

describe("spacingSpecimen", () => {
  it("is 4px to 64px at the default scale, smallest first", () => {
    expect(spacingSpecimen(defaultSpacingScale()).map((t) => t.px)).toEqual([
      4, 8, 12, 16, 24, 32, 48, 64,
    ]);
  });

  it("follows the base unit, and leaves out a pruned step", () => {
    const scale = { ...defaultSpacingScale(), baseUnitPx: 8 };
    scale.steps = scale.steps.filter((step) => step !== 3);
    const shown = spacingSpecimen(scale);
    expect(shown.map((token) => token.px)).toEqual([
      8, 16, 32, 48, 64, 96, 128,
    ]);
    expect(shown.some((token) => token.step === 3)).toBe(false);
  });
});
