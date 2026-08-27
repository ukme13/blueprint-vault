import { describe, expect, it } from "vitest";
import { createFerreTypographyPreset } from "./ferre-preset";
import { formatResponsiveTypographyCssExport } from "./responsive-export";

describe("Ferre typography preset", () => {
  it("contains the complete responsive Ferre system", () => {
    const preset = createFerreTypographyPreset();

    expect(preset.fonts.map((font) => font.value)).toEqual([
      '"Orbitron", sans-serif',
      '"Noto Sans Thai", sans-serif',
    ]);
    expect(preset.roles).toHaveLength(23);
    expect(preset.roles.find((role) => role.id === "h1")).toMatchObject({
      fontWeight: 700,
      textTransform: "uppercase",
      desktop: { fontSizePx: 56, lineHeight: 1.1 },
      mobile: { fontSizePx: 24, lineHeight: 1.2 },
    });
  });

  it("returns a new editable copy each time", () => {
    const first = createFerreTypographyPreset();
    const second = createFerreTypographyPreset();

    first.roles[0]!.desktop.fontSizePx = 100;
    expect(second.roles[0]!.desktop.fontSizePx).toBe(56);
  });
});

describe("formatResponsiveTypographyCssExport", () => {
  it("exports mobile defaults and desktop overrides", () => {
    const output = formatResponsiveTypographyCssExport(
      createFerreTypographyPreset(),
    );

    expect(output).toContain('--font-family-display: "Orbitron", sans-serif;');
    expect(output).toContain("--font-h1-size: 1.5rem;");
    expect(output).toContain("--font-h1-transform: uppercase;");
    expect(output).toContain("@media (min-width: 768px)");
    expect(output).toContain("--font-h1-size: 3.5rem;");
  });
});

describe("responsive export units", () => {
  it("defaults to rem and honours an explicit unit", () => {
    expect(
      formatResponsiveTypographyCssExport(createFerreTypographyPreset()),
    ).toContain("--font-h1-size: 1.5rem;");
    expect(
      formatResponsiveTypographyCssExport(createFerreTypographyPreset(), "px"),
    ).toContain("--font-h1-size: 24px;");
    expect(
      formatResponsiveTypographyCssExport(createFerreTypographyPreset(), "pt"),
    ).toContain("--font-h1-size: 18pt;");
  });

  it("keeps the media-query breakpoint in px", () => {
    // A breakpoint is a viewport width, not a type size: px is correct here.
    expect(
      formatResponsiveTypographyCssExport(createFerreTypographyPreset(), "rem"),
    ).toContain("@media (min-width: 768px)");
  });
});
