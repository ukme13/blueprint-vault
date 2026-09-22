import { describe, expect, it } from "vitest";
import { generatePalettes } from "./palette";
import { seedSemanticTokens } from "./semantic";
import { describeReference, resolvedRoleReference } from "./token-rows";
import type { ColorTrack } from "./types";

/*
 * The rows the documentation draws, and the words it puts on them.
 *
 * `token-rows` had no tests of its own: every export was reached through a
 * page, and a page is where a dropped field is invisible. `border.subtle` is
 * seeded at 12% and rendered on the foundations page, which is in the handover
 * archive — so a reference described without its alpha is a wrong statement in
 * a file a client is given, not a rough edge in a studio.
 */

const LIGHTNESS = [
  97.5, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50, 45, 40, 35, 30, 25, 20, 15, 10,
  5,
];

function palette(): ColorTrack[] {
  return generatePalettes({
    tracks: [
      { id: "t-primary", name: "primary", seedHex: "#7646ab" },
      { id: "t-neutral", name: "neutral", seedHex: "#737373" },
      { id: "t-success", name: "success", seedHex: "#2f7d32" },
      { id: "t-warning", name: "warning", seedHex: "#b87503" },
      { id: "t-error", name: "error", seedHex: "#b02b1b" },
      { id: "t-info", name: "info", seedHex: "#2878b8" },
    ],
    lightnessValues: LIGHTNESS,
  });
}

describe("describeReference", () => {
  it("writes an opaque reference as the bare primitive", () => {
    /* Byte for byte what the page said before alpha existed. A reference with
       no transparency must not grow "at 100%" on the day this lands. */
    expect(
      describeReference({ trackId: "neutral", weight: 450, alpha: 1 }),
    ).toBe("neutral 450");
  });

  it("names the alpha when the reference carries one", () => {
    expect(
      describeReference({ trackId: "neutral", weight: 450, alpha: 0.12 }),
    ).toBe("neutral 450 at 12%");
  });

  it("spells the percentage the way every other export does", () => {
    /* Through `alphaPercent`, so a token written as 12.5% in the CSS export is
       not 0.125 here. The trailing zeros go for the same reason. */
    expect(
      describeReference({ trackId: "primary", weight: 500, alpha: 0.125 }),
    ).toBe("primary 500 at 12.5%");
    expect(
      describeReference({ trackId: "primary", weight: 500, alpha: 0.5 }),
    ).toBe("primary 500 at 50%");
  });
});

describe("resolvedRoleReference", () => {
  it("carries the alpha of a seeded transparent role", () => {
    /* `border.subtle` is seeded at 12% in light. The contrast rows describe
       what was measured, and what was measured was the composite. */
    const tracks = palette();
    const tokens = seedSemanticTokens(tracks);

    const reference = resolvedRoleReference(
      tokens,
      "border.subtle",
      "light",
      tracks,
    );

    expect(reference).not.toBeNull();
    expect(reference!.alpha).toBeCloseTo(0.12, 5);
    expect(describeReference(reference!)).toMatch(/ at 12%$/);
  });

  it("reports an opaque role as fully opaque rather than as nothing", () => {
    /* `alpha` is always a number here, as it is on `ResolvedSemantic`. A
       caller that has to write `?? 1` is a caller that can forget to. */
    const tracks = palette();
    const tokens = seedSemanticTokens(tracks);

    const reference = resolvedRoleReference(
      tokens,
      "surface.base",
      "light",
      tracks,
    );

    expect(reference!.alpha).toBe(1);
    expect(describeReference(reference!)).not.toMatch(/ at /);
  });

  it("returns null for a role the layer does not have", () => {
    const tracks = palette();
    const tokens = seedSemanticTokens(tracks);

    expect(
      resolvedRoleReference(tokens, "surface.invented", "light", tracks),
    ).toBeNull();
  });
});
