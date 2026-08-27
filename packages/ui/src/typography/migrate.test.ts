import { describe, expect, it } from "vitest";
import {
  migrateLegacyProject,
  splitFontFamily,
  type LegacyTypographyProject,
} from "./migrate";
import { generateTypeScale } from "./scale";
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
      // Stored as a distance from base, not the raw index.
      expect(migrated.stepOffset).toBe(step.offset);
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
    expect(system.roles.every((role) => role.stepOffset !== null)).toBe(true);
  });

  it("survives a change of step count without moving roles", () => {
    // The bug this replaces: base is the ramp midpoint, so an absolute index
    // pointed at a different size as soon as the count changed.
    const wider = migrateLegacyProject({ ...legacy, stepCount: 13 });
    const body = system.roles.find((role) => role.id === "body")!;
    const widerBody = wider.roles.find((role) => role.id === "body")!;
    expect(widerBody.stepOffset).toBe(body.stepOffset);
  });

  it("gives every system the two fixed groups", () => {
    const fixed = system.groups.filter((group) => group.isFixed);
    expect(fixed.map((group) => group.id).sort()).toEqual(["body", "heading"]);
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
