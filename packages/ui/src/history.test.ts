import { describe, expect, it } from "vitest";
import { createHistory } from "./history";

describe("createHistory", () => {
  const counting = (initial = "a") =>
    createHistory<string>({ limit: 5, initial });

  it("goes back and forward through what was pushed", () => {
    const history = counting();
    history.push("b");
    history.push("c");

    expect(history.present).toBe("c");
    expect(history.canUndo).toBe(true);
    expect(history.canRedo).toBe(false);

    expect(history.undo()).toBe("b");
    expect(history.undo()).toBe("a");
    expect(history.canUndo).toBe(false);
    expect(history.undo()).toBeNull();

    expect(history.redo()).toBe("b");
    expect(history.redo()).toBe("c");
    expect(history.canRedo).toBe(false);
    expect(history.redo()).toBeNull();
  });

  it("discards the redo branch on the next push", () => {
    /* What every editor does, and the reason: once somebody has undone three
       steps and then typed, the three they undid are a path they chose not to
       take. A redo that survived would jump sideways into a version of the
       document that never existed. */
    const history = counting();
    history.push("b");
    history.push("c");
    history.undo();
    history.undo();

    expect(history.canRedo).toBe(true);
    history.push("d");

    expect(history.canRedo).toBe(false);
    expect(history.redoSize).toBe(0);
    expect(history.undo()).toBe("a");
  });

  it("discards it on a coalesced write too", () => {
    /* Typing into a cell after undoing is still a new edit. That it coalesces
       with the keystroke before it does not make it part of the path that was
       undone. */
    const history = counting();
    history.push("b");
    history.undo();
    expect(history.canRedo).toBe(true);

    history.replaceTop("z");
    expect(history.canRedo).toBe(false);
  });

  it("replaces the top rather than adding a step", () => {
    /* One undo takes back the whole edit, not one letter of it. */
    const history = counting("");
    history.push("s");
    for (const draft of ["su", "sur", "surf", "surface"]) {
      history.replaceTop(draft);
    }

    expect(history.present).toBe("surface");
    expect(history.size).toBe(1);
    expect(history.undo()).toBe("");
  });

  it("pushes when there is nothing to replace", () => {
    /* So a caller does not have to know whether this is the first write of an
       edit. */
    const history = createHistory<string>({ limit: 5 });
    expect(history.replaceTop("first")).toBe("first");
    expect(history.present).toBe("first");
    expect(history.canUndo).toBe(false);
  });

  it("adopts an outside value without making it undoable", () => {
    /* Another tab writing the same document, or an import replacing it. Undo
       means "take back what I did", and undoing somebody else's write would
       throw their work away with nothing to distinguish it from an ordinary
       undo. */
    const history = counting();
    history.push("b");

    history.sync("from another tab");

    expect(history.present).toBe("from another tab");
    expect(history.size).toBe(1);
    /* And the step this session took is still its own to undo. */
    expect(history.undo()).toBe("a");
  });

  it("keeps at most `limit` steps, however many writes arrive", () => {
    /* The guard. Each step is a whole slice, so a history that held everything
       and only reported the last N would be a memory leak with a reassuring
       number on it — which is why this reads the array rather than the
       counter. */
    const limit = 8;
    const history = createHistory<number>({ limit, initial: 0 });

    for (let at = 1; at <= limit * 10; at += 1) history.push(at);

    expect(history.entries()).toHaveLength(limit);
    expect(history.size).toBe(limit);
    /* The oldest went, not the newest: the steps kept are the ones nearest to
       now, which are the ones anybody wants back. */
    expect(history.entries()[0]).toBe(limit * 10 - limit);
    expect(history.entries().at(-1)).toBe(limit * 10 - 1);
    expect(history.present).toBe(limit * 10);
  });

  it("still records a step when asked for a nonsense limit", () => {
    /* Zero would be a history that records nothing and reports itself as
       working, which is worse than one step. */
    const history = createHistory<string>({ limit: 0, initial: "a" });
    history.push("b");
    expect(history.undo()).toBe("a");
  });

  it("hands out a copy of the past, not the past itself", () => {
    const history = counting();
    history.push("b");

    history.entries().push("forged");

    expect(history.size).toBe(1);
    expect(history.undo()).toBe("a");
  });

  it("forgets everything but the present when cleared", () => {
    const history = counting();
    history.push("b");
    history.undo();

    history.clear();

    expect(history.canUndo).toBe(false);
    expect(history.canRedo).toBe(false);
    expect(history.present).toBe("a");
  });
});
