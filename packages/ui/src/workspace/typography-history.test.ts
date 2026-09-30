import { describe, expect, it } from "vitest";
import {
  addRole,
  defaultSystem,
  removeRole,
  updateRoleValue,
  type TypeSystem,
} from "../typography/system";
import {
  TYPOGRAPHY_HISTORY_LIMIT,
  createTypographyHistory,
} from "./typography-history";

const start = () => defaultSystem("Test", ["Inter"], 16, 1.25, 9);

/** The system with its body role's line height stepped to `value`. */
const withLineHeight = (system: TypeSystem, value: number): TypeSystem =>
  updateRoleValue(system, "body", {
    lineHeight: { mode: "ratio", value },
  });

const roleIds = (system: TypeSystem) => system.roles.map((role) => role.id);

describe("createTypographyHistory", () => {
  it("records an added role as one step and puts the role back out", () => {
    const history = createTypographyHistory(start());
    const before = history.present;
    const group = before.groups.find((each) => each.id === "body")!;

    history.commit(addRole(history.present, group));
    expect(roleIds(history.present).length).toBeGreaterThan(
      roleIds(before).length,
    );
    expect(history.canUndo).toBe(true);

    const undone = history.undo();
    expect(undone).toBe(before);
    expect(roleIds(history.present)).toEqual(roleIds(before));
    expect(history.canRedo).toBe(true);
  });

  it("brings a removed role back, and takes it away again on redo", () => {
    const history = createTypographyHistory(start());
    const before = history.present;
    const victim = before.roles.at(-1)!.id;

    const removed = history.commit(removeRole(before, victim));
    expect(roleIds(removed)).not.toContain(victim);

    expect(roleIds(history.undo()!)).toContain(victim);
    expect(roleIds(history.redo()!)).not.toContain(victim);
    expect(history.canRedo).toBe(false);
  });

  it("leaves the system it was given exactly as it was", () => {
    /* A step is held by reference, which is only sound if an edit never
       writes into the system it starts from. */
    const original = start();
    const snapshot = JSON.stringify(original);
    const history = createTypographyHistory(original);
    const group = original.groups.find((each) => each.id === "body")!;

    history.commit(addRole(history.present, group));
    history.commit(withLineHeight(history.present, 1.7));
    history.commit(removeRole(history.present, "body"));
    history.undo();
    history.undo();
    history.undo();

    expect(JSON.stringify(original)).toBe(snapshot);
    expect(history.present).toBe(original);
  });

  it("coalesces writes that share a key into one step", () => {
    const history = createTypographyHistory(start());
    const before = history.present;
    const key = "role:lineHeight:body";

    for (const value of [1.3, 1.4, 1.5, 1.6]) {
      history.commit(withLineHeight(history.present, value), { key });
    }
    expect(history.size).toBe(1);

    /* One undo takes back the whole drag. */
    expect(history.undo()).toBe(before);
    expect(history.canUndo).toBe(false);
  });

  it("keeps writes with different keys, or no key, as their own steps", () => {
    const history = createTypographyHistory(start());

    history.commit(withLineHeight(history.present, 1.3), { key: "a" });
    history.commit(withLineHeight(history.present, 1.4), { key: "b" });
    history.commit(withLineHeight(history.present, 1.5));
    history.commit(withLineHeight(history.present, 1.6));
    expect(history.size).toBe(4);
  });

  it("starts a new step for the first write after an undo", () => {
    const history = createTypographyHistory(start());
    const key = "role:lineHeight:body";

    history.commit(withLineHeight(history.present, 1.3), { key });
    history.commit(withLineHeight(history.present, 1.4), { key });
    history.undo();
    history.redo();
    /* Same key, but the edit was closed by the undo: this is a new one. */
    history.commit(withLineHeight(history.present, 1.5), { key });
    expect(history.size).toBe(2);
  });

  it("drops the redo branch when a new edit is made", () => {
    const history = createTypographyHistory(start());
    history.commit(withLineHeight(history.present, 1.3));
    history.commit(withLineHeight(history.present, 1.4));
    history.undo();
    expect(history.canRedo).toBe(true);

    history.commit(withLineHeight(history.present, 1.9));
    expect(history.canRedo).toBe(false);
    expect(history.redo()).toBeNull();
  });

  it("does not record an edit that changed nothing", () => {
    const history = createTypographyHistory(start());
    history.commit(history.present);
    expect(history.canUndo).toBe(false);
    expect(history.size).toBe(0);
  });

  it("holds at most its limit, dropping the oldest", () => {
    expect(TYPOGRAPHY_HISTORY_LIMIT).toBe(50);
    const history = createTypographyHistory(start(), 3);
    const first = history.present;

    for (let index = 1; index <= 5; index += 1) {
      history.commit(withLineHeight(history.present, 1 + index / 10));
    }
    expect(history.size).toBe(3);

    let last: TypeSystem | null = null;
    while (history.canUndo) last = history.undo();
    /* Five edits, three kept: the start is gone, not undoable back to. */
    expect(last).not.toBe(first);
  });

  it("adopts a system from outside without a step, keeping the past", () => {
    const history = createTypographyHistory(start());
    history.commit(withLineHeight(history.present, 1.3));
    expect(history.size).toBe(1);

    const outside = withLineHeight(start(), 2);
    history.sync(outside);
    expect(history.present).toBe(outside);
    /* Not a step of its own, and the session's own step is still there. */
    expect(history.size).toBe(1);
  });

  it("returns null when there is nothing to undo or redo", () => {
    const history = createTypographyHistory(start());
    expect(history.undo()).toBeNull();
    expect(history.redo()).toBeNull();
  });
});
