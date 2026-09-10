import { describe, expect, it } from "vitest";
import { migrateLegacyProject, type LegacyTypographyProject } from "./migrate";
import { defaultSystem, type TypeSystem } from "./system";
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
  groups: [
    { id: "heading", label: "Heading", indexing: "number" },
    { id: "body", label: "Body", indexing: "number" },
  ],
  fonts: [
    {
      id: "display",
      name: "Display",
      families: ["Orbitron", "sans-serif"],
      sources: { primary: "system" },
    },
    {
      id: "content",
      name: "Content",
      families: ["Noto Sans Thai", "sans-serif"],
      sources: { primary: "system" },
    },
  ],
  roles: [
    {
      id: "h1",
      name: "h1",
      groupId: "heading",
      fontId: "display",
      fontWeight: 700,
      textTransform: "uppercase",
      stepOffset: null,
      sameAsRoleId: null,
      lineHeight: { mode: "ratio", value: 1.1 },
      letterSpacingPx: 0,
      unlinkedSizes: { desktop: 56, phone: 24 },
      unlinkedLineHeights: {},
    },
    {
      id: "body",
      name: "body",
      groupId: "body",
      fontId: "content",
      fontWeight: 400,
      textTransform: "none",
      stepOffset: null,
      sameAsRoleId: null,
      lineHeight: { mode: "ratio", value: 1.6 },
      letterSpacingPx: 0,
      unlinkedSizes: { desktop: 16, phone: 16 },
      unlinkedLineHeights: {},
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

    expect(rootBlock).toContain(`--font-h1-size: ${h1.unlinkedSizes.phone}px;`);
    expect(rootBlock).not.toContain(
      `--font-h1-size: ${h1.unlinkedSizes.desktop}px;`,
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
    expect(output.startsWith("@theme static {")).toBe(true);
    expect(output).toContain("--font-body-size:");
  });
});

describe("google font notice", () => {
  it("names the google families the tokens rely on", () => {
    /* Tokens can name a family but cannot load it, so the requirement has to
       travel with the export or the consuming app silently gets a fallback. */
    const withGoogle: TypeSystem = {
      ...authored,
      fonts: [
        {
          id: "content",
          name: "Content",
          families: ["Sarabun", "sans-serif"],
          sources: { primary: "google" },
        },
      ],
    };
    const output = formatTypeSystemCssExport(withGoogle);
    expect(output).toContain("Google Fonts");
    expect(output).toContain("- Sarabun");
    // A generic keyword is not a Google family.
    expect(output).not.toContain("- sans-serif");
  });

  it("says nothing when no family comes from Google", () => {
    const output = formatTypeSystemCssExport(migratedLegacy);
    expect(output).not.toContain("Google Fonts");
  });
});

describe("the size a role exports", () => {
  it("is the one the ramp resolves, not the one the file stores", () => {
    /* The stored size is only meaningful for a role somebody unlinked by
       typing a number. A role linked to a step keeps whatever was in the field
       when it was last written, and the studio resolves on read and never
       writes back — so `defaultSystem` leaves every role holding the base size
       while the offsets decide what is drawn.
   
       Exported unresolved, that is a design system in which every text role is
       16px. It is not a subtle failure and it is entirely invisible from the
       studio, which resolves before it renders: measured on the reference
       workspace's generated file, `--font-h1-size`, `--font-h2-size` and
       `--font-display-size` were all 16px beside a correct
       `--font-size-8: 62px`. */
    const system = defaultSystem(
      "Reference",
      ["Geist Sans", "ui-sans-serif"],
      16,
      1.25,
      9,
    );
    for (const role of system.roles) {
      expect(role.unlinkedSizes).toEqual({});
    }

    const css = formatTypeSystemCssExport(system, "px");

    expect(css).toContain("--font-h1-size: 62px;");
    expect(css).toContain("--font-h6-size: 20px;");
    expect(css).toContain("--font-body-size: 16px;");
    /* And the role tokens agree with the step tokens they came from. */
    expect(css).toContain("--font-size-8: 62px;");
  });

  it("is the one somebody typed, when they unlinked the role", () => {
    /* The other half, and the reason the field cannot simply be deleted: an
       unlinked role has no step to resolve against and the stored number is
       the only record of the decision. */
    const base = defaultSystem(
      "Reference",
      ["Geist Sans", "ui-sans-serif"],
      16,
      1.25,
      9,
    );
    const system: TypeSystem = {
      ...base,
      roles: base.roles.map((role) =>
        role.id === "h3"
          ? {
              ...role,
              stepOffset: null,
              sameAsRoleId: null,
              unlinkedSizes: { desktop: 41, phone: 41 },
            }
          : role,
      ),
    };

    /* 41 is odd, so the ramp can never generate it. */
    expect(formatTypeSystemCssExport(system, "px")).toContain(
      "--font-h3-size: 41px;",
    );
  });
});
