import { describe, expect, it } from "vitest";
import { elementForRole, ROLE_ELEMENTS } from "./roles";
import { SEMANTIC_ROLES } from "./types";

describe("ROLE_ELEMENTS", () => {
  it("maps every semantic role", () => {
    SEMANTIC_ROLES.forEach((role) => {
      expect(elementForRole(role)).toBeTruthy();
    });
  });

  it("uses exactly one h1, so a preview has a single page title", () => {
    const h1s = SEMANTIC_ROLES.filter((role) => ROLE_ELEMENTS[role] === "h1");
    expect(h1s).toEqual(["display"]);
  });

  it("keeps headings in descending order without skipping a level", () => {
    expect([
      ROLE_ELEMENTS.display,
      ROLE_ELEMENTS.heading,
      ROLE_ELEMENTS.title,
    ]).toEqual(["h1", "h2", "h3"]);
  });

  it("renders body copy as a paragraph, not a heading", () => {
    expect(ROLE_ELEMENTS.body).toBe("p");
  });
});
