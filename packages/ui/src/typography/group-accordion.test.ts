import { describe, expect, it } from "vitest";
import {
  openRoleGroupIds,
  renameOpenRoleGroup,
  toggleRoleGroup,
} from "./group-accordion";
import type { TypeGroup } from "./system";

const groups = [
  { id: "display" },
  { id: "headings" },
  { id: "body" },
] as TypeGroup[];

describe("openRoleGroupIds", () => {
  it("opens only the first group until somebody chooses", () => {
    expect(openRoleGroupIds(null, groups)).toEqual(["display"]);
  });

  it("opens nothing when there are no groups", () => {
    expect(openRoleGroupIds(null, [])).toEqual([]);
  });

  it("keeps a choice, including closing every group", () => {
    expect(openRoleGroupIds(["body"], groups)).toEqual(["body"]);
    expect(openRoleGroupIds([], groups)).toEqual([]);
  });
});

describe("toggleRoleGroup", () => {
  it("opens a closed group and leaves the others", () => {
    expect(toggleRoleGroup(["display"], "body")).toEqual(["display", "body"]);
  });

  it("closes an open group and leaves the others", () => {
    expect(toggleRoleGroup(["display", "body"], "display")).toEqual(["body"]);
  });
});

describe("renameOpenRoleGroup", () => {
  it("keeps a renamed group open under its new id", () => {
    expect(renameOpenRoleGroup(["display", "body"], "body", "copy")).toEqual([
      "display",
      "copy",
    ]);
  });

  it("leaves a closed group closed", () => {
    expect(renameOpenRoleGroup(["display"], "body", "copy")).toEqual([
      "display",
    ]);
  });
});
