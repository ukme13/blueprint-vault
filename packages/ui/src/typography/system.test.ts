import { describe, expect, it } from "vitest";
import { generateTypeSteps } from "./scale";
import {
  canAddRole,
  defaultElementForRole,
  defaultGroups,
  moveGroup,
  nextRoleId,
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
    element: defaultElementForRole(id),
    fontId: "base",
    fontWeight: 400,
    textTransform: "none",
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
  isFixed: false,
  indexing,
});

describe("nextRoleId", () => {
  it("gives headings h1 to h6 and then stops", () => {
    const groups = defaultGroups();
    const heading = groups[0]!;
    const roles = Array.from({ length: 6 }, (_, i) =>
      role(`h${i + 1}`, "heading"),
    );

    expect(nextRoleId(system({ roles: [] }), heading)).toBe("h1");
    expect(nextRoleId(system({ roles }), heading)).toBeNull();
  });

  it("numbers a number-indexed group", () => {
    const group = free("subtitle", "number");
    const s = system({ groups: [...defaultGroups(), group], roles: [] });
    expect(nextRoleId(s, group)).toBe("subtitle-1");
    expect(
      nextRoleId({ ...s, roles: [role("subtitle-1", "subtitle")] }, group),
    ).toBe("subtitle-2");
  });

  it("walks shirt sizes small to large", () => {
    const group = free("subtitle", "size");
    const s = system({ groups: [...defaultGroups(), group], roles: [] });
    expect(nextRoleId(s, group)).toBe("subtitle-xs");
  });

  it("lets a single group hold exactly one role", () => {
    // A project may want one caption. Forcing caption-1 would be noise.
    const group = free("caption", "none");
    const s = system({ groups: [...defaultGroups(), group], roles: [] });
    expect(nextRoleId(s, group)).toBe("caption");

    const filled = { ...s, roles: [role("caption", "caption")] };
    expect(nextRoleId(filled, group)).toBeNull();
    expect(canAddRole(filled, group)).toBe(false);
  });
});

describe("moveGroup", () => {
  it("moves a free group", () => {
    const a = free("a", "none");
    const b = free("b", "none");
    const s = system({ groups: [a, b, ...defaultGroups()] });
    expect(moveGroup(s, "b", -1).map((g) => g.id)).toEqual([
      "b",
      "a",
      "heading",
      "body",
    ]);
  });

  it("refuses to move a fixed group", () => {
    const s = system({ groups: [...defaultGroups(), free("a", "none")] });
    expect(moveGroup(s, "heading", 1).map((g) => g.id)).toEqual([
      "heading",
      "body",
      "a",
    ]);
  });

  it("refuses to move past the ends", () => {
    const s = system({ groups: [free("a", "none"), ...defaultGroups()] });
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
