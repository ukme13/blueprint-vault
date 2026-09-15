import { describe, expect, it } from "vitest";
import { generatePalettes } from "../color/palette";
import { seedWorkspaceProject } from "../workspace/seed-project";
import { formatScaleCss } from "./scale-export";
import {
  elevationRows,
  radiusScaleSummary,
  spacingScaleSummary,
} from "./scale-rows";

/*
 * The rows a documentation page renders, and the file a developer installs.
 *
 * The three resolvers are the export's naming rule, so these tests are mostly
 * about the two things the rows add: pairing elevation's modes, and saying
 * which shade a shadow was drawn from. The names are still checked against the
 * export's own output, because a page naming a variable the file does not
 * contain is a page somebody copies from and gets nothing.
 */

const project = () => seedWorkspaceProject("Reference");
const palettes = () => generatePalettes(project().palette!);

const exported = () =>
  formatScaleCss({
    spacing: project().spacing,
    radius: project().radius,
    elevation: project().elevation,
    palettes: palettes(),
  });

describe("the spacing rows", () => {
  it("name the variables the export writes", () => {
    const css = exported();
    for (const token of spacingScaleSummary(project().spacing).tokens) {
      expect(css, `${token.variable} is on the page`).toContain(
        `${token.variable}:`,
      );
    }
  });

  it("count in the base unit rather than multiplying", () => {
    /* The thing the plan got right by rewriting itself: a type scale
       multiplies and a spacing scale counts. A ratio of 1.25 from a 4px base
       gives 5 and 6.25, and nobody lays out a page on 6.25px. */
    const summary = spacingScaleSummary(project().spacing);

    expect(summary.baseUnitPx).toBe(4);
    expect(summary.density).toBe(1);
    for (const token of summary.tokens) {
      expect(token.px % summary.baseUnitPx === 0 || token.px % 2 === 0).toBe(
        true,
      );
      expect(Number.isInteger(token.px)).toBe(true);
    }
    /* Layout steps take density; the fine grid stays on the base unit. */
    for (const token of summary.tokens) {
      expect(token.px).toBe(
        token.step *
          summary.baseUnitPx *
          (token.followsDensity ? summary.density : 1),
      );
    }
  });

  it("leaves the fine grid when density moves the layout gaps", () => {
    const doubled = spacingScaleSummary({
      ...project().spacing,
      density: 2,
    });
    const hairline = doubled.tokens.find((token) => token.step === 0.5)!;
    const padding = doubled.tokens.find((token) => token.step === 4)!;

    expect(hairline.px).toBe(2);
    expect(padding.px).toBe(32);
  });
});

describe("the radius rows", () => {
  it("name the variables the export writes", () => {
    const css = exported();
    for (const token of radiusScaleSummary(project().radius).tokens) {
      expect(css).toContain(`${token.variable}:`);
    }
  });

  it("keep the multiplier away from the two that are not sizes", () => {
    const base = project().radius;
    const doubled = radiusScaleSummary({ ...base, multiplier: 2 });
    const once = radiusScaleSummary(base);

    for (const token of doubled.tokens) {
      const before = once.tokens.find((each) => each.id === token.id)!;
      if (token.linked) expect(token.px).toBe(before.px * 2);
      /* Zero scaled is still zero, half a pill is still a pill, and a typed
         use stays where it was typed. */
      else expect(token.px).toBe(before.px);
    }
    expect(doubled.tokens.some((token) => !token.scales)).toBe(true);
  });

  it("leaves an unlinked use where it was typed", () => {
    const base = project().radius;
    const unlinked = {
      ...base,
      tokens: base.tokens.map((token) =>
        token.id === "element" ? { ...token, unlinkedPx: 20 } : token,
      ),
    };
    const doubled = radiusScaleSummary({ ...unlinked, multiplier: 2 });

    expect(
      doubled.tokens.find((token) => token.id === "element"),
    ).toMatchObject({ px: 20, linked: false });
    expect(doubled.tokens.find((token) => token.id === "container")!.px).toBe(
      24,
    );
  });
});

describe("the elevation rows", () => {
  it("pair the two modes on one row", () => {
    const { rows } = elevationRows(project().elevation, palettes());

    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.light.variable).toBe(row.dark.variable);
      expect(row.light.css).not.toBe(row.dark.css);
    }
  });

  it("change the strength and not the colour", () => {
    /* What the plan assumed backwards. A shadow is the absence of light, so
       flipping it pale in dark mode draws a halo; the colour is one reference
       and the opacity is what moves. */
    const { rows } = elevationRows(project().elevation, palettes());

    for (const row of rows) {
      const lightRgb = row.light.layers.map((layer) => layer.rgb.join(","));
      const darkRgb = row.dark.layers.map((layer) => layer.rgb.join(","));
      expect(darkRgb).toEqual(lightRgb);
      expect(row.opacity.dark).toBeGreaterThan(row.opacity.light);
    }
  });

  it("say which shade the shadow was drawn from", () => {
    /* The export writes a literal `rgba(...)`, because a box-shadow cannot
       carry a `var()` for one channel. So a reader has no way back to the
       palette unless the page says. */
    const { colour, rows } = elevationRows(project().elevation, palettes());

    expect(colour.trackId).toBeTruthy();
    expect(colour.weight).toBeGreaterThan(0);
    expect(colour.hex).toMatch(/^#[0-9a-f]{6}$/);
    /* And it is the colour actually in the shadow, not a second lookup. */
    const rgb = rows[0]!.light.layers[0]!.rgb;
    expect(colour.hex).toBe(
      `#${rgb.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`,
    );
  });

  it("name the variables the export writes", () => {
    const css = exported();
    for (const row of elevationRows(project().elevation, palettes()).rows) {
      expect(css).toContain(`${row.variable}:`);
    }
  });
});
