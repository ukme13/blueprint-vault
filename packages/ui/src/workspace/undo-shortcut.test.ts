import { describe, expect, it } from "vitest";
import { undoShortcut, type UndoKeyEvent } from "./undo-shortcut";

const press = (over: Partial<UndoKeyEvent>): UndoKeyEvent => ({
  key: "z",
  code: "KeyZ",
  ctrlKey: true,
  metaKey: false,
  shiftKey: false,
  ...over,
});

describe("undoShortcut", () => {
  it("undoes on Ctrl+Z and Cmd+Z", () => {
    expect(undoShortcut(press({}))).toBe("undo");
    expect(undoShortcut(press({ ctrlKey: false, metaKey: true }))).toBe("undo");
  });

  it("redoes on Shift+Ctrl+Z and on Ctrl+Y", () => {
    expect(undoShortcut(press({ shiftKey: true, key: "Z" }))).toBe("redo");
    expect(undoShortcut(press({ key: "y", code: "KeyY" }))).toBe("redo");
    expect(
      undoShortcut(
        press({ key: "y", code: "KeyY", ctrlKey: false, metaKey: true }),
      ),
    ).toBe("redo");
  });

  it("finds the Z key by its position under a Thai layout", () => {
    /* The key types ผ there, so `key` is no help: `code` is. */
    expect(undoShortcut(press({ key: "ผ", code: "KeyZ" }))).toBe("undo");
    expect(
      undoShortcut(press({ key: "ผ", code: "KeyZ", shiftKey: true })),
    ).toBe("redo");
    expect(undoShortcut(press({ key: "ป", code: "KeyY" }))).toBe("redo");
  });

  it("needs Ctrl or Cmd, and leaves Alt chords to the text", () => {
    expect(undoShortcut(press({ ctrlKey: false }))).toBeNull();
    expect(undoShortcut(press({ altKey: true }))).toBeNull();
  });

  it("ignores other keys", () => {
    expect(undoShortcut(press({ key: "a", code: "KeyA" }))).toBeNull();
    expect(undoShortcut(press({ key: "ฟ", code: "KeyA" }))).toBeNull();
  });
});
