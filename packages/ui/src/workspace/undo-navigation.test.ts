import { describe, expect, it } from "vitest";
import { stepMessage, undoMove, type WorkspaceStep } from "./undo-navigation";

const at = (pathname: string, search = "") => ({ pathname, search });

describe("undoMove", () => {
  it("stays when there is no origin", () => {
    expect(undoMove(null, at("/spacing"), {})).toBeNull();
  });

  it("stays in the studio the edit was made in", () => {
    expect(undoMove({ path: "/typography" }, at("/typography"), {})).toBeNull();
    expect(
      undoMove({ path: "/typography" }, at("/typography/"), {}),
    ).toBeNull();
    /* Whichever view of it, when the origin names none. */
    expect(
      undoMove({ path: "/typography" }, at("/typography", "view=specimen"), {}),
    ).toBeNull();
  });

  it("goes to the studio the edit was made in, by the router", () => {
    expect(undoMove({ path: "/typography" }, at("/spacing"), {})).toEqual({
      href: "/typography",
      withinPage: false,
    });
    expect(undoMove({ path: "/radius" }, at("/overview"), {})).toEqual({
      href: "/radius",
      withinPage: false,
    });
  });

  it("opens the studio on the view it was last left on", () => {
    expect(
      undoMove({ path: "/typography" }, at("/spacing"), {
        "/typography": "view=specimen",
      }),
    ).toEqual({ href: "/typography?view=specimen", withinPage: false });
  });

  it("goes to the view an origin names, over the remembered one", () => {
    const origin = { path: "/colour", query: "view=semantics" };
    expect(
      undoMove(origin, at("/typography"), { "/colour": "view=accessibility" }),
    ).toEqual({ href: "/colour?view=semantics", withinPage: false });
    /* Already on it. */
    expect(
      undoMove(origin, at("/colour", "view=semantics&group=fg"), {}),
    ).toBeNull();
  });

  it("marks a move to another view of the open studio as within the page", () => {
    const origin = { path: "/colour", query: "view=semantics" };
    expect(undoMove(origin, at("/colour", "view=accessibility"), {})).toEqual({
      href: "/colour?view=semantics",
      withinPage: true,
    });
    expect(undoMove(origin, at("/colour/"), {})).toEqual({
      href: "/colour?view=semantics",
      withinPage: true,
    });
  });
});

describe("stepMessage", () => {
  const step = (
    direction: "undo" | "redo",
    origin: WorkspaceStep["origin"],
  ): WorkspaceStep => ({ direction, origin, targets: [], at: 0 });

  it("says what was done and where", () => {
    expect(
      stepMessage(step("undo", { path: "/colour", query: "view=semantics" })),
    ).toBe("Undid edit in Semantics");
    expect(stepMessage(step("redo", { path: "/typography" }))).toBe(
      "Redid edit in Typography",
    );
    expect(stepMessage(step("undo", { path: "/preview" }))).toBe(
      "Undid edit in Preview",
    );
  });

  it("names the studio for the Colour studio's other tabs", () => {
    expect(stepMessage(step("undo", { path: "/colour" }))).toBe(
      "Undid edit in Colour",
    );
  });

  it("says only what was done when it is not known where", () => {
    expect(stepMessage(step("undo", null))).toBe("Undid the last edit");
    expect(stepMessage(step("redo", { path: "/elsewhere" }))).toBe(
      "Redid the last edit",
    );
  });
});
