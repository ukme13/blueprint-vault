import { describe, expect, it } from "vitest";
import { generatePalettes } from "../color/palette";
import type { ColorTrack } from "../color/types";
import {
  defaultElevationScale,
  elevationCssVariables,
  normalizeElevationScale,
  resolveElevation,
} from "./elevation";

function palette(): ColorTrack[] {
  return generatePalettes({
    tracks: [
      { id: "t-primary", name: "primary", seedHex: "#7646ab" },
      { id: "neutral", name: "neutral", seedHex: "#737373" },
    ],
    lightnessValues: [97.5, 80, 60, 40, 20, 5],
  });
}

function css(mode: "light" | "dark", id = "low"): string {
  return resolveElevation(defaultElevationScale(), palette(), mode).find(
    (level) => level.id === id,
  )!.css;
}

function alphas(value: string): number[] {
  return [...value.matchAll(/rgba\([^)]*?,\s*([\d.]+)\)/g)].map((match) =>
    Number(match[1]),
  );
}

function channels(value: string): string[] {
  return [...value.matchAll(/rgba\((\d+, \d+, \d+)/g)].map(
    (match) => match[1]!,
  );
}

describe("the shadow colour", () => {
  it("is the same in both modes", () => {
    /* The plan said it would follow light and dark like everything else.
       A shadow is the absence of light, not a surface: flipping it pale in
       dark mode draws a halo, which is a different effect. */
    expect(channels(css("dark"))).toEqual(channels(css("light")));
  });

  it("comes from the palette, not from black", () => {
    /* A palette's darkest neutral is usually tinted, and a sudden pure black
       is more obviously off than a shade one step away. */
    expect(channels(css("light"))[0]).not.toBe("0, 0, 0");
  });

  it("falls back to the darkest shade when the track is gone", () => {
    const scale = {
      ...defaultElevationScale(),
      colour: { trackId: "deleted", weight: 950 },
    };
    const value = resolveElevation(scale, palette(), "light")[0]!.css;
    expect(value).toMatch(/rgba\(\d+, \d+, \d+, [\d.]+\)/);
  });

  it("renders without a palette at all", () => {
    expect(
      resolveElevation(defaultElevationScale(), [], "light")[0]!.css,
    ).toContain("rgba(0, 0, 0");
  });
});

describe("strength", () => {
  it("is stronger in dark mode", () => {
    /* A dark surface swallows a shadow: the same black at the same alpha
       reads as nothing once the background is already dark. */
    const light = alphas(css("light"));
    const dark = alphas(css("dark"));

    expect(dark.length).toBe(light.length);
    for (const [at, value] of dark.entries()) {
      expect(value).toBeGreaterThan(light[at]!);
    }
  });

  it("gives the top level the strongest cast layer", () => {
    expect(Math.max(...alphas(css("dark", "high")))).toBeGreaterThan(
      Math.max(...alphas(css("dark", "low"))),
    );
  });
});

describe("a level", () => {
  it("stacks a contact layer and a cast layer", () => {
    /* A single shadow reads as a sticker. */
    expect(alphas(css("light"))).toHaveLength(2);
    expect(css("light")).toContain(",");
  });

  it("grows as it rises", () => {
    const blur = (value: string) =>
      [...value.matchAll(/\d+px (\d+)px/g)].map((match) => Number(match[1]));
    expect(Math.max(...blur(css("light", "high")))).toBeGreaterThan(
      Math.max(...blur(css("light", "low"))),
    );
  });

  it("is `none` when it has no layers", () => {
    const scale = normalizeElevationScale({
      ...defaultElevationScale(),
      levels: [{ id: "flat", name: "Flat", description: "", layers: [] }],
    });
    expect(resolveElevation(scale, palette(), "light")[0]!.css).toBe("none");
  });
});

describe("normalizeElevationScale", () => {
  it("clamps an opacity into range", () => {
    const scale = normalizeElevationScale({
      ...defaultElevationScale(),
      levels: [
        {
          id: "low",
          name: "Low",
          description: "",
          layers: [
            {
              offsetXPx: 0,
              offsetYPx: 1,
              blurPx: 2,
              spreadPx: 0,
              opacity: { light: 5, dark: -1 },
            },
          ],
        },
      ],
    });
    expect(scale.levels[0]!.layers[0]!.opacity).toEqual({ light: 1, dark: 0 });
  });

  it("drops a duplicate level", () => {
    const scale = normalizeElevationScale({
      ...defaultElevationScale(),
      levels: [
        { id: "low", name: "A", description: "", layers: [] },
        { id: "low", name: "B", description: "", layers: [] },
      ],
    });
    expect(scale.levels).toHaveLength(1);
    expect(scale.levels[0]!.name).toBe("A");
  });

  it("refuses a negative blur", () => {
    const scale = normalizeElevationScale({
      ...defaultElevationScale(),
      levels: [
        {
          id: "low",
          name: "Low",
          description: "",
          layers: [
            {
              offsetXPx: 0,
              offsetYPx: 1,
              blurPx: -8,
              spreadPx: 0,
              opacity: { light: 0.1, dark: 0.2 },
            },
          ],
        },
      ],
    });
    expect(scale.levels[0]!.layers[0]!.blurPx).toBe(0);
  });
});

describe("elevationCssVariables", () => {
  it("emits one variable per level", () => {
    const variables = elevationCssVariables(
      defaultElevationScale(),
      palette(),
      "light",
    );
    expect(Object.keys(variables)).toEqual([
      "--shadow-low",
      "--shadow-med",
      "--shadow-high",
    ]);
  });
});
