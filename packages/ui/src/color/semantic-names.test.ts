import { describe, expect, it } from "vitest";
import {
  groupOf,
  renameTokenFromCell,
  shortName,
  withGroup,
} from "./semantic-names";
import type { SemanticToken } from "./semantic";

describe("semantic table names", () => {
  it("splits a folder and its short name", () => {
    expect(groupOf("primary.main")).toBe("primary");
    expect(shortName("primary.main")).toBe("main");
  });

  it("puts a name into another folder", () => {
    expect(withGroup("primary.main", "status")).toBe("status.main");
  });

  it("keeps an ordinary typed name in its current folder", () => {
    expect(
      renameTokenFromCell(layer(), "primary.main", "brand").layer[0]?.id,
    ).toBe("primary.brand");
  });

  it("treats a dotted typed name as a folder move", () => {
    expect(
      renameTokenFromCell(layer(), "custom.new-token", "primary.x").layer[1]
        ?.id,
    ).toBe("primary.x");
  });
});

function layer(): SemanticToken[] {
  return [
    {
      id: "primary.main",
      name: "main",
      description: "",
      light: { trackId: "p", weight: 500 },
      dark: { trackId: "p", weight: 500 },
    },
    {
      id: "custom.new-token",
      name: "new-token",
      description: "",
      light: { trackId: "p", weight: 500 },
      dark: { trackId: "p", weight: 500 },
    },
  ];
}
