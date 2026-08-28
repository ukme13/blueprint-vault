import { describe, expect, it } from "vitest";
import {
  migrateLegacyProject,
  normalizeStoredSystem,
  splitFontFamily,
  type LegacyTypographyProject,
} from "./migrate";
import { elementForRole } from "./system";
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

  it("keeps every role, with headings renamed to their level", () => {
    expect(system.roles.map((role) => role.id).sort()).toEqual(
      ["body", "caption", "display", "h1", "h2", "label"].sort(),
    );
    expect(system.roles).toHaveLength(SEMANTIC_ROLES.length);
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

    const idFor: Record<string, string> = {
      display: "display",
      heading: "h1",
      title: "h2",
      body: "body",
      label: "label",
      caption: "caption",
    };

    scale.roles.forEach((assignment) => {
      const migrated = system.roles.find(
        (role) => role.id === idFor[assignment.role],
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

  it("gives every system the default groups", () => {
    const ids = system.groups.map((group) => group.id);
    expect(ids).toContain("h");
    expect(ids).toContain("body");
  });

  it("starts mobile equal to desktop rather than inventing smaller sizes", () => {
    system.roles.forEach((role) => {
      expect(role.mobile).toEqual(role.desktop);
    });
  });

  it("leaves exactly one role owning the h1 element", () => {
    // Two h1s would misrepresent the document outline the preview demonstrates.
    const h1s = system.roles.filter(
      (role) => elementForRole(system, role) === "h1",
    );
    expect(h1s.map((role) => role.id)).toEqual(["h1"]);
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

describe("normalizeStoredSystem", () => {
  /** Exactly what the previous release wrote: no groups, `group`, absolute step. */
  const previousRelease = {
    id: "s",
    name: "Saved",
    baseFontSizePx: 16,
    ratio: 1.25,
    stepCount: 9,
    breakpointPx: 768,
    fonts: [
      { id: "base", name: "Base", families: ["Inter"], source: "system" },
    ],
    roles: [
      {
        id: "body",
        name: "body",
        group: "body",
        fontId: "base",
        fontWeight: 400,
        textTransform: "none",
        step: 4,
        desktop: { fontSizePx: 16, lineHeight: 1.5, letterSpacingPx: 0 },
        mobile: { fontSizePx: 16, lineHeight: 1.5, letterSpacingPx: 0 },
      },
    ],
  };

  it("gives a system with no groups the default ones", () => {
    // This is the crash: system.groups was undefined and the editor mapped it.
    const system = normalizeStoredSystem(previousRelease)!;
    expect(Array.isArray(system.groups)).toBe(true);
    expect(system.groups.some((group) => group.id === "body")).toBe(true);
  });

  it("converts an absolute step into an offset from base", () => {
    // Base sits two steps up from the bottom, so index 4 is offset +2.
    const system = normalizeStoredSystem(previousRelease)!;
    expect(system.roles[0]!.stepOffset).toBe(2);
  });

  it("clamps an offset that no longer has a step", () => {
    /* The ramp used to be centred, so a saved -4 has no step now that base
       moved up. Clamping keeps the role on the scale instead of freezing it at
       a stored size. */
    const deep = {
      ...previousRelease,
      roles: [{ ...previousRelease.roles[0], step: undefined, stepOffset: -4 }],
    };
    const system = normalizeStoredSystem(deep)!;
    expect(system.roles[0]!.stepOffset).toBe(-2);
  });

  it("renames group to groupId and fills sameAsRoleId", () => {
    const system = normalizeStoredSystem(previousRelease)!;
    expect(system.roles[0]!.groupId).toBe("body");
    expect(system.roles[0]!.sameAsRoleId).toBeNull();
  });

  it("keeps a current system unchanged in the ways that matter", () => {
    const current = normalizeStoredSystem(previousRelease)!;
    const again = normalizeStoredSystem(current)!;
    expect(again.roles[0]!.stepOffset).toBe(current.roles[0]!.stepOffset);
    expect(again.groups.length).toBe(current.groups.length);
  });

  it("adopts a role whose group no longer exists rather than losing it", () => {
    const orphaned = {
      ...previousRelease,
      groups: [{ id: "heading", label: "Heading", indexing: "number" }],
      roles: [{ ...previousRelease.roles[0], group: "gone" }],
    };
    const system = normalizeStoredSystem(orphaned)!;
    expect(system.roles).toHaveLength(1);
    expect(system.groups.some((g) => g.id === system.roles[0]!.groupId)).toBe(
      true,
    );
  });

  it("rejects something that is not a system", () => {
    expect(normalizeStoredSystem(null)).toBeNull();
    expect(normalizeStoredSystem({ roles: "nope" })).toBeNull();
  });
});

describe("normalizeStoredSystem repairs stale ids", () => {
  it("turns a group holding body and body-1 into body-1 and body-2", () => {
    /* An earlier release appended a role without renaming its siblings, so a
       saved project can hold both. Loading should fix it untouched. */
    const stored = {
      id: "s",
      name: "Saved",
      baseFontSizePx: 16,
      ratio: 1.25,
      stepCount: 9,
      breakpointPx: 768,
      groups: [{ id: "body", label: "Body", indexing: "number" }],
      fonts: [
        { id: "base", name: "Base", families: ["Inter"], source: "system" },
      ],
      roles: ["body", "body-1"].map((id) => ({
        id,
        name: id,
        groupId: "body",
        fontId: "base",
        fontWeight: 400,
        textTransform: "none",
        stepOffset: 0,
        sameAsRoleId: null,
        desktop: { fontSizePx: 16, lineHeight: 1.5, letterSpacingPx: 0 },
        mobile: { fontSizePx: 16, lineHeight: 1.5, letterSpacingPx: 0 },
      })),
    };

    const system = normalizeStoredSystem(stored)!;
    expect(
      system.roles.filter((r) => r.groupId === "body").map((r) => r.id),
    ).toEqual(["body-1", "body-2"]);
  });
});
