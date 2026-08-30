import { describe, expect, it } from "vitest";
import * as blueprint from "../index";
import {
  formatTypeScaleCssExport,
  formatTypeScaleTailwindExport,
} from "../typography/export";
import { generateTypeSteps } from "../typography/scale";
import { assignDefaultRoles } from "../typography/scale";
import {
  formatTypeSystemCssExport,
  formatTypeSystemTailwindExport,
} from "../typography/system-export";
import { defaultSystem, setLocalFont } from "../typography/system";
import { formatBlueprintWorkspace } from "../workspace/workspace-file";
import {
  buildAccessibilityReport,
  formatAccessibilityReportJson,
  formatAccessibilityReportMarkdown,
} from "../report/accessibility-report";
import { generatePalettes } from "../color/palette";

/*
 * Bytes in, names out.
 *
 * An uploaded font may be one somebody holds a desktop licence for, and desktop
 * licences commonly do not cover webfont embedding. If a file reached an export
 * the studio would be helping someone ship a font they may only have the right
 * to use on their own machine, from a file it told them was safe to add. See
 * docs/roadmap/uploaded-fonts.md.
 *
 * This is currently true because nothing writes an @font-face. That is an
 * accident of what has been built, and this file is what turns it into a rule.
 */

/** Formatters that produce something a person can save and ship. */
const DOCUMENT_FORMATTERS = [
  "formatAccessibilityReportJson",
  "formatAccessibilityReportMarkdown",
  "formatBlueprintPaletteProject",
  "formatBlueprintWorkspace",
  "formatPaletteCss",
  "formatPaletteCssExport",
  "formatPaletteDesignTokens",
  "formatPaletteTailwindExport",
  "formatTypeScaleCssExport",
  "formatTypeScaleTailwindExport",
  "formatTypeSystemCssExport",
  "formatTypeSystemTailwindExport",
];

/** Formatters that render one value, and cannot carry a document. */
const VALUE_FORMATTERS = ["formatColour", "formatLength"];

const FAMILY = "Brand-Regular";

/* Enough of a palette for the report to have colours to measure. */
function reportPalette() {
  return generatePalettes({
    tracks: [
      { id: "primary", name: "primary", seedHex: "#7646ab" },
      { id: "neutral", name: "neutral", seedHex: "#737373" },
    ],
    lightnessValues: [95, 80, 65, 50, 35, 20, 5],
  });
}

function systemWithLocalFont() {
  return setLocalFont(
    defaultSystem("Uploaded", ["Inter"], 16, 1.25, 9),
    "main",
    FAMILY,
  );
}

function legacyScaleWithLocalFont() {
  const steps = generateTypeSteps(16, 1.25, 9);
  return {
    fontFamily: FAMILY,
    baseFontSizePx: 16,
    ratio: 1.25,
    steps,
    roles: assignDefaultRoles(steps),
  };
}

/** Anything that would carry a face rather than name one. */
const FONT_DATA_PATTERNS: Array<[string, RegExp]> = [
  ["an @font-face rule", /@font-face/i],
  ["a src descriptor", /\bsrc\s*:/i],
  ["a data URI", /data:\s*(?:application|font|text\/octet)/i],
  ["base64 content", /base64/i],
  ["a url() reference", /url\s*\(/i],
  ["a woff2 signature", /wOF2/],
  ["a woff signature", /wOFF/],
  ["an OpenType signature", /OTTO/],
];

function assertNamesOnly(label: string, output: string) {
  for (const [what, pattern] of FONT_DATA_PATTERNS) {
    expect(pattern.test(output), `${label} must not emit ${what}`).toBe(false);
  }
}

describe("no export carries font data", () => {
  it("knows every formatter the package offers", () => {
    /* Discovered rather than listed, and deliberately every `format*` rather
       than only the ones whose names end in Export — the first version of this
       filter missed formatBlueprintPaletteProject, which serialises a whole
       document. Adding any formatter now fails here until somebody decides
       which of the two lists below it belongs in. */
    const discovered = Object.entries(blueprint)
      .filter(
        ([name, value]) => typeof value === "function" && /^format/.test(name),
      )
      .map(([name]) => name)
      .sort();

    expect(discovered).toEqual(
      [...DOCUMENT_FORMATTERS, ...VALUE_FORMATTERS].sort(),
    );
  });

  it("names the uploaded family in the CSS export", () => {
    const css = formatTypeSystemCssExport(systemWithLocalFont(), "rem");
    // The name is the whole output: it is what the project ships.
    expect(css).toContain(FAMILY);
    assertNamesOnly("the CSS export", css);
  });

  it("names the uploaded family in the Tailwind export", () => {
    const tailwind = formatTypeSystemTailwindExport(
      systemWithLocalFont(),
      "rem",
    );
    expect(tailwind).toContain(FAMILY);
    assertNamesOnly("the Tailwind export", tailwind);
  });

  it("carries no face through the legacy scale exports either", () => {
    const scale = legacyScaleWithLocalFont();
    assertNamesOnly("the legacy CSS export", formatTypeScaleCssExport(scale));
    assertNamesOnly(
      "the legacy Tailwind export",
      formatTypeScaleTailwindExport(scale),
    );
  });

  it("keeps no bytes in a serialised workspace", () => {
    /* The project file is a document, not a payload. A font entry carries the
       family and the source; the file lives in IndexedDB under the entry id. */
    const workspace = {
      name: "Uploaded",
      palette: null,
      typography: {
        system: systemWithLocalFont(),
        unit: "rem",
        specimenText: "",
        template: "specimen",
      },
    };
    const serialised = JSON.stringify(workspace);

    expect(serialised).toContain(FAMILY);
    expect(serialised).toContain('"source":"local"');
    assertNamesOnly("a serialised workspace", serialised);
    // A 28KB file would be unmissable next to a project this size.
    expect(serialised.length).toBeLessThan(20_000);
  });

  it("keeps no bytes in a workspace file", () => {
    /* The format that carries both halves of a project. It names an uploaded
       family and must not travel with the file behind it. */
    const file = formatBlueprintWorkspace({
      name: "Uploaded",
      palette: null,
      typography: {
        system: systemWithLocalFont(),
        unit: "rem",
        specimenText: "",
        template: "specimen",
      },
    });

    expect(file).toContain(FAMILY);
    expect(file).toContain(`"source": "local"`);
    assertNamesOnly("a workspace file", file);
  });

  it("keeps no bytes in an accessibility report", () => {
    /* The report names the families a role uses, because a typography verdict
       without the font it was made about is not much of a verdict. Names, not
       the file behind them — and both formats, since Markdown is the one where
       an @font-face would look most at home. */
    const report = buildAccessibilityReport({
      projectName: "Uploaded",
      palettes: reportPalette(),
      typography: systemWithLocalFont(),
    })!;

    const markdown = formatAccessibilityReportMarkdown(report);
    const json = formatAccessibilityReportJson(report);

    expect(markdown).toContain(FAMILY);
    expect(json).toContain(FAMILY);
    assertNamesOnly("the Markdown report", markdown);
    assertNamesOnly("the JSON report", json);
  });

  it("catches a face if one is ever added", () => {
    /* The guard guarding itself. If this stops failing, the patterns above
       have stopped meaning anything. */
    const withFace = [
      "@font-face {",
      `  font-family: "${FAMILY}";`,
      "  src: url(data:font/woff2;base64,d09GMgABAAAA) format('woff2');",
      "}",
    ].join("\n");

    expect(() =>
      assertNamesOnly("a stylesheet with a face", withFace),
    ).toThrow();
  });
});
