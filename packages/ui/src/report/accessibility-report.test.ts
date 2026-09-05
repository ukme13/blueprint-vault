import { describe, expect, it } from "vitest";
import { seedSemanticTokens } from "../color/semantic";
import { generatePalettes } from "../color/palette";
import { defaultSystem } from "../typography/system";
import {
  REPORT_WCAG_VERSION,
  buildAccessibilityReport,
  formatAccessibilityReportJson,
  formatAccessibilityReportMarkdown,
} from "./accessibility-report";

const LIGHTNESS = [
  97.5, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50, 45, 40, 35, 30, 25, 20, 15, 10,
  5,
];

function palettes() {
  return generatePalettes({
    tracks: [
      { id: "primary", name: "primary", seedHex: "#7646ab" },
      { id: "neutral", name: "neutral", seedHex: "#737373" },
      { id: "success", name: "success", seedHex: "#2f7d32" },
      { id: "warning", name: "warning", seedHex: "#b87503" },
      { id: "error", name: "error", seedHex: "#b02b1b" },
      { id: "info", name: "info", seedHex: "#2878b8" },
    ],
    lightnessValues: LIGHTNESS,
  });
}

function report(
  overrides: {
    typography?: ReturnType<typeof defaultSystem> | null;
    generatedAt?: string;
    semantics?: ReturnType<typeof seedSemanticTokens>;
  } = {},
) {
  const built = buildAccessibilityReport({
    projectName: "Brand",
    palettes: palettes(),
    /* Seeded, because the report is now drawn from the layer rather than from
       a table of its own — and a workspace with a palette always has one. */
    semantics: overrides.semantics ?? seedSemanticTokens(palettes()),
    typography: overrides.typography ?? null,
    ...(overrides.generatedAt ? { generatedAt: overrides.generatedAt } : {}),
  });
  if (!built) throw new Error("expected a report");
  return built;
}

function typeSystem() {
  return defaultSystem("Brand type", ["Inter"], 16, 1.25, 9);
}

describe("buildAccessibilityReport", () => {
  it("returns nothing for an empty palette", () => {
    expect(
      buildAccessibilityReport({ projectName: "Brand", palettes: [] }),
    ).toBeNull();
  });

  it("assembles rather than recomputing", () => {
    /* Every number in the report comes from a function tested where it lives,
       so what this checks is that the sections are all present and wired to
       the same assessment the preview shows. */
    const built = report();

    expect(built.colour.textChecks).toHaveLength(20);
    /* Fifteen: every pair among the six tokens that signal by colour. */
    expect(built.colour.semanticPairs).toHaveLength(15);
    expect(built.colour.issueCount).toBeGreaterThanOrEqual(0);
  });

  it("states the WCAG version and every simulation method", () => {
    /* The rule the plan sets: a report whose method is unstated cannot be
       checked once the formulas underneath it change. */
    const { method } = report();

    expect(method.wcagVersion).toBe(REPORT_WCAG_VERSION);
    expect(method.colourVision).toHaveLength(4);

    for (const entry of method.colourVision) {
      expect(entry.severity).toBe(1);
      expect(entry.citation).toBeTruthy();
    }

    const machado = method.colourVision.filter((entry) =>
      entry.citation.includes("Machado"),
    );
    // Three families come from the paper; achromatopsia does not.
    expect(machado).toHaveLength(3);
    expect(
      method.colourVision.find((entry) => entry.deficiency === "achromatopsia")!
        .citation,
    ).not.toContain("Machado");
  });

  it("says simulation is guidance, not a WCAG requirement", () => {
    /* Stated in the report itself, because the report is the part that leaves
       this workspace and is read by somebody who never saw the roadmap. */
    expect(report().method.note).toMatch(/not a WCAG requirement/i);
  });

  it("omits the timestamp unless one is given", () => {
    /* Not defaulted to "now": the report is built during render, and a report
       that is not a pure function of its inputs makes the preview and the
       downloaded file disagree about a value nobody can see. */
    expect(report().generatedAt).toBeUndefined();
    expect(report({ generatedAt: "2026-08-30" }).generatedAt).toBe(
      "2026-08-30",
    );
  });

  it("has no typography section without a type scale", () => {
    expect(report().typography).toBeNull();
  });

  it("measures every role at the size the scale gives it", () => {
    const system = typeSystem();
    const built = report({ typography: system });

    expect(built.typography).not.toBeNull();
    expect(built.typography!.roles).toHaveLength(system.roles.length);

    for (const role of built.typography!.roles) {
      expect(role.fontSizePx).toBeGreaterThan(0);
      expect(role.ratio).toBeGreaterThan(0);
      expect(role.fontFamilies).toContain("Inter");
    }
  });

  it("applies the large-text threshold by size and weight", () => {
    /* The reason the report covers typography at all: the same pair of colours
       passes at a heading and fails at a caption, so a verdict that does not
       name its size is not one. */
    const built = report({ typography: typeSystem() });
    const roles = built.typography!.roles;

    for (const role of roles) {
      const expectedLarge =
        role.fontWeight >= 700
          ? role.fontSizePx >= 18.66
          : role.fontSizePx >= 24;
      expect(role.isLargeText, role.name).toBe(expectedLarge);
      expect(role.requiredAA).toBe(role.isLargeText ? 3 : 4.5);
    }

    // A scale with a heading and body should produce both kinds.
    expect(roles.some((role) => role.isLargeText)).toBe(true);
    expect(roles.some((role) => !role.isLargeText)).toBe(true);
  });

  it("names the pair every role was measured against", () => {
    /* A ratio without its two colours cannot be checked later. */
    const built = report({ typography: typeSystem() });

    expect(built.typography!.foreground).toMatch(/^#[0-9a-f]{6}$/);
    expect(built.typography!.background).toMatch(/^#[0-9a-f]{6}$/);
    expect(built.typography!.foreground).not.toBe(built.typography!.background);
  });
});

describe("formatAccessibilityReportMarkdown", () => {
  it("carries every section", () => {
    const markdown = formatAccessibilityReportMarkdown(
      report({ typography: typeSystem() }),
    );

    expect(markdown).toContain("# Accessibility report — Brand");
    expect(markdown).toContain("## Text contrast");
    expect(markdown).toContain("## Controls and focus");
    expect(markdown).toContain("## Colour vision");
    expect(markdown).toContain("## Typography");
    expect(markdown).toContain("## Method");
  });

  it("drops the typography section when there is no scale", () => {
    const markdown = formatAccessibilityReportMarkdown(report());
    expect(markdown).not.toContain("## Typography");
    expect(markdown).toContain("## Colour vision");
  });

  it("names the deficiencies a pair collapses under", () => {
    /* The whole point of the colour-vision section: which people cannot tell
       these two apart. */
    const markdown = formatAccessibilityReportMarkdown(report());

    expect(markdown).toContain("Success and error");
    expect(markdown).toMatch(/Collapses/);
    expect(markdown).toMatch(/Deuteranopia/);
  });

  it("names the deficiencies a contrast pair weakens under", () => {
    /* A column, not a verdict. WCAG defines AA on the actual colours, so the
       report says which people a passing pair stops working for and leaves the
       pass where it belongs — on the real palette. */
    const weakPalette = generatePalettes({
      tracks: [
        { id: "primary", name: "primary", seedHex: "#7646ab" },
        { id: "neutral", name: "neutral", seedHex: "#737373" },
        { id: "success", name: "success", seedHex: "#802020" },
      ],
      lightnessValues: LIGHTNESS,
    });
    const weakening = buildAccessibilityReport({
      projectName: "Weak",
      palettes: weakPalette,
      semantics: seedSemanticTokens(weakPalette),
    })!;

    const markdown = formatAccessibilityReportMarkdown(weakening);
    expect(markdown).toContain("Weakens under");
    expect(markdown).toMatch(/Success status text \|.*\| Deuteranopia \|/);
  });

  it("cites the method at the bottom", () => {
    const markdown = formatAccessibilityReportMarkdown(report());

    expect(markdown).toContain(`- Contrast: ${REPORT_WCAG_VERSION}.`);
    expect(markdown).toContain("Machado, Oliveira and Fernandes (2009)");
    expect(markdown).toContain("severity 1");
  });

  it("is a table a reader can follow", () => {
    /* Every row in a Markdown table needs the same number of cells as its
       header, or it renders as prose. Counting them is cheap and this has no
       other way of going wrong quietly. */
    const markdown = formatAccessibilityReportMarkdown(
      report({ typography: typeSystem() }),
    );

    let expected: number | null = null;
    for (const line of markdown.split("\n")) {
      if (!line.startsWith("|")) {
        expected = null;
        continue;
      }
      const cells = line.split("|").length;
      if (expected === null) expected = cells;
      expect(cells, line).toBe(expected);
    }
  });
});

describe("formatAccessibilityReportJson", () => {
  it("round-trips through JSON", () => {
    const built = report({ typography: typeSystem() });
    const parsed = JSON.parse(formatAccessibilityReportJson(built));

    expect(parsed).toEqual(JSON.parse(JSON.stringify(built)));
  });

  it("ends with a newline", () => {
    expect(formatAccessibilityReportJson(report())).toMatch(/\n$/);
  });

  it("carries the method and the warnings a machine could read", () => {
    const parsed = JSON.parse(
      formatAccessibilityReportJson(report({ typography: typeSystem() })),
    );

    expect(parsed.method.wcagVersion).toBe(REPORT_WCAG_VERSION);
    expect(parsed.colour.semanticPairs).toHaveLength(15);
    expect(parsed.typography.roles.length).toBeGreaterThan(0);

    const successError = parsed.colour.semanticPairs.find(
      (pair: { label: string }) => pair.label === "Success and error",
    );
    expect(successError.collapsesUnder).toContain("deuteranopia");
  });
});
