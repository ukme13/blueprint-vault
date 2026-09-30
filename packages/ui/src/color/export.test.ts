import { describe, expect, it } from "vitest";
import { generatePalette } from "./palette";
import {
  formatPaletteCssExport,
  formatPaletteDesignTokens,
  formatPaletteTailwindExport,
  type PaletteProjectData,
} from "./export";

const project: PaletteProjectData = {
  tracks: [
    {
      id: "primary",
      name: "primary",
      seedHex: "#7646ab",
      adjustments: {
        anchors: { 200: "#d8c65a" },
        manualOverrides: { 300: "#123456" },
      },
    },
  ],
  lightnessPattern: "custom",
  lightnessValues: [90, 82, 74, 66, 58, 50, 42, 34, 26, 18],
};

const palette = generatePalette(project.tracks[0]!, project.lightnessValues);

describe("palette developer exports", () => {
  it("formats CSS and Tailwind CSS using the requested colour format", () => {
    expect(formatPaletteCssExport([palette], "hex")).toContain(
      "--color-primary-50: #",
    );
    expect(formatPaletteTailwindExport([palette], "oklch")).toContain(
      "@theme static {\n  --color-primary-50: oklch(",
    );
  });

  it("formats Design Tokens Community Group JSON", () => {
    const tokens = JSON.parse(formatPaletteDesignTokens([palette], "rgb"));
    expect(tokens.palette.$type).toBe("color");
    expect(tokens.palette.primary[50].$value).toMatch(/^rgb\(/);
  });
});

/* Written from parts, so this file never holds a comment delimiter of its own. */
const OPEN = "/" + "*";
const CLOSE = "*" + "/";
const comment = (text: string) => `${OPEN} ${text} ${CLOSE}`;

describe("comments beside the key shades", () => {
  /* An anchor on a weight this ramp really has: the shared project's is on one
     a ten-shade ramp does not, so it anchors nothing. */
  const anchorWeight = palette.shades.find(
    (shade, index) => index >= 2 && shade.anchorType === null,
  )!.weight;
  const track = {
    ...project.tracks[0]!,
    adjustments: {
      anchors: { [anchorWeight]: "#d8c65a" },
      manualOverrides: {},
    },
  };
  const anchored = generatePalette(track, project.lightnessValues);
  const shadeOf = (type: "source" | "custom") =>
    anchored.shades.find((shade) => shade.anchorType === type)!;
  const plainShade = () =>
    anchored.shades.find((shade) => shade.anchorType === null)!;
  const line = (text: string, weight: number) =>
    text.split("\n").find((each) => each.includes(`-${weight}:`))!;
  const withLabels = (labels: Record<number, string>) =>
    generatePalette(
      { ...track, adjustments: { ...track.adjustments, labels } },
      project.lightnessValues,
    );

  it("says main for the source and submain for a custom anchor, in CSS", () => {
    expect(shadeOf("custom").weight).toBe(anchorWeight);
    const css = formatPaletteCssExport([anchored], "hex");
    expect(
      line(css, shadeOf("source").weight).endsWith(`; ${comment("main")}`),
    ).toBe(true);
    expect(
      line(css, shadeOf("custom").weight).endsWith(`; ${comment("submain")}`),
    ).toBe(true);
  });

  it("says the same in Tailwind", () => {
    const tailwind = formatPaletteTailwindExport([anchored], "hex");
    expect(
      line(tailwind, shadeOf("source").weight).endsWith(comment("main")),
    ).toBe(true);
    expect(
      line(tailwind, shadeOf("custom").weight).endsWith(comment("submain")),
    ).toBe(true);
  });

  it("says nothing beside a shade that is neither", () => {
    const plain = anchored.shades.filter((shade) => shade.anchorType === null);
    expect(plain.length).toBeGreaterThan(0);
    const css = formatPaletteCssExport([anchored], "hex");
    for (const shade of plain) {
      expect(line(css, shade.weight)).not.toContain(OPEN);
    }
  });

  it("puts a nickname in the comment in place of main and submain", () => {
    const source = shadeOf("source").weight;
    const plain = plainShade().weight;
    const css = formatPaletteCssExport(
      [withLabels({ [source]: "brand", [plain]: "tint" })],
      "hex",
    );
    expect(line(css, source).endsWith(`; ${comment("brand")}`)).toBe(true);
    expect(line(css, plain).endsWith(`; ${comment("tint")}`)).toBe(true);
    expect(css).not.toContain(comment("main"));
    /* The custom anchor has no nickname, so it still says submain. */
    expect(css).toContain(comment("submain"));
  });

  it("gives a shade in the Design Tokens JSON a description", () => {
    const source = shadeOf("source").weight;
    const tokens = JSON.parse(
      formatPaletteDesignTokens([withLabels({ [source]: "brand" })], "hex"),
    );
    const group = tokens.palette.primary;
    expect(group[source].$description).toBe("brand");
    expect(group[shadeOf("custom").weight].$description).toBe("submain");
    /* No key at all on a shade with nothing to say. */
    expect("$description" in group[plainShade().weight]).toBe(false);
  });

  it("describes main in the JSON when nothing is nicknamed", () => {
    const tokens = JSON.parse(formatPaletteDesignTokens([anchored], "hex"));
    expect(tokens.palette.primary[shadeOf("source").weight].$description).toBe(
      "main",
    );
  });

  it("cannot be broken out of by what a nickname says", () => {
    const hostile = withLabels({
      [shadeOf("source").weight]: `x ${CLOSE} body{display:none} ${OPEN}`,
    });
    for (const text of [
      formatPaletteCssExport([hostile], "hex"),
      formatPaletteTailwindExport([hostile], "hex"),
    ]) {
      /* Every commented line has one opener and one closer, at its very end. */
      for (const each of text.split("\n")) {
        if (!each.includes(OPEN)) continue;
        expect(each.split(OPEN)).toHaveLength(2);
        expect(each.split(CLOSE)).toHaveLength(2);
        expect(each.trimEnd().endsWith(CLOSE)).toBe(true);
      }
    }
  });

  it("stores nothing extra for a project that never nicknamed a shade", () => {
    expect("labels" in palette.adjustments).toBe(false);
  });
});
