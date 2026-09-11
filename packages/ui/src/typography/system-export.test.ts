import { describe, expect, it } from "vitest";
import { migrateLegacyProject, type LegacyTypographyProject } from "./migrate";
import {
  addExtraDesktop,
  defaultPreviewDevices,
  type PreviewDevice,
} from "./preview-devices";
import { generateTypeSteps } from "./scale";
import { formatLetterSpacing } from "./export";
import {
  defaultSystem,
  resolveRoleSizePx,
  type TypeRole,
  type TypeSystem,
} from "./system";
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
  groups: [
    {
      id: "heading",
      label: "Heading",
      indexing: "number",
      autoLineHeightRatio: 1.2,
    },
    {
      id: "body",
      label: "Body",
      indexing: "number",
      autoLineHeightRatio: 1.5,
    },
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
      unlinkedLetterSpacings: {},
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
      unlinkedLetterSpacings: {},
    },
  ],
};

function withH1(
  patch: Partial<
    Pick<
      TypeRole,
      "unlinkedSizes" | "unlinkedLineHeights" | "unlinkedLetterSpacings"
    >
  >,
): TypeSystem {
  return {
    ...authored,
    roles: authored.roles.map((role) =>
      role.id === "h1" ? { ...role, ...patch } : role,
    ),
  };
}

/** The inner @theme / :root of the media query that opens at `widthPx`. */
function blockAt(css: string, widthPx: number): string {
  const needle = `@media (min-width: ${widthPx}px)`;
  const start = css.indexOf(needle);
  expect(start, `expected ${needle}`).toBeGreaterThanOrEqual(0);
  const next = css.indexOf("@media (min-width:", start + needle.length);
  return next === -1 ? css.slice(start) : css.slice(start, next);
}

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

  it("divides rem by a configured root and names the contract", () => {
    const output = formatTypeSystemCssExport(
      migratedLegacy,
      "rem",
      undefined,
      18,
    );
    expect(output).toContain("--font-body-size: 0.8889rem;");
    expect(output).toContain(
      "/* Lengths in rem assume html { font-size: 18px }. */",
    );
    expect(formatTypeSystemCssExport(migratedLegacy)).not.toContain(
      "assume html",
    );
  });

  it("never gives line-height a unit", () => {
    const output = formatTypeSystemCssExport(authored, "pt");
    expect(output).not.toMatch(/line-height: [\d.]+(rem|px|pt)/);
  });
});

describe("viewport handling", () => {
  it("omits clamp and media queries when no role differs between viewports", () => {
    const output = formatTypeSystemCssExport(migratedLegacy);
    expect(output).not.toContain("clamp(");
    expect(output).not.toContain("@media");
  });

  it("interpolates the first differing pair in :root, from that frame's width", () => {
    /* Authored phone 24 / desktop 56 with no tablet key: tablet falls back
       to the desktop typed size, so the clamp runs from 375px to 768px. */
    const output = formatTypeSystemCssExport(authored, "px");
    expect(output).toContain(
      "--font-h1-size: clamp(24px, calc(24px + 32px * (100vw - 375px) / 393px), 56px);",
    );
    expect(output).not.toContain("@media");
  });

  it("puts the narrowest size in the clamp min, so the smallest layout is the floor", () => {
    const h1 = authored.roles.find((role) => role.id === "h1")!;
    const output = formatTypeSystemCssExport(authored, "px");
    expect(output).toContain(`clamp(${h1.unlinkedSizes.phone}px,`);
    expect(output).toContain(`, ${h1.unlinkedSizes.desktop}px)`);
    expect(output).not.toContain(
      `--font-h1-size: ${h1.unlinkedSizes.desktop}px;`,
    );
  });

  it("keeps the viewport span in px whatever the size unit", () => {
    const output = formatTypeSystemCssExport(authored, "rem");
    expect(output).toContain("(100vw - 375px) / 393px");
  });

  it("does not put letter-spacing inside a size clamp", () => {
    const output = formatTypeSystemCssExport(authored, "px");
    expect(output).toContain("--font-h1-letter-spacing: 0em;");
    expect(output).not.toMatch(/--font-h1-size: clamp\([^)]*letter-spacing/);
  });

  it("writes letter-spacing as em against the desktop size, in every unit", () => {
    const h1 = authored.roles.find((role) => role.id === "h1")!;
    const expected = `--font-h1-letter-spacing: ${formatLetterSpacing(
      h1.letterSpacingPx,
      h1.unlinkedSizes.desktop!,
    )};`;
    expect(formatTypeSystemCssExport(authored, "px")).toContain(expected);
    expect(formatTypeSystemCssExport(authored, "rem")).toContain(expected);
    expect(formatTypeSystemCssExport(authored, "pt")).toContain(expected);
  });

  it("divides tracking by the desktop size, not the phone size", () => {
    const system: TypeSystem = {
      ...authored,
      roles: authored.roles.map((role) =>
        role.id === "h1" ? { ...role, letterSpacingPx: -0.5 } : role,
      ),
    };
    const output = formatTypeSystemCssExport(system, "px");
    expect(output).toContain(
      `--font-h1-letter-spacing: ${formatLetterSpacing(-0.5, 56)};`,
    );
    expect(output).not.toContain(
      `--font-h1-letter-spacing: ${formatLetterSpacing(-0.5, 24)};`,
    );
  });

  it("interpolates a letter-spacing override from the frame it was typed on", () => {
    const system = withH1({
      unlinkedLetterSpacings: { phone: -0.5 },
    });
    const output = formatTypeSystemCssExport(system, "px");
    expect(output).toContain(
      `--font-h1-letter-spacing: clamp(${formatLetterSpacing(-0.5, 24)},`,
    );
    expect(output).toContain(", 0em)");
    expect(output).not.toContain("@media (min-width: 768px)");
  });

  it("starts the next pair at the earlier frame's width", () => {
    const system = withH1({
      unlinkedSizes: { phone: 24, tablet: 40, desktop: 56 },
    });
    const output = formatTypeSystemCssExport(system, "px");
    const rootBlock = output.slice(0, output.indexOf("@media"));

    expect(rootBlock).toContain(
      "--font-h1-size: clamp(24px, calc(24px + 16px * (100vw - 375px) / 393px), 40px);",
    );
    expect(output).toContain("@media (min-width: 768px)");
    expect(output).not.toContain("@media (min-width: 1120px)");
    expect(blockAt(output, 768)).toContain(
      "--font-h1-size: clamp(40px, calc(40px + 16px * (100vw - 768px) / 352px), 56px);",
    );
  });

  it("skips a frame that matches the one before it", () => {
    const system = withH1({
      unlinkedSizes: { phone: 24, tablet: 56, desktop: 56 },
    });
    const output = formatTypeSystemCssExport(system, "px");
    expect(output).toContain("clamp(24px,");
    expect(output).not.toContain("@media");
  });

  it("holds the narrowest size until a later frame actually changes", () => {
    const system = withH1({
      unlinkedSizes: { phone: 24, tablet: 24, desktop: 56 },
    });
    const output = formatTypeSystemCssExport(system, "px");
    const rootBlock = output.slice(0, output.indexOf("@media"));
    expect(rootBlock).toContain("--font-h1-size: 24px;");
    expect(output).toContain("@media (min-width: 768px)");
    expect(blockAt(output, 768)).toContain(
      "--font-h1-size: clamp(24px, calc(24px + 32px * (100vw - 768px) / 352px), 56px);",
    );
  });

  it("includes an extra desktop when its tokens differ", () => {
    const devices = addExtraDesktop(defaultPreviewDevices(authored.ratio));
    const extra = devices.find((device) =>
      device.id.startsWith("desktop-extra"),
    )!;
    const system = withH1({
      unlinkedSizes: {
        phone: 24,
        tablet: 40,
        desktop: 56,
        [extra.id]: 64,
      },
    });
    const output = formatTypeSystemCssExport(system, "px", devices);
    const desktop = devices.find((device) => device.id === "desktop")!;
    expect(output).toContain(`@media (min-width: ${desktop.widthPx}px)`);
    expect(blockAt(output, desktop.widthPx)).toContain(
      `clamp(56px, calc(56px + 8px * (100vw - ${desktop.widthPx}px) / ${extra.widthPx - desktop.widthPx}px), 64px)`,
    );
  });

  it("interpolates a line-height override without repeating unchanged sizes", () => {
    const system = withH1({
      unlinkedSizes: { phone: 24, desktop: 24 },
      unlinkedLineHeights: {
        phone: { mode: "ratio", value: 2 },
      },
    });
    const output = formatTypeSystemCssExport(system, "px");
    expect(output).toContain("--font-h1-size: 24px;");
    expect(output).toContain(
      "--font-h1-line-height: clamp(1.1, calc(2 - 0.9 * (100vw - 375px) / 393px), 2);",
    );
    expect(output).not.toContain("@media");
  });

  it("resolves bound roles against that frame's ratio, not the desktop ramp", () => {
    const system = defaultSystem(
      "Reference",
      ["Geist Sans", "ui-sans-serif"],
      16,
      1.25,
      9,
    );
    const h1 = system.roles.find((role) => role.id === "h1")!;
    const devices: PreviewDevice[] = defaultPreviewDevices(1.25).map(
      (device) => (device.id === "tablet" ? { ...device, ratio: 1.5 } : device),
    );
    const phonePx = resolveRoleSizePx(
      system,
      generateTypeSteps(16, 1.25, 9),
      h1,
      "phone",
    );
    const tabletPx = resolveRoleSizePx(
      system,
      generateTypeSteps(16, 1.5, 9),
      h1,
      "tablet",
    );
    expect(tabletPx).not.toBe(phonePx);

    const output = formatTypeSystemCssExport(system, "px", devices);
    const lo = Math.min(phonePx, tabletPx);
    const rootBlock = output.slice(0, output.indexOf("@media"));
    expect(rootBlock).toContain(`--font-h1-size: clamp(${lo}px,`);
    expect(rootBlock).toContain(`${phonePx}px`);
    expect(blockAt(output, 768)).toContain(`${tabletPx}px`);
    expect(blockAt(output, 768)).toContain(`${phonePx}px`);
    expect(output).not.toContain("@media (min-width: 1120px)");
  });
});

describe("formatTypeSystemTailwindExport", () => {
  it("uses a @theme block with the same tokens", () => {
    const output = formatTypeSystemTailwindExport(migratedLegacy);
    expect(output.startsWith("@theme static {")).toBe(true);
    expect(output).toContain("--font-body-size:");
  });

  it("uses clamp inside the theme block when frames differ", () => {
    const output = formatTypeSystemTailwindExport(authored, "px");
    expect(output).toContain("@theme static {");
    expect(output).toContain(
      "--font-h1-size: clamp(24px, calc(24px + 32px * (100vw - 375px) / 393px), 56px);",
    );
    expect(output).not.toContain("@media");
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
