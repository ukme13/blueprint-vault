import { describe, expect, it } from "vitest";
import { assessColourSimilarity, relativeLuminance } from "./accessibility";
import {
  hexToRgb,
  linearToSrgb,
  rgbToHex,
  rgbToOklch,
  srgbToLinear,
} from "./conversion";
import {
  MACHADO_2009_MATRICES,
  type MachadoFamily,
  type Matrix3,
} from "./machado2009";
import {
  COLOUR_VISION_DEFICIENCIES,
  describeColourVisionMethod,
  simulateColourVision,
  simulateColourVisionRgb,
} from "./vision";
import type { Rgb } from "./types";

const FAMILIES: MachadoFamily[] = ["protan", "deutan", "tritan"];

const RED = "#ff0000";
const GREEN = "#00ff00";
const BLUE = "#0000ff";

/**
 * The transform written out longhand, as the reference the module is checked
 * against: decode to linear light, multiply, re-encode.
 */
function applyByHand(matrix: Matrix3, hex: string): string {
  const linear = hexToRgb(hex).map((channel) => srgbToLinear(channel));
  const row = (offset: number) =>
    linearToSrgb(
      matrix[offset]! * linear[0]! +
        matrix[offset + 1]! * linear[1]! +
        matrix[offset + 2]! * linear[2]!,
    );

  return rgbToHex(row(0), row(3), row(6));
}

/** Degrees between two hues, the short way round the wheel. */
function hueGap(first: string, second: string): number {
  const [, , firstHue] = rgbToOklch(...hexToRgb(first));
  const [, , secondHue] = rgbToOklch(...hexToRgb(second));
  const gap = Math.abs(firstHue - secondHue) % 360;
  return gap > 180 ? 360 - gap : gap;
}

/**
 * A grid through the RGB cube: 16 levels per channel, 4096 colours.
 *
 * Coarse enough to run in milliseconds and fine enough that an invariant which
 * fails anywhere fails here — the corners alone are where a matrix is most
 * likely to clamp and least likely to expose an error.
 */
const CUBE: Rgb[] = [];
for (let red = 0; red <= 255; red += 17) {
  for (let green = 0; green <= 255; green += 17) {
    for (let blue = 0; blue <= 255; blue += 17) {
      CUBE.push([red / 255, green / 255, blue / 255]);
    }
  }
}

describe("the published Machado 2009 table", () => {
  it("holds eleven severities per family", () => {
    for (const family of FAMILIES) {
      expect(MACHADO_2009_MATRICES[family], family).toHaveLength(11);
    }
  });

  it("starts at the identity", () => {
    /* Severity 0.0 is normal vision. The published matrix is exactly the
       identity, so this is a transcription check as much as a property. */
    for (const family of FAMILIES) {
      expect(MACHADO_2009_MATRICES[family][0], family).toEqual([
        1, 0, 0, 0, 1, 0, 0, 0, 1,
      ]);
    }
  });

  it("has rows that sum to one", () => {
    /* Why white stays white and grey stays grey, and the property that would
       break first if the extraction had slipped a column. */
    for (const family of FAMILIES) {
      for (const [index, matrix] of MACHADO_2009_MATRICES[family].entries()) {
        for (let row = 0; row < 3; row += 1) {
          const sum =
            matrix[row * 3]! + matrix[row * 3 + 1]! + matrix[row * 3 + 2]!;
          expect(
            sum,
            `${family} severity ${index / 10} row ${row}`,
          ).toBeCloseTo(1, 5);
        }
      }
    }
  });

  it("matches the paper at full severity", () => {
    /* Typed by hand from Table 1 of the supplementary matrices, against a file
       that was extracted from that same table by script. Two routes to the same
       numbers, so a parse that silently misaligned would have to misalign
       identically here to go unnoticed.
       https://www.inf.ufrgs.br/~oliveira/pubs_files/CVD_Simulation/ */
    expect(MACHADO_2009_MATRICES.protan[10]).toEqual([
      0.152286, 1.052583, -0.204868, 0.114503, 0.786281, 0.099216, -0.003882,
      -0.048116, 1.051998,
    ]);
    expect(MACHADO_2009_MATRICES.deutan[10]).toEqual([
      0.367322, 0.860646, -0.227968, 0.280085, 0.672501, 0.047413, -0.01182,
      0.04294, 0.968881,
    ]);
    expect(MACHADO_2009_MATRICES.tritan[10]).toEqual([
      1.255528, -0.076749, -0.178779, -0.078411, 0.930809, 0.147602, 0.004733,
      0.691367, 0.3039,
    ]);
  });

  it("agrees with an independent implementation of the same table", () => {
    /* colour-science publishes a doctest for protanomaly at severity 0.15.
       Their lookup picks the bracket above the requested severity and then
       walks backwards into it, so 0.15 is extrapolated from the 0.2 and 0.3
       matrices rather than interpolated between 0.1 and 0.2. Reproducing that
       arithmetic from our table reaches their published numbers exactly, which
       checks our extraction against a source that never saw our parser.

       It is not how this module interpolates — see the interpolation test —
       because the authors' own guidance is to interpolate between the two
       nearest severities. */
    const lower = MACHADO_2009_MATRICES.protan[2]!;
    const upper = MACHADO_2009_MATRICES.protan[3]!;
    const extrapolated = lower.map(
      (value, index) => value + (0.15 - 0.2) * ((upper[index]! - value) / 0.1),
    );

    const doctest = [
      0.7869875, 0.2694875, -0.0564735, 0.0431695, 0.933774, 0.023058,
      -0.004238, -0.0024515, 1.0066895,
    ];
    for (const [index, value] of extrapolated.entries()) {
      expect(value, `element ${index}`).toBeCloseTo(doctest[index]!, 9);
    }
  });
});

describe("invariants over the whole RGB cube", () => {
  /* These started life asserted over a dozen hand-picked colours, which is not
     an invariant, it is a dozen examples. Every case below runs over a grid
     through the cube — cheap enough that there is no reason to sample. */

  it("never puts a colour outside the sRGB cube", () => {
    /* Asserted on the Rgb result, not on the hex. rgbToHex clamps on its way
       out, so checking the hex proves only that rgbToHex works — this passed
       with the clamp removed from the transform until it was pointed at the
       unrounded channels.

       The clamp is load-bearing: these matrices map onto a plane the sRGB gamut
       does not fully contain, so saturated inputs genuinely land outside and a
       caller working in Rgb would otherwise get an impossible colour. */
    for (const deficiency of COLOUR_VISION_DEFICIENCIES) {
      for (const rgb of CUBE) {
        for (const channel of simulateColourVisionRgb(rgb, deficiency)) {
          expect(
            channel,
            `${deficiency} ${rgbToHex(...rgb)}`,
          ).toBeGreaterThanOrEqual(0);
          expect(
            channel,
            `${deficiency} ${rgbToHex(...rgb)}`,
          ).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it("never mutates the colour it was given", () => {
    for (const deficiency of COLOUR_VISION_DEFICIENCIES) {
      for (const rgb of CUBE) {
        const input: Rgb = [...rgb];
        simulateColourVisionRgb(input, deficiency);
        expect(input, deficiency).toEqual(rgb);
      }
    }
  });

  it("is the identity at severity zero", () => {
    /* Not "close to" the identity: the published severity-0.0 matrix is exactly
       the identity, so the only drift permitted here is floating point. */
    for (const deficiency of COLOUR_VISION_DEFICIENCIES) {
      for (const rgb of CUBE) {
        const simulated = simulateColourVisionRgb(rgb, deficiency, 0);
        for (const [index, channel] of simulated.entries()) {
          expect(channel, `${deficiency} ${rgbToHex(...rgb)}`).toBeCloseTo(
            rgb[index]!,
            12,
          );
        }
      }
    }
  });

  it("gives the same answer through the hex path and the Rgb path", () => {
    for (const deficiency of COLOUR_VISION_DEFICIENCIES) {
      for (const rgb of CUBE) {
        const hex = rgbToHex(...rgb);
        expect(simulateColourVision(hex, deficiency), deficiency).toBe(
          rgbToHex(...simulateColourVisionRgb(rgb, deficiency)),
        );
      }
    }
  });

  it("holds every one of the 256 greys fixed", () => {
    /* Every grey, not a handful. This is the visible face of the rows summing
       to one, and it has to be exact — a preview that tinted the neutral track
       would be reporting a problem the palette does not have. */
    for (const deficiency of COLOUR_VISION_DEFICIENCIES) {
      for (let value = 0; value <= 255; value += 1) {
        const hex = rgbToHex(value / 255, value / 255, value / 255);
        expect(simulateColourVision(hex, deficiency), deficiency).toBe(hex);
      }
    }
  });

  it("makes achromatopsia exactly neutral, at the original luminance", () => {
    /* Exactly neutral, and luminance-preserving to within 8-bit rounding. Both
       halves matter: the first is what makes it a greyscale at all, and the
       second is what lets a WCAG ratio measured under simulation equal the one
       measured on the real palette, so this mode can neither invent nor hide a
       contrast failure. */
    for (const rgb of CUBE) {
      const simulated = simulateColourVisionRgb(rgb, "achromatopsia");
      expect(simulated[0]).toBe(simulated[1]);
      expect(simulated[1]).toBe(simulated[2]);

      const hex = rgbToHex(...rgb);
      expect(
        relativeLuminance(simulateColourVision(hex, "achromatopsia")),
        hex,
      ).toBeCloseTo(relativeLuminance(hex), 2);
    }
  });

  it("converges reds and greens onto one hue across both families", () => {
    /* The pure primaries are the easy case. This sweeps a family of reds
       against a family of greens, light through dark, and takes the worst
       pair. */
    const reds: string[] = [];
    const greens: string[] = [];
    for (let value = 60; value <= 255; value += 25) {
      reds.push(rgbToHex(value / 255, 0.05, 0.05));
      greens.push(rgbToHex(0.05, value / 255, 0.05));
    }

    for (const deficiency of ["protanopia", "deuteranopia"] as const) {
      for (const red of reds) {
        for (const green of greens) {
          expect(
            hueGap(
              simulateColourVision(red, deficiency),
              simulateColourVision(green, deficiency),
            ),
            `${deficiency} ${red}/${green}`,
          ).toBeLessThan(10);
        }
      }
    }
  });
});

describe("what the transform deliberately does not promise", () => {
  it("does not move a colour monotonically as severity rises", () => {
    /* Tempting to assume and false. Under tritanopia #00ffdd moves furthest
       from its original at a severity around 0.2, comes back almost to where
       it started by 0.5, then diverges again — so a mid-severity tritanomaly
       displaces this cyan further than full tritanopia does.

       That is the tritan family, not a bug: the authors derive it over a
       different shift range from protan and deutan, and warn that it
       approximates the phenomenon rather than modelling tritanopia directly.
       Pinned here so that nobody builds a severity slider on the assumption
       that dragging it right always makes things worse. */
    const rgb = hexToRgb("#00ffdd");
    const distanceAt = (severity: number) => {
      const simulated = simulateColourVisionRgb(rgb, "tritanopia", severity);
      return Math.max(
        ...simulated.map((channel, index) => Math.abs(channel - rgb[index]!)),
      );
    };

    expect(distanceAt(0.2)).toBeGreaterThan(distanceAt(0.5) + 0.1);
    expect(distanceAt(1)).toBeGreaterThan(distanceAt(0.5));
  });

  it("is smooth in severity except against the black wall", () => {
    /* A mid-tone changes by a fraction of a level per 0.01 of severity. A
       colour with a channel pinned at zero changes by up to 25 levels over the
       same step, because the sRGB encoding is steep near black and the matrix
       lifts that channel off zero immediately.

       Worth knowing before anyone animates this: the visible jump is in the
       encoding, not in the transform, and no amount of interpolation between
       matrices will smooth it. */
    const step = (hex: string, severity: number) => {
      const rgb = hexToRgb(hex);
      const before = simulateColourVisionRgb(
        rgb,
        "protanopia",
        severity - 0.01,
      );
      const after = simulateColourVisionRgb(rgb, "protanopia", severity);
      return Math.max(
        ...after.map((channel, index) => Math.abs(channel - before[index]!)),
      );
    };

    for (const severity of [0.01, 0.5, 1]) {
      expect(step("#8899aa", severity), `mid-tone at ${severity}`).toBeLessThan(
        0.002,
      );
    }
    expect(step("#00ddee", 0.01)).toBeGreaterThan(0.05);
  });
});

describe("simulateColourVision", () => {
  it("applies the matrix to linear light, not to the encoded value", () => {
    /* The mistake this guards against is the common one with these matrices:
       multiplying the gamma-encoded channels directly. It does not throw or
       look obviously wrong, it just makes a wide range of colours too dark, so
       the only thing that catches it is computing the answer both ways.

       The expected value here is the published severity-1.0 deutan matrix
       applied by hand, decoding first and re-encoding after. */
    const matrix = MACHADO_2009_MATRICES.deutan[10]!;
    const expected = applyByHand(matrix, "#cc3355");

    expect(simulateColourVision("#cc3355", "deuteranopia")).toBe(expected);

    const encodedDirectly = hexToRgb("#cc3355");
    const wrong = rgbToHex(
      matrix[0]! * encodedDirectly[0]! +
        matrix[1]! * encodedDirectly[1]! +
        matrix[2]! * encodedDirectly[2]!,
      matrix[3]! * encodedDirectly[0]! +
        matrix[4]! * encodedDirectly[1]! +
        matrix[5]! * encodedDirectly[2]!,
      matrix[6]! * encodedDirectly[0]! +
        matrix[7]! * encodedDirectly[1]! +
        matrix[8]! * encodedDirectly[2]!,
    );
    // If these ever agree, this test has stopped distinguishing the two.
    expect(expected).not.toBe(wrong);
  });

  it("collapses red and green onto one hue for protanopia and deuteranopia", () => {
    /* Hue, not overall colour difference. Red and green land within a degree
       or two of the same yellow — 29° and 142° become 99° and 101° — while
       their lightness stays well apart, because protanopia in particular
       darkens red sharply. An assertion on the OKLab distance would fail on
       that surviving lightness gap and read as a broken transform, when what
       it is measuring is the thing protanopia is known for. */
    expect(hueGap(RED, GREEN)).toBeGreaterThan(100);

    for (const deficiency of ["protanopia", "deuteranopia"] as const) {
      const simulatedRed = simulateColourVision(RED, deficiency);
      const simulatedGreen = simulateColourVision(GREEN, deficiency);
      expect(hueGap(simulatedRed, simulatedGreen), deficiency).toBeLessThan(5);
    }
  });

  it("darkens red far more than green under protanopia", () => {
    /* The other half of protanopia, and the reason the test above measures
       hue: reduced sensitivity to long wavelengths costs red its luminance.
       Deuteranopia is much milder here, which is what separates the two. */
    const lightness = (hex: string) => rgbToOklch(...hexToRgb(hex))[0];
    const redDrop =
      lightness(RED) - lightness(simulateColourVision(RED, "protanopia"));
    const greenDrop =
      lightness(GREEN) - lightness(simulateColourVision(GREEN, "protanopia"));

    expect(redDrop).toBeGreaterThan(0.1);
    expect(greenDrop).toBeLessThan(0);
  });

  it("leaves the blue axis alone for protanopia and deuteranopia", () => {
    /* The counterpart to the collapse test: a transform that merely pushed
       everything toward yellow would pass that one on its own. Blue keeps its
       hue to within about two degrees. */
    for (const deficiency of ["protanopia", "deuteranopia"] as const) {
      expect(
        hueGap(BLUE, simulateColourVision(BLUE, deficiency)),
        deficiency,
      ).toBeLessThan(5);
    }
  });

  it("does the reverse for tritanopia", () => {
    /* Blue shifts by nearly thirty degrees and loses most of its chroma, while
       red is left almost exactly where it was. */
    expect(
      hueGap(BLUE, simulateColourVision(BLUE, "tritanopia")),
    ).toBeGreaterThan(20);
    expect(hueGap(RED, simulateColourVision(RED, "tritanopia"))).toBeLessThan(
      2,
    );

    const blueMoved = assessColourSimilarity(
      BLUE,
      simulateColourVision(BLUE, "tritanopia"),
    ).difference;
    const redMoved = assessColourSimilarity(
      RED,
      simulateColourVision(RED, "tritanopia"),
    ).difference;

    expect(blueMoved).toBeGreaterThan(redMoved * 10);
  });

  it("is not idempotent, and is not meant to be", () => {
    /* Worth asserting because the opposite is true of the projection models —
       Viénot 1999 collapses onto a plane, so simulating twice changes nothing —
       and idempotence is what somebody would reasonably expect here. Machado
       shifts cone sensitivities instead, and a second pass shifts again.

       If this starts passing, the transform underneath has been replaced by a
       projection and the method the report cites is no longer the one that
       ran. */
    const once = simulateColourVisionRgb(hexToRgb("#ff00ff"), "tritanopia");
    const twice = simulateColourVisionRgb(once, "tritanopia");
    const drift = Math.max(
      ...once.map((channel, index) => Math.abs(channel - twice[index]!)),
    );

    expect(drift).toBeGreaterThan(0.1);
  });
});

describe("severity", () => {
  it("uses the published matrix exactly at a tabulated severity", () => {
    for (const [index, matrix] of MACHADO_2009_MATRICES.deutan.entries()) {
      expect(
        simulateColourVision("#cc3355", "deuteranopia", index / 10),
        `severity ${index / 10}`,
      ).toBe(applyByHand(matrix, "#cc3355"));
    }
  });

  it("interpolates between the two nearest severities", () => {
    /* The authors' guidance: a severity of 0.873 is the 0.8 and 0.9 matrices
       interpolated with a weight of 0.73. So severity 0.25 must be exactly the
       midpoint of the published 0.2 and 0.3 matrices.

       Asserting the value rather than a range, because a range does not
       distinguish this from the extrapolating lookup described above: reaching
       0.25 backwards from the 0.3 and 0.4 matrices still lands between the 0.2
       and 0.3 results, so a bounds check passes on both. Only the exact number
       separates them. */
    const lower = MACHADO_2009_MATRICES.deutan[2]!;
    const upper = MACHADO_2009_MATRICES.deutan[3]!;
    const midpoint = lower.map(
      (value, index) => (value + upper[index]!) / 2,
    ) as unknown as Matrix3;

    expect(simulateColourVision("#cc3355", "deuteranopia", 0.25)).toBe(
      applyByHand(midpoint, "#cc3355"),
    );
  });

  it("grows monotonically more severe", () => {
    const apart = assessColourSimilarity(RED, GREEN).difference;
    let previous = apart;

    for (const severity of [0.25, 0.5, 0.75, 1]) {
      const difference = assessColourSimilarity(
        simulateColourVision(RED, "deuteranopia", severity),
        simulateColourVision(GREEN, "deuteranopia", severity),
      ).difference;

      expect(difference, `severity ${severity}`).toBeLessThan(previous);
      previous = difference;
    }
  });

  it("clamps a severity outside the range", () => {
    expect(simulateColourVision(RED, "protanopia", 5)).toBe(
      simulateColourVision(RED, "protanopia", 1),
    );
    expect(simulateColourVision(RED, "protanopia", -1)).toBe(RED);
  });
});

describe("describeColourVisionMethod", () => {
  it("names the dichromacy at full severity", () => {
    expect(describeColourVisionMethod("deuteranopia").name).toBe(
      "Deuteranopia",
    );
  });

  it("names the anomalous trichromacy below it", () => {
    /* A report that says "deuteranopia" when it simulated a severity of 0.6 is
       describing something it did not do. */
    expect(describeColourVisionMethod("deuteranopia", 0.6).name).toBe(
      "Deuteranomaly",
    );
  });

  it("cites the paper, and does not cite it for achromatopsia", () => {
    expect(describeColourVisionMethod("protanopia").citation).toContain(
      "Machado",
    );
    expect(describeColourVisionMethod("achromatopsia").citation).not.toContain(
      "Machado",
    );
  });
});
