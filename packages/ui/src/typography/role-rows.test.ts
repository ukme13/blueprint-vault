import { describe, expect, it } from "vitest";
import { formatTypeSystemCssExport } from "./system-export";
import { formatLetterSpacing } from "./export";
import { defaultSystem, resolveRoleSizePx, type TypeSystem } from "./system";
import { generateTypeSteps } from "./scale";
import { readTypographyProjectData } from "../workspace/typography-project";
import {
  resolveTemplateSlot,
  typeFontRows,
  typeRoleRowGroups,
  typeRoleVariables,
  typeScaleSummary,
} from "./role-rows";

/*
 * The rows a documentation page renders, and the file a developer installs,
 * have to be describing the same system.
 *
 * Two failures are worth guarding separately. A row can show the wrong number,
 * which is a page that lies about the scale; and a row can show a variable
 * name nothing emits, which is a page a developer copies from and gets nothing.
 * The second is the quieter one, so the names here are checked against the
 * export's own output rather than against a list written twice.
 */

const system = (): TypeSystem =>
  defaultSystem("Reference", ["Geist Sans", "ui-sans-serif"], 16, 1.25, 9);

describe("resolving a role's size", () => {
  it("follows the step offset rather than a stored unlinked size", () => {
    /* Bound roles keep an empty unlinked map. `defaultSystem` lets the
       offsets decide, which is exactly the shape the reference workspace is
       in — eight roles with eight different offsets and no typed sizes. */
    const base = system();
    for (const role of base.roles) {
      expect(role.unlinkedSizes).toEqual({});
    }

    const sizes = new Map(
      typeRoleRowGroups(base).flatMap((group) =>
        group.rows.map((row) => [row.id, row.fontSizePx] as const),
      ),
    );

    expect(sizes.get("body")).toBe(16);
    /* h1 sits six steps above base: 16 × 1.25⁶ is 61.03, which rounds to 62. */
    expect(sizes.get("h1")).toBe(62);
    expect(sizes.get("h6")).toBe(20);
    expect(new Set(sizes.values()).size).toBeGreaterThan(1);
  });

  it("moves every linked role when the base size changes", () => {
    const sizeOf = (sys: TypeSystem, id: string) =>
      typeRoleRowGroups(sys)
        .flatMap((group) => group.rows)
        .find((row) => row.id === id)?.fontSizePx;

    expect(sizeOf(system(), "body")).toBe(16);
    expect(sizeOf({ ...system(), baseFontSizePx: 20 }, "body")).toBe(20);
    expect(sizeOf({ ...system(), baseFontSizePx: 20 }, "h1")).not.toBe(
      sizeOf(system(), "h1"),
    );
  });

  it("shows a typed phone size only on the phone rows", () => {
    const patched: TypeSystem = {
      ...system(),
      roles: system().roles.map((role) =>
        role.id === "body" ? { ...role, unlinkedSizes: { phone: 14 } } : role,
      ),
    };
    const desktop = typeRoleRowGroups(patched, "desktop").flatMap(
      (group) => group.rows,
    );
    const phone = typeRoleRowGroups(patched, "phone").flatMap(
      (group) => group.rows,
    );
    const desktopBody = desktop.find((row) => row.id === "body")!;
    const phoneBody = phone.find((row) => row.id === "body")!;
    expect(desktopBody.fontSizePx).toBe(16);
    expect(desktopBody.stepOffset).toBe(0);
    expect(phoneBody.fontSizePx).toBe(14);
    expect(phoneBody.stepOffset).toBeNull();
  });

  it("shows a typed phone line height only on the phone rows", () => {
    const patched: TypeSystem = {
      ...system(),
      roles: system().roles.map((role) =>
        role.id === "body"
          ? {
              ...role,
              unlinkedLineHeights: {
                phone: { mode: "px" as const, value: 28 },
              },
            }
          : role,
      ),
    };
    const desktop = typeRoleRowGroups(patched, "desktop").flatMap(
      (group) => group.rows,
    );
    const phone = typeRoleRowGroups(patched, "phone").flatMap(
      (group) => group.rows,
    );
    const desktopBody = desktop.find((row) => row.id === "body")!;
    const phoneBody = phone.find((row) => row.id === "body")!;
    expect(desktopBody.lineHeightPx).toBe(24);
    expect(phoneBody.lineHeightPx).toBe(28);
  });
});

describe("the role rows", () => {
  it("groups the roles the way the system groups them", () => {
    const groups = typeRoleRowGroups(system());

    expect(groups.map((group) => group.id)).toEqual(
      system()
        .groups.filter((group) =>
          system().roles.some((role) => role.groupId === group.id),
        )
        .map((group) => group.id),
    );
    /* Groups keep the system's order, and a group with no roles is dropped
       rather than rendered as an empty heading. */
    expect(groups.every((group) => group.rows.length > 0)).toBe(true);
  });

  it("names the element each role renders as", () => {
    const rows = typeRoleRowGroups(system()).flatMap((group) => group.rows);
    const element = (id: string) => rows.find((row) => row.id === id)?.element;

    expect(element("h1")).toBe("h1");
    expect(element("h3")).toBe("h3");
    /* Display is a visual size applied to body copy, not a second h1. That is
       the two-page-titles bug the model was changed to prevent. */
    expect(element("display-1")).toBe("p");
    expect(element("body")).toBe("p");
  });

  it("shows the exact size only where rounding moved it", () => {
    const rows = typeRoleRowGroups(system()).flatMap((group) => group.rows);
    const row = (id: string) => rows.find((entry) => entry.id === id)!;

    /* Base is exactly 16 and needs no footnote. */
    expect(row("body").exactFontSizePx).toBeNull();
    /* h1 is 61.03 rounded to 62, which the reader is owed. */
    expect(row("h1").fontSizePx).toBe(62);
    expect(row("h1").exactFontSizePx).toBeCloseTo(61.035, 2);
  });

  it("resolves line height to a number rather than the config", () => {
    const rows = typeRoleRowGroups(system()).flatMap((group) => group.rows);
    const row = (id: string) => rows.find((entry) => entry.id === id)!;

    /* `{ mode: "auto" }` is an intent. A page interpolating it renders
       "[object Object]", which is the failure this resolution exists to
       prevent. */
    expect(typeof row("body").lineHeight).toBe("number");
    expect(row("body").lineHeight).toBeGreaterThan(1);
    expect(row("h1").lineHeight).toBeLessThan(row("body").lineHeight);
  });

  it("carries the stack as the browser will read it", () => {
    const rows = typeRoleRowGroups(system()).flatMap((group) => group.rows);

    /* Quoted where CSS needs it: "Geist Sans" is one family, not two bare
       identifiers. */
    expect(rows[0]!.fontStack).toContain('"Geist Sans"');
    expect(rows[0]!.fontStack).toContain("ui-sans-serif");
  });
});

describe("the variable names", () => {
  it("are the ones the export writes", () => {
    /* Against the export's own output, not against a second list. A page
       spelling a name itself agrees with the file until somebody names a role
       "Body Large" and the two disagree about the hyphen — and a developer
       copies a variable that resolves to nothing. */
    const css = formatTypeSystemCssExport(system(), "px");

    for (const group of typeRoleRowGroups(system())) {
      for (const row of group.rows) {
        for (const variable of Object.values(row.variables)) {
          expect(
            css,
            `${variable} is on the page and not in the export`,
          ).toContain(`${variable}:`);
        }
      }
    }
  });

  it("survive a role name CSS would not take unescaped", () => {
    const named: TypeSystem = {
      ...system(),
      roles: system().roles.map((role) =>
        role.id === "body" ? { ...role, id: "Body Large" } : role,
      ),
    };

    expect(typeRoleVariables("Body Large").size).toBe("--font-body-large-size");
    expect(formatTypeSystemCssExport(named, "px")).toContain(
      "--font-body-large-size:",
    );
  });

  it("name each font's stack under the export's own variable", () => {
    const css = formatTypeSystemCssExport(system(), "px");
    for (const font of typeFontRows(system())) {
      expect(css).toContain(`${font.variable}:`);
    }
  });
});

describe("where a font comes from", () => {
  it("reads the slot's record rather than guessing from the family", () => {
    const base = system();
    const uploaded: TypeSystem = {
      ...base,
      fonts: base.fonts.map((font, index) =>
        index === 0
          ? {
              ...font,
              families: ["Brand Regular", "ui-sans-serif"],
              sources: { primary: "local" as const },
            }
          : font,
      ),
    };

    const rows = typeFontRows(uploaded);
    /* A local file and a family somebody typed are the same string. The
       difference is the whole reason a page can say "the file is not
       included" rather than rendering a fallback and calling it the font. */
    expect(rows[0]!.availability).toBe("local");
    expect(rows[0]!.primary).toBe("Brand Regular");
  });

  it("calls a catalogue family Google, whatever the slot says", () => {
    const base = system();
    const google: TypeSystem = {
      ...base,
      fonts: base.fonts.map((font, index) =>
        index === 0 ? { ...font, families: ["Inter", "ui-sans-serif"] } : font,
      ),
    };

    const row = typeFontRows(google)[0]!;
    expect(row.availability).toBe("google");
    expect(row.googleFamilies).toEqual(["Inter"]);
  });

  it("calls an unknown family a system font, with nothing to load", () => {
    const row = typeFontRows(system())[0]!;
    /* Geist Sans is not in the Google catalogue and was not uploaded. It
       renders wherever it happens to be installed and nowhere else. */
    expect(row.availability).toBe("system");
    expect(row.googleFamilies).toEqual([]);
  });
});

describe("the scale summary", () => {
  it("reports the ramp the sizes came from", () => {
    const summary = typeScaleSummary(system());

    expect(summary.baseFontSizePx).toBe(16);
    expect(summary.ratio).toBe(1.25);
    expect(summary.steps).toHaveLength(9);
    expect(summary.steps.filter((step) => step.isBase)).toHaveLength(1);
    /* The floor the rounding rule sets: 11px is the one odd size allowed, and
       only ever at the bottom. */
    expect(Math.min(...summary.steps.map((step) => step.fontSizePx))).toBe(11);
  });
});

describe("the rows and the exported file", () => {
  it("agree about every role's size", () => {
    /* The two readers of a type system, pinned to each other. They diverged
       once and in the direction nobody would look: the studio and the
       documentation both resolve before rendering, so a client installing the
       file was the only one who could have seen every role at 16px. */
    const system = defaultSystem(
      "Reference",
      ["Geist Sans", "ui-sans-serif"],
      16,
      1.25,
      9,
    );
    const css = formatTypeSystemCssExport(system, "px");

    for (const group of typeRoleRowGroups(system)) {
      for (const row of group.rows) {
        expect(css, `${row.id} is ${row.fontSizePx}px on the page`).toContain(
          `${row.variables.size}: ${row.fontSizePx}px;`,
        );
        expect(
          css,
          `${row.id} tracking is ${row.letterSpacingCss} on the page`,
        ).toContain(`${row.variables.letterSpacing}: ${row.letterSpacingCss};`);
      }
    }
  });

  it("keeps the same em tracking on phone rows as on desktop", () => {
    const patched: TypeSystem = {
      ...system(),
      roles: system().roles.map((role) =>
        role.id === "h1"
          ? { ...role, letterSpacingPx: -0.5, unlinkedSizes: { phone: 24 } }
          : role,
      ),
    };
    const desktop = typeRoleRowGroups(patched, "desktop")
      .flatMap((group) => group.rows)
      .find((row) => row.id === "h1")!;
    const phone = typeRoleRowGroups(patched, "phone")
      .flatMap((group) => group.rows)
      .find((row) => row.id === "h1")!;
    expect(phone.fontSizePx).toBe(24);
    expect(desktop.fontSizePx).not.toBe(24);
    expect(phone.letterSpacingCss).toBe(desktop.letterSpacingCss);
    expect(phone.letterSpacingCss).toBe(
      formatLetterSpacing(-0.5, desktop.fontSizePx),
    );
  });
});

describe("which role a template slot draws", () => {
  const seeded = () =>
    defaultSystem("Reference", ["Geist Sans", "ui-sans-serif"], 16, 1.25, 9);

  const sizeOf = (
    sys: TypeSystem,
    slot: Parameters<typeof resolveTemplateSlot>[1],
  ) => {
    const role = resolveTemplateSlot(sys, slot);
    if (!role) return undefined;
    return resolveRoleSizePx(
      sys,
      generateTypeSteps(sys.baseFontSizePx, sys.ratio, sys.stepCount),
      role,
    );
  };

  it("takes label and caption by name, now that a default system has them", () => {
    /* The id path. Two consumers argued these roles into the system — the
       article template's kicker and byline, and the documentation home page's
       eyebrow, badge and caption — so the slot that used to fall through to
       body now finds a role with the right name. */
    const system = seeded();

    expect(resolveTemplateSlot(system, "label")?.id).toBe("label");
    expect(resolveTemplateSlot(system, "caption")?.id).toBe("caption");
    /* 12 and 11, not the 14 and 12 that were asked for: two steps below base
       is 10.24 and the floor clamps it to 11, one step below is 12.80 rounding
       to 12, and there is nothing between 12 and base. */
    expect(sizeOf(system, "label")).toBe(12);
    expect(sizeOf(system, "caption")).toBe(11);
  });

  it("gives the article a hierarchy on a workspace with none of its names", () => {
    /* The rule path, on a system stripped of every name a template asks for.
       This is what a workspace saved before the two roles existed looks like,
       and it is why the group rules stay: they are not dead code, they are the
       answer for every project that has not opted in. */
    const base = seeded();
    const system: TypeSystem = {
      ...base,
      roles: base.roles.filter(
        (role) => !["label", "caption"].includes(role.id),
      ),
    };

    expect(sizeOf(system, "display")).toBe(62);
    expect(sizeOf(system, "title")).toBe(48);
    expect(sizeOf(system, "heading")).toBe(40);
    expect(sizeOf(system, "body")).toBe(16);
    /* Both fall to the smallest role the body group has, which is body. */
    expect(sizeOf(system, "label")).toBe(16);
    expect(sizeOf(system, "caption")).toBe(16);

    /* Four distinct sizes across the six slots, and the three that carry the
       article's structure are all different. Mapping each slot to its group's
       first role instead would give 62, 62, 62 — the hero, the standfirst and
       every section heading identical. */
    const structural = [
      sizeOf(system, "display"),
      sizeOf(system, "title"),
      sizeOf(system, "heading"),
    ];
    expect(new Set(structural).size).toBe(3);
  });

  it("prefers a role the workspace actually named", () => {
    /* A rule that outranked an exact name would be the studio telling somebody
       their own role was the wrong one. The `caption` here is moved somewhere
       the rule would never look — the heading group, larger than body — so if
       the rule ran it would return the smallest body role instead. */
    const base = seeded();
    const system: TypeSystem = {
      ...base,
      roles: base.roles.map((role) =>
        role.id === "caption" ? { ...role, groupId: "h", stepOffset: 3 } : role,
      ),
    };

    expect(resolveTemplateSlot(system, "caption")?.id).toBe("caption");
    expect(sizeOf(system, "caption")).toBe(32);
    /* And the slots around it are untouched. */
    expect(sizeOf(system, "body")).toBe(16);
    expect(sizeOf(system, "label")).toBe(12);
  });

  it("falls to the group's last role rather than to body", () => {
    /* A system with two headings should still put a section heading in a
       heading, even though the rule asks for a third. */
    const base = seeded();
    const system: TypeSystem = {
      ...base,
      roles: base.roles.filter(
        (role) => !["h3", "h4", "h5", "h6"].includes(role.id),
      ),
    };

    expect(resolveTemplateSlot(system, "heading")?.id).toBe("h2");
  });

  it("renders something for a system with no groups it knows", () => {
    /* A template must never render unstyled, so the chain ends at the first
       role rather than at null. */
    const base = seeded();
    const system: TypeSystem = {
      ...base,
      groups: [{ id: "custom", label: "Custom", indexing: "number" }],
      roles: base.roles
        .filter((role) => role.id === "h1")
        .map((role) => ({ ...role, groupId: "custom" })),
    };

    expect(resolveTemplateSlot(system, "heading")?.id).toBe("h1");
    expect(resolveTemplateSlot({ ...system, roles: [] }, "body")).toBeNull();
  });
});

describe("a saved type system", () => {
  it("does not gain a role it was saved without", () => {
    /* The opposite of the semantic colour layer, and deliberately. A semantic
       role is vocabulary the system defines, so topping a saved layer up to
       the seed set is a migration. A type role is a decision somebody made
       about their own scale — the same species as a palette track — so adding
       one on their behalf would be inventing their design.

       `label` and `caption` arrived after most saved projects. This is the
       assertion that they stay out of them. */
    const saved = {
      ...defaultSystem("Saved", ["Geist Sans"], 16, 1.25, 9),
      roles: defaultSystem("Saved", ["Geist Sans"], 16, 1.25, 9).roles.filter(
        (role) => !["label", "caption"].includes(role.id),
      ),
    };

    const project = readTypographyProjectData({
      system: saved,
      unit: "px",
      specimenText: "",
      template: "specimen",
    });

    const ids = project!.system.roles.map((role) => role.id);
    expect(ids).not.toContain("label");
    expect(ids).not.toContain("caption");
    /* And a new one does have them, which is the other half of the rule. */
    expect(
      defaultSystem("New", ["Geist Sans"], 16, 1.25, 9).roles.map(
        (role) => role.id,
      ),
    ).toEqual(expect.arrayContaining(["label", "caption"]));
  });
});
