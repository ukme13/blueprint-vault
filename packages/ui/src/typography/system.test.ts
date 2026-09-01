import { describe, expect, it } from "vitest";
import { generateTypeSteps } from "./scale";
import {
  addGroup,
  addRole,
  canAddRole,
  elementForRole,
  defaultGroups,
  moveGroup,
  groupCapacity,
  addFont,
  removeFont,
  renameFont,
  reindexGroup,
  removeGroup,
  removeRole,
  renameGroup,
  setFontFamilies,
  setLocalFont,
  slugify,
  updateGroup,
  updateRole,
  updateRoleValue,
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
    const heading = defaultGroups().find((g) => g.id === "h")!;
    expect(roleIdsForGroup(heading, 1)).toEqual(["h1"]);
    expect(roleIdsForGroup(heading, 3)).toEqual(["h1", "h2", "h3"]);
    // No dash: h1, not h-1.
    expect(roleIdsForGroup(heading, 2).every((id) => !id.includes("-"))).toBe(
      true,
    );
  });

  it("caps each group at what its indexing can name", () => {
    expect(groupCapacity(defaultGroups().find((g) => g.id === "h")!)).toBe(6);
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
      "display",
      "h",
      "body",
    ]);
  });

  it("moves a default group like any other, since none are locked", () => {
    const s = system({ groups: [...defaultGroups(), free("a", "number")] });
    expect(moveGroup(s, "h", 1).map((g) => g.id)).toEqual([
      "display",
      "body",
      "h",
      "a",
    ]);
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
      desktop: {
        fontSizePx: 91,
        lineHeight: { mode: "ratio", value: 1 },
        letterSpacingPx: 0,
      },
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

describe("font entries", () => {
  it("adds one starting from the first entry's stack", () => {
    /* Not empty: a new font should render something immediately rather than
       showing nothing until a family is picked. */
    const s = system();
    const next = addFont(s, "Display");
    expect(next.fonts).toHaveLength(2);
    expect(next.fonts[1]!.name).toBe("Display");
    expect(next.fonts[1]!.families).toEqual(s.fonts[0]!.families);
  });

  it("gives each new entry its own id", () => {
    const s = addFont(addFont(system()));
    expect(new Set(s.fonts.map((font) => font.id)).size).toBe(s.fonts.length);
  });

  it("moves roles onto a survivor when an entry goes", () => {
    // A role pointing at a deleted font would have nothing to render with.
    const s = addFont(system(), "Display");
    const assigned = {
      ...s,
      roles: [role("body", "body", { fontId: s.fonts[1]!.id })],
    };
    const next = removeFont(assigned, s.fonts[1]!.id);
    expect(next.fonts).toHaveLength(1);
    expect(next.roles[0]!.fontId).toBe(next.fonts[0]!.id);
  });

  it("refuses to remove the last entry", () => {
    const s = system();
    expect(removeFont(s, s.fonts[0]!.id)).toBe(s);
  });

  it("ignores an entry that is not there", () => {
    const s = addFont(system());
    expect(removeFont(s, "nope").fonts).toHaveLength(2);
  });

  it("renames without moving the id, so exported tokens stay put", () => {
    const s = system();
    const next = renameFont(s, s.fonts[0]!.id, "Primary");
    expect(next.fonts[0]!.name).toBe("Primary");
    expect(next.fonts[0]!.id).toBe(s.fonts[0]!.id);
  });
});

describe("addRole", () => {
  it("refuses a group that is already full", () => {
    const group = free("s", "size");
    const roles = ["a", "b", "c", "d", "e"].map((id) => role(id, "s"));
    const before = system({ groups: [group], roles });
    expect(addRole(before, group)).toBe(before);
  });

  it("reuses a sibling's step, so adding never grows the ramp", () => {
    const group = free("caption", "number");
    const before = system({
      groups: [group],
      roles: [role("caption", "caption", { stepOffset: -2 })],
    });
    const after = addRole(before, group);
    expect(after.roles.map((r) => r.stepOffset)).toEqual([-2, -2]);
  });

  it("names both roles through the group once a second joins", () => {
    const group = free("caption", "number");
    const before = system({
      groups: [group],
      roles: [role("caption", "caption")],
    });
    // The lone `caption` becomes `caption-1`; no placeholder id survives.
    expect(addRole(before, group).roles.map((r) => r.id)).toEqual([
      "caption-1",
      "caption-2",
    ]);
  });

  it("copies body when the group is empty", () => {
    const group = free("aside", "number");
    const before = system({
      groups: [group],
      roles: [role("body", "body", { fontWeight: 500, stepOffset: 3 })],
    });
    const added = addRole(before, group).roles.find(
      (r) => r.groupId === "aside",
    )!;
    expect(added.fontWeight).toBe(500);
    expect(added.stepOffset).toBe(3);
  });

  it("falls back to the first role when there is no body", () => {
    const group = free("aside", "number");
    const before = system({
      groups: [group],
      roles: [role("lead", "lead", { fontWeight: 700 })],
    });
    const added = addRole(before, group).roles.find(
      (r) => r.groupId === "aside",
    )!;
    expect(added.fontWeight).toBe(700);
  });

  it("clears the copy's sameAsRoleId without unlinking the template", () => {
    const group = free("caption", "number");
    const before = system({
      groups: [group],
      roles: [role("caption", "caption", { sameAsRoleId: "body" })],
    });
    const after = addRole(before, group);
    // The new role gets its own size; the one it was copied from keeps the
    // link someone set on it deliberately.
    expect(after.roles.map((r) => r.sameAsRoleId)).toEqual(["body", null]);
  });
});

describe("removeRole", () => {
  it("unlinks anything that followed the removed role", () => {
    const before = system({
      groups: [free("body", "number"), free("lead", "number")],
      roles: [
        role("body", "body"),
        role("lead", "lead", { sameAsRoleId: "body" }),
      ],
    });
    const after = removeRole(before, "body");
    expect(after.roles.map((r) => r.id)).toEqual(["lead"]);
    // Kept its own size rather than following an id that is gone.
    expect(after.roles[0]!.sameAsRoleId).toBeNull();
  });

  it("unlinks every follower, not just the first", () => {
    const before = system({
      groups: [free("body", "number"), free("lead", "number")],
      roles: [
        role("body", "body"),
        role("lead-1", "lead", { sameAsRoleId: "body" }),
        role("lead-2", "lead", { sameAsRoleId: "body" }),
      ],
    });
    expect(
      removeRole(before, "body").roles.every((r) => r.sameAsRoleId === null),
    ).toBe(true);
  });

  it("renames the survivors of the group it left", () => {
    const group = free("caption", "number");
    const before = system({
      groups: [group],
      roles: [role("caption-1", "caption"), role("caption-2", "caption")],
    });
    // Back to one role, so the index goes away again.
    expect(removeRole(before, "caption-2").roles.map((r) => r.id)).toEqual([
      "caption",
    ]);
  });

  it("ignores an id that is not there", () => {
    const before = system();
    expect(removeRole(before, "nope").roles).toEqual(before.roles);
  });
});

describe("updateRole", () => {
  it("patches the named role only", () => {
    const before = system({
      groups: [free("body", "number")],
      roles: [role("body", "body"), role("lead", "body")],
    });
    const after = updateRole(before, "lead", { fontWeight: 700 });
    expect(after.roles.map((r) => r.fontWeight)).toEqual([400, 700]);
  });

  it("writes a value to both breakpoints, which are never edited apart", () => {
    const before = system();
    const lineHeight = { mode: "ratio", value: 1.2 } as const;
    const after = updateRoleValue(before, "body", { lineHeight });
    expect(after.roles[0]!.desktop.lineHeight).toEqual(lineHeight);
    expect(after.roles[0]!.mobile.lineHeight).toEqual(lineHeight);
  });

  it("leaves the rest of the value alone", () => {
    const before = system();
    const after = updateRoleValue(before, "body", { letterSpacingPx: 0.5 });
    expect(after.roles[0]!.desktop.fontSizePx).toBe(16);
    expect(after.roles[0]!.desktop.lineHeight).toBe(1.5);
  });
});

describe("updateGroup", () => {
  it("renames the roles when the indexing changes under them", () => {
    const before = system({
      groups: [free("subtitle", "number")],
      roles: [role("subtitle-1", "subtitle"), role("subtitle-2", "subtitle")],
    });
    const after = updateGroup(before, "subtitle", { indexing: "size" });
    expect(after.roles.map((r) => r.id)).toEqual([
      "subtitle-xs",
      "subtitle-sm",
    ]);
  });

  it("changes the label without touching the ids", () => {
    const before = system({
      groups: [free("caption", "number")],
      roles: [role("caption", "caption")],
    });
    const after = updateGroup(before, "caption", { label: "Overline" });
    expect(after.groups[0]!.label).toBe("Overline");
    expect(after.roles[0]!.id).toBe("caption");
  });
});

describe("addGroup", () => {
  it("names the new group after how many there are", () => {
    const before = system({ groups: [free("a", "number")] });
    expect(addGroup(before).groups.map((g) => g.id)).toEqual(["a", "group-2"]);
  });

  it("skips a number already taken", () => {
    // Two groups, so it tries group-3 first and has to walk past it.
    const before = system({
      groups: [free("a", "number"), free("group-3", "number")],
    });
    expect(addGroup(before).groups.at(-1)!.id).toBe("group-4");
  });

  it("adds no roles, so a new group starts empty", () => {
    const before = system();
    expect(addGroup(before).roles).toEqual(before.roles);
  });
});

describe("removeGroup", () => {
  it("takes the group's roles with it and leaves the others", () => {
    const before = system({
      groups: [free("body", "number"), free("caption", "number")],
      roles: [role("body", "body"), role("caption", "caption")],
    });
    const after = removeGroup(before, "caption");
    expect(after.groups.map((g) => g.id)).toEqual(["body"]);
    expect(after.roles.map((r) => r.id)).toEqual(["body"]);
  });
});

describe("setFontFamilies", () => {
  it("marks the entry a Google one, since the picker is what wrote it", () => {
    const before = system();
    const after = setFontFamilies(before, "base", ["Sarabun", "sans-serif"]);
    expect(after.fonts[0]!.families).toEqual(["Sarabun", "sans-serif"]);
    expect(after.fonts[0]!.source).toBe("google");
  });

  it("leaves the other entries alone", () => {
    const before = system({
      fonts: [
        { id: "base", name: "Base", families: ["Inter"], source: "system" },
        { id: "alt", name: "Alt", families: ["Lora"], source: "system" },
      ],
    });
    const after = setFontFamilies(before, "base", ["Sarabun"]);
    expect(after.fonts[1]!.families).toEqual(["Lora"]);
    expect(after.fonts[1]!.source).toBe("system");
  });
});

describe("setLocalFont", () => {
  it("points the entry at the uploaded family and marks it local", () => {
    const before = system();
    const after = setLocalFont(before, "base", "Brand-Regular");
    expect(after.fonts[0]!.families[0]).toBe("Brand-Regular");
    expect(after.fonts[0]!.source).toBe("local");
  });

  it("keeps a generic on the end, so a missing file still renders", () => {
    const after = setLocalFont(system(), "base", "Brand-Regular");
    // The file can be absent in another browser; the entry must still resolve.
    expect(after.fonts[0]!.families.at(-1)).toBe("sans-serif");
  });

  it("leaves the other entries alone", () => {
    const before = system({
      fonts: [
        { id: "base", name: "Base", families: ["Inter"], source: "system" },
        { id: "alt", name: "Alt", families: ["Lora"], source: "google" },
      ],
    });
    const after = setLocalFont(before, "base", "Brand");
    expect(after.fonts[1]!.families).toEqual(["Lora"]);
    expect(after.fonts[1]!.source).toBe("google");
  });

  it("takes an entry back off local when a Google family is picked", () => {
    // setFontFamilies is the other direction, so an upload is recoverable.
    const local = setLocalFont(system(), "base", "Brand");
    const back = setFontFamilies(local, "base", ["Inter", "sans-serif"]);
    expect(back.fonts[0]!.source).toBe("google");
    expect(back.fonts[0]!.families[0]).toBe("Inter");
  });
});
