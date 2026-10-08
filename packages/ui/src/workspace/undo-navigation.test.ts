import { describe, expect, it } from "vitest";
import { undoDestination } from "./undo-navigation";

const at = (pathname: string, search = "") => ({ pathname, search });

describe("undoDestination", () => {
  it("stays when there is no origin", () => {
    expect(undoDestination(null, at("/spacing"), {})).toBeNull();
  });

  it("stays in the studio the edit was made in", () => {
    expect(
      undoDestination({ path: "/typography" }, at("/typography"), {}),
    ).toBeNull();
    expect(
      undoDestination({ path: "/typography" }, at("/typography/"), {}),
    ).toBeNull();
    /* Whichever view of it, when the origin names none. */
    expect(
      undoDestination(
        { path: "/typography" },
        at("/typography", "view=specimen"),
        {},
      ),
    ).toBeNull();
  });

  it("goes to the studio the edit was made in", () => {
    expect(undoDestination({ path: "/typography" }, at("/spacing"), {})).toBe(
      "/typography",
    );
    expect(undoDestination({ path: "/radius" }, at("/overview"), {})).toBe(
      "/radius",
    );
  });

  it("opens the studio on the view it was last left on", () => {
    expect(
      undoDestination({ path: "/typography" }, at("/spacing"), {
        "/typography": "view=specimen",
      }),
    ).toBe("/typography?view=specimen");
  });

  it("goes to the view an origin names, over the remembered one", () => {
    const origin = { path: "/colour", query: "view=semantics" };
    expect(
      undoDestination(origin, at("/typography"), {
        "/colour": "view=accessibility",
      }),
    ).toBe("/colour?view=semantics");
    /* Same studio, other tab. */
    expect(
      undoDestination(origin, at("/colour", "view=accessibility"), {}),
    ).toBe("/colour?view=semantics");
    /* Already on it. */
    expect(
      undoDestination(origin, at("/colour", "view=semantics&group=fg"), {}),
    ).toBeNull();
  });
});
