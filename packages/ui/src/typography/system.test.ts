import { describe, expect, it } from "vitest";
import { generateTypeSteps } from "./scale";
import {
  canAddRole,
  elementForRole,
  defaultGroups,
  moveGroup,
  groupCapacity,
  reindexGroup,
  renameGroup,
  slugify,
  roleIdsForGroup,
  resolveRoleSizePx,
  type TypeGroup,
  type TypeRole,
  type TypeSystem,
} from "./system";

function role(id: string, groupId: string, over: Partial<TypeRole> = {}) {
  return {
    id,
    name: id,
    groupId,
    fontId: "base",
    fontWeight: 400,
    textTransform: "number",
    stepOffset: 0,
    sameAsRoleId: null,
    desktop: { fontSizePx: 16, lineHeight: 1.5, letterSpacingPx: 0 },
    mobile: { fontSizePx: 16, lineHeight: 1.5, letterSpacingPx: 0 },
    ...over,
  } as TypeRole;
}

function system(over: Partial<TypeSystem> = {}): TypeSystem {
  return {
    id: "s",
    name: "S",
    groups: defaultGroups(),
    baseFontSizePx: 16,
    ratio: 1.25,
    stepCount: 9,
    breakpointPx: 768,
    fonts: [
      { id: "base", name: "Base", families: ["Inter"], source: "system" },
    ],
    roles: [role("body", "body")],
    ...over,
  };
}

const free = (id: string, indexing: TypeGroup["indexing"]): TypeGroup => ({
  id,
  label: id,
  indexing,
});

describe("roleIdsForGroup", () => {
  it("drops the index when a group holds one role", () => {
    // A lone caption-1 reads as the first of a family that does not exist.
    const group = free("caption", "number");
    expect(roleIdsForGroup(group, 1)).toEqual(["caption"]);
  });

  it("indexes from one as soon as there are two", () => {
    const group = free("caption", "number");
    expect(roleIdsForGroup(group, 3)).toEqual([
      "caption-1",
      "caption-2",
      "caption-3",
    ]);
  });

  it("walks shirt sizes small to large", () => {
    const group = free("subtitle", "size");
    expect(roleIdsForGroup(group, 3)).toEqual([
      "subtitle-xs",
      "subtitle-sm",
      "subtitle-md",
    ]);
  });

  it("names headings h1 upward and never drops the number", () => {
    const heading = defaultGroups()[0]!;
    expect(roleIdsForGroup(heading, 1)).toEqual(["h1"]);
    expect(roleIdsForGroup(heading, 3)).toEqual(["h1", "h2", "h3"]);
    // No dash: h1, not h-1.
    expect(roleIdsForGroup(heading, 2).every((id) => !id.includes("-"))).toBe(
      true,
    );
  });

  it("caps each group at what its indexing can name", () => {
    expect(groupCapacity(defaultGroups()[0]!)).toBe(6);
    expect(groupCapacity(free("s", "size"))).toBe(5);
    expect(canAddRole(system({ roles: [] }), free("s", "size"))).toBe(true);
  });
});

describe("reindexGroup", () => {
  it("renames a lone role when a second joins it", () => {
    const group = free("caption", "number");
    const s = system({
      groups: [...defaultGroups(), group],
      roles: [role("caption", "caption"), role("caption-x", "caption")],
    });
    const next = reindexGroup(s, "caption");
    expect(next.roles.map((r) => r.id)).toEqual(["caption-1", "caption-2"]);
  });

  it("repoints anything following a renamed role", () => {
    // Otherwise a role would silently stop following the one it was tied to.
    const group = free("caption", "number");
    const s = system({
      groups: [...defaultGroups(), group],
      roles: [
        role("caption", "caption"),
        role("caption-x", "caption"),
        role("body", "body", { sameAsRoleId: "caption" }),
      ],
    });
    const next = reindexGroup(s, "caption");
    expect(next.roles.find((r) => r.id === "body")!.sameAsRoleId).toBe(
      "caption-1",
    );
  });

  it("numbers headings without a dash, and the element follows the id", () => {
    const s = system({ roles: [role("h1", "h"), role("hx", "h")] });
    const next = reindexGroup(s, "h");
    expect(next.roles.map((r) => r.id)).toEqual(["h1", "h2"]);
    expect(next.roles.map((r) => elementForRole(next, r))).toEqual([
      "h1",
      "h2",
    ]);
  });

  it("keeps a lone heading numbered rather than a bare h", () => {
    // h1 is the name; a bare "h" is not a role anyone means.
    const s = system({ roles: [role("hx", "h")] });
    expect(reindexGroup(s, "h").roles[0]!.id).toBe("h1");
  });

  it("derives p for everything outside the heading group", () => {
    const s = system();
    expect(elementForRole(s, s.roles[0]!)).toBe("p");
  });

  it("does nothing when the ids are already right", () => {
    const s = system();
    expect(reindexGroup(s, "body")).toBe(s);
  });
});

describe("moveGroup", () => {
  it("moves a free group", () => {
    const a = free("a", "number");
    const b = free("b", "number");
    const s = system({ groups: [a, b, ...defaultGroups()] });
    expect(moveGroup(s, "b", -1).map((g) => g.id)).toEqual([
      "b",
      "a",
      "h",
      "body",
    ]);
  });

  it("moves a default group like any other, since none are locked", () => {
    const s = system({ groups: [...defaultGroups(), free("a", "number")] });
    expect(moveGroup(s, "h", 1).map((g) => g.id)).toEqual(["body", "h", "a"]);
  });

  it("refuses to move past the ends", () => {
    const s = system({ groups: [free("a", "number"), ...defaultGroups()] });
    expect(moveGroup(s, "a", -1)[0]!.id).toBe("a");
  });
});

describe("resolveRoleSizePx", () => {
  const steps = generateTypeSteps(16, 1.25, 9);

  it("uses the step at the role's offset", () => {
    const s = system();
    const base = steps.find((step) => step.offset === 0)!;
    expect(resolveRoleSizePx(s, steps, role("body", "body"))).toBe(
      base.fontSizePx,
    );
  });

  it("follows another role when told to", () => {
    // "Body with a small adjustment" is how most component styles behave.
    const button = role("button", "body", {
      stepOffset: 3,
      sameAsRoleId: "body",
      fontWeight: 600,
    });
    const s = system({ roles: [role("body", "body"), button] });
    expect(resolveRoleSizePx(s, steps, button)).toBe(
      resolveRoleSizePx(s, steps, role("body", "body")),
    );
  });

  it("falls back to the stored size when the role is unlinked", () => {
    const hand = role("hero", "body", {
      stepOffset: null,
      desktop: { fontSizePx: 91, lineHeight: 1, letterSpacingPx: 0 },
    });
    expect(resolveRoleSizePx(system({ roles: [hand] }), steps, hand)).toBe(91);
  });

  it("does not hang when two roles point at each other", () => {
    const a = role("a", "body", { sameAsRoleId: "b" });
    const b = role("b", "body", { sameAsRoleId: "a" });
    const s = system({ roles: [a, b] });
    expect(() => resolveRoleSizePx(s, steps, a)).not.toThrow();
  });
});

describe("renameGroup", () => {
  it("renames the group's roles with it", () => {
    // Ids are built from the group id, so the label and the exported token
    // names would otherwise drift apart.
    const group = free("caption", "number");
    const s = system({
      groups: [...defaultGroups(), group],
      roles: [role("caption", "caption")],
    });

    const next = renameGroup(s, "caption", "Overline");
    expect(next.groups.find((g) => g.label === "Overline")!.id).toBe(
      "overline",
    );
    expect(next.roles.map((r) => r.id)).toEqual(["overline"]);
  });

  it("keeps indexes when the group holds several", () => {
    const group = free("caption", "number");
    const s = system({
      groups: [...defaultGroups(), group],
      roles: [role("caption-1", "caption"), role("caption-2", "caption")],
    });
    const next = renameGroup(s, "caption", "Overline");
    expect(next.roles.map((r) => r.id)).toEqual(["overline-1", "overline-2"]);
  });

  it("renames a default group like any other", () => {
    const s = system();
    const next = renameGroup(s, "h", "Titles");
    expect(next.groups.find((g) => g.label === "Titles")!.id).toBe("titles");
  });

  it("avoids colliding with an existing group", () => {
    const s = system({
      groups: [
        ...defaultGroups(),
        free("caption", "number"),
        free("overline", "number"),
      ],
      roles: [],
    });
    const next = renameGroup(s, "caption", "Overline");
    expect(next.groups.map((g) => g.id)).toContain("overline-2");
  });
});

describe("slugify", () => {
  it("lowercases and joins words with a dash", () => {
    expect(slugify("  Small  Print ")).toBe("small-print");
  });
});
