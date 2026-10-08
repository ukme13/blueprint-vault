/**
 * Which undo a key press asks for, if any.
 *
 * `Ctrl` or `Cmd` with Z undoes, with Shift redoes; `Ctrl` or `Cmd` with Y
 * redoes. A key is Z by its physical position as well as by what it types:
 * under a Thai or any other non-Latin layout the Z key types a different
 * letter, and `event.key` says so, but `event.code` is still `KeyZ`. Matching
 * only the typed letter left those keyboards with no undo at all.
 *
 * Alt is left out: `Ctrl+Alt` is how some layouts type AltGr, and a letter
 * typed with it is text and not a shortcut.
 */
export interface UndoKeyEvent {
  key: string;
  code: string;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  altKey?: boolean;
}

export function undoShortcut(event: UndoKeyEvent): "undo" | "redo" | null {
  if (!(event.ctrlKey || event.metaKey) || event.altKey) return null;
  const typed = event.key.toLowerCase();
  if (typed === "z" || event.code === "KeyZ") {
    return event.shiftKey ? "redo" : "undo";
  }
  if (typed === "y" || event.code === "KeyY") return "redo";
  return null;
}
