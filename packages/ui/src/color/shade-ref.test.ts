import { describe, expect, it } from "vitest";
import { generatePalettes } from "./palette";
import { resolveShadeHex } from "./shade-ref";

const tracks = generatePalettes({
  tracks: [
    { id: "primary", name: "primary", seedHex: "#7646ab" },
    { id: "neutral", name: "neutral", seedHex: "#737373" },
  ],
  lightnessValues: [97.5, 90, 80, 70, 60, 50, 40, 30, 20, 5],
});

describe("resolveShadeHex", () => {
  it("resolves a shade that is still on the palette", () => {
    const shade = tracks[0]!.shades[3]!;
    expect(
      resolveShadeHex(tracks, { trackId: "primary", weight: shade.weight }),
    ).toBe(shade.hex);
  });

  it("is null when nothing is picked, or the palette dropped it", () => {
    expect(resolveShadeHex(tracks, null)).toBeNull();
    expect(
      resolveShadeHex(tracks, { trackId: "gone", weight: 500 }),
    ).toBeNull();
    expect(
      resolveShadeHex(tracks, { trackId: "primary", weight: 12345 }),
    ).toBeNull();
  });
});
