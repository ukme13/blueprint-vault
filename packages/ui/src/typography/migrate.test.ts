import { describe, expect, it } from "vitest";
import { createFerreTypographyPreset } from "./ferre-preset";
import {
  migrateFerreSystem,
  migrateLegacyProject,
  splitFontFamily,
  type LegacyTypographyProject,
} from "./migrate";
import { generateTypeScale } from "./scale";
import { fontFamilyValue } from "./system";
import { SEMANTIC_ROLES } from "./types";

const legacy: LegacyTypographyProject = {
  name: "My type scale",
  fontFamily: '"Geist Sans", ui-sans-serif, system-ui',
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

describe("splitFontFamily", () => {
  it("splits a css stack and drops quotes", () => {
    expect(splitFontFamily('"Geist Sans", ui-sans-serif, system-ui')).toEqual([
      "Geist Sans",
      "ui-sans-serif",
      "system-ui",
    ]);
  });

  it("survives a single family and stray whitespace", () => {
    expect(splitFontFamily("  Inter  ")).toEqual(["Inter"]);
  });
});

describe("migrateLegacyProject", () => {
  const system = migrateLegacyProject(legacy);

  it("keeps every role", () => {
    expect(system.roles.map((role) => role.id).sort()).toEqual(
      [...SEMANTIC_ROLES].sort(),
    );
  });

  it("keeps role ids as the legacy names, so token names do not change", () => {
    // The old export emitted --font-body-size; the merged one emits
    // --font-{id}-size. Identical only while the id stays "body".
    expect(system.roles.some((role) => role.id === "body")).toBe(true);
  });

  it("preserves the sizes the project already rendered", () => {
    const scale = generateTypeScale({
      fontFamily: legacy.fontFamily,
      baseFontSizePx: legacy.baseFontSizePx,
      ratio: legacy.ratio,
      stepCount: legacy.stepCount,
    });

    scale.roles.forEach((assignment) => {
      const migrated = system.roles.find(
        (role) => role.id === assignment.role,
      )!;
      const step = scale.steps.find(
        (candidate) => candidate.step === assignment.step,
      )!;
      expect(migrated.step).toBe(assignment.step);
      expect(migrated.desktop.fontSizePx).toBe(step.fontSizePx);
    });
  });

  it("preserves per-role weight, line height and spacing", () => {
    const body = system.roles.find((role) => role.id === "body")!;
    expect(body.fontWeight).toBe(400);
    expect(body.desktop.lineHeight).toBe(1.5);
    expect(body.desktop.letterSpacingPx).toBe(0);
  });

  it("keeps every role linked to a step, because these sizes were generated", () => {
    expect(system.roles.every((role) => role.step !== null)).toBe(true);
  });

  it("starts mobile equal to desktop rather than inventing smaller sizes", () => {
    system.roles.forEach((role) => {
      expect(role.mobile).toEqual(role.desktop);
    });
  });

  it("gives display the only h1", () => {
    const h1s = system.roles.filter((role) => role.element === "h1");
    expect(h1s.map((role) => role.id)).toEqual(["display"]);
  });

  it("wraps the single family in a one-entry stack", () => {
    expect(system.fonts).toHaveLength(1);
    expect(system.fonts[0]!.families[0]).toBe("Geist Sans");
    expect(system.roles.every((role) => role.fontId === "base")).toBe(true);
  });

  it("tolerates a project missing a role style", () => {
    const partial = {
      ...legacy,
      roleStyles: { body: legacy.roleStyles.body! },
    };
    expect(() => migrateLegacyProject(partial)).not.toThrow();
  });
});

describe("migrateFerreSystem", () => {
  const system = migrateFerreSystem(createFerreTypographyPreset());

  it("keeps every role and font", () => {
    const preset = createFerreTypographyPreset();
    expect(system.roles).toHaveLength(preset.roles.length);
    expect(system.fonts).toHaveLength(preset.fonts.length);
  });

  it("unlinks every role from the scale, because its sizes were authored", () => {
    expect(system.roles.every((role) => role.step === null)).toBe(true);
  });

  it("keeps desktop and mobile values distinct", () => {
    const h1 = system.roles.find((role) => role.id === "h1")!;
    expect(h1.desktop.fontSizePx).not.toBe(h1.mobile.fontSizePx);
  });

  it("derives groups and elements from role ids", () => {
    const h1 = system.roles.find((role) => role.id === "h1")!;
    expect(h1.group).toBe("heading");
    expect(h1.element).toBe("h1");
  });

  it("keeps per-role fonts, which is what makes a bilingual system work", () => {
    const fontIds = new Set(system.roles.map((role) => role.fontId));
    expect(fontIds.size).toBeGreaterThan(1);
  });

  it("quotes multi-word families so the css stack stays valid", () => {
    const contentRole = system.roles.find((role) => role.fontId === "content")!;
    // "Noto Sans Thai" must be quoted; a bare identifier like Orbitron must not,
    // because quoting is only required where the family is not a valid ident.
    expect(fontFamilyValue(system, contentRole)).toContain('"Noto Sans Thai"');

    const displayRole = system.roles.find((role) => role.fontId === "display")!;
    expect(fontFamilyValue(system, displayRole)).toBe("Orbitron, sans-serif");
  });

  it("carries the breakpoint across", () => {
    expect(system.breakpointPx).toBe(
      createFerreTypographyPreset().breakpointPx,
    );
  });
});
