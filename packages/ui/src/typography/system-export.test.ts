import { describe, expect, it } from "vitest";
import { migrateLegacyProject, type LegacyTypographyProject } from "./migrate";
import type { TypeSystem } from "./system";
import {
  formatTypeSystemCssExport,
  formatTypeSystemTailwindExport,
} from "./system-export";

const legacy: LegacyTypographyProject = {
  name: "My type scale",
  fontFamily: '"Geist Sans", ui-sans-serif',
  baseFontSizePx: 16,
  ratio: 1.25,
  stepCount: 9,
  roleStyles: {
    display: { fontWeight: 700, lineHeight: 1.1, letterSpacingPx: -0.5 },
    heading: { fontWeight: 700, lineHeight: 1.2, letterSpacingPx: -0.25 },
    title: { fontWeight: 600, lineHeight: 1.3, letterSpacingPx: 0 },
    body: { fontWeight: 400, lineHeight: 1.5, letterSpacingPx: 0 },
    label: { fontWeight: 500, lineHeight: 1.4, letterSpacingPx: 0.1 },
    caption: { fontWeight: 400, lineHeight: 1.4, letterSpacingPx: 0.2 },
  },
};

const migratedLegacy = migrateLegacyProject(legacy);
/**
 * A hand-authored bilingual system: two fonts, sizes set rather than generated,
 * and viewports that differ. Covers everything a scale-generated system does
 * not.
 */
const authored: TypeSystem = {
  id: "authored",
  name: "Authored",
  baseFontSizePx: 16,
  ratio: 1.25,
  stepCount: 5,
  breakpointPx: 768,
  fonts: [
    {
      id: "display",
      name: "Display",
      families: ["Orbitron", "sans-serif"],
      source: "system",
    },
    {
      id: "content",
      name: "Content",
      families: ["Noto Sans Thai", "sans-serif"],
      source: "system",
    },
  ],
  roles: [
    {
      id: "h1",
      name: "h1",
      group: "heading",
      element: "h1",
      fontId: "display",
      fontWeight: 700,
      textTransform: "uppercase",
      step: null,
      desktop: { fontSizePx: 56, lineHeight: 1.1, letterSpacingPx: 0 },
      mobile: { fontSizePx: 24, lineHeight: 1.2, letterSpacingPx: 0 },
    },
    {
      id: "body",
      name: "body",
      group: "body",
      element: "p",
      fontId: "content",
      fontWeight: 400,
      textTransform: "none",
      step: null,
      desktop: { fontSizePx: 16, lineHeight: 1.6, letterSpacingPx: 0 },
      mobile: { fontSizePx: 16, lineHeight: 1.6, letterSpacingPx: 0 },
    },
  ],
};

describe("formatTypeSystemCssExport", () => {
  it("keeps the token names the previous export produced", () => {
    const output = formatTypeSystemCssExport(migratedLegacy);

    // The whole point of keeping legacy role ids: these must not change.
    expect(output).toContain("--font-body-size:");
    expect(output).toContain("--font-body-weight: 400;");
    expect(output).toContain("--font-body-line-height: 1.5;");
    expect(output).toContain("--font-display-size:");
  });

  it("still emits the step tokens", () => {
    // The Ferre export dropped these. Losing them would silently break anyone
    // consuming --font-size-N.
    const output = formatTypeSystemCssExport(migratedLegacy);
    expect(output).toMatch(/--font-size-\d+:/);
  });

  it("emits one font-family variable per font, referenced by role", () => {
    const output = formatTypeSystemCssExport(authored);
    expect(output).toContain("--font-family-display:");
    expect(output).toContain("--font-family-content:");
    expect(output).toContain("--font-h1-family: var(--font-family-display);");
  });

  it("quotes multi-word families only", () => {
    const output = formatTypeSystemCssExport(authored);
    expect(output).toContain('"Noto Sans Thai"');
    expect(output).toContain("--font-family-display: Orbitron, sans-serif;");
  });

  it("defaults to rem and honours an explicit unit", () => {
    expect(formatTypeSystemCssExport(migratedLegacy)).toContain(
      "--font-body-size: 1rem;",
    );
    expect(formatTypeSystemCssExport(migratedLegacy, "px")).toContain(
      "--font-body-size: 16px;",
    );
  });

  it("never gives line-height a unit", () => {
    const output = formatTypeSystemCssExport(authored, "pt");
    expect(output).not.toMatch(/line-height: [\d.]+(rem|px|pt)/);
  });
});

describe("viewport handling", () => {
  it("omits the media query when no role differs between viewports", () => {
    // A migrated single-viewport project must not gain an empty media query.
    const output = formatTypeSystemCssExport(migratedLegacy);
    expect(output).not.toContain("@media");
  });

  it("emits desktop as a min-width override when roles differ", () => {
    const output = formatTypeSystemCssExport(authored);
    expect(output).toContain(`@media (min-width: ${authored.breakpointPx}px)`);
  });

  it("puts mobile in :root, so the smallest layout is the default", () => {
    const h1 = authored.roles.find((role) => role.id === "h1")!;
    const output = formatTypeSystemCssExport(authored, "px");
    const rootBlock = output.slice(0, output.indexOf("@media"));

    expect(rootBlock).toContain(`--font-h1-size: ${h1.mobile.fontSizePx}px;`);
    expect(rootBlock).not.toContain(
      `--font-h1-size: ${h1.desktop.fontSizePx}px;`,
    );
  });

  it("keeps the breakpoint in px whatever the size unit", () => {
    const output = formatTypeSystemCssExport(authored, "rem");
    expect(output).toContain("@media (min-width: 768px)");
  });
});

describe("formatTypeSystemTailwindExport", () => {
  it("uses a @theme block with the same tokens", () => {
    const output = formatTypeSystemTailwindExport(migratedLegacy);
    expect(output.startsWith("@theme {")).toBe(true);
    expect(output).toContain("--font-body-size:");
  });
});
