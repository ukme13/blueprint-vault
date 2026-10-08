"use client";

import { useEffect } from "react";
import { undoShortcut } from "@blueprint/ui";

/** What a shortcut leaves to its own owner: text, choices and dialogs. */
const OWN_UNDO =
  "input, textarea, select, [contenteditable], [role='combobox'], [role='dialog'], dialog";

/**
 * Ctrl or Cmd+Z undoes, with Shift (or Ctrl+Y) redoes, while the studio is on
 * screen. The Z key is found by its position as well as its letter, so it
 * works under a Thai layout, where it types another character.
 *
 * On the window, not on the studio's root element. After Remove or Delete the
 * button that had focus is gone and focus falls to the body, outside every
 * element of the studio, and a person who has just removed something is
 * exactly who reaches for undo. A text field keeps its own undo, which is per
 * keystroke and the native one, and a dialog or sheet over the studio is not
 * the studio's to undo.
 */
export function useUndoShortcut(undo: () => void, redo: () => void): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const action = undoShortcut(event);
      if (!action) return;
      if (event.defaultPrevented) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest?.(OWN_UNDO)) return;
      event.preventDefault();
      if (action === "redo") redo();
      else undo();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [undo, redo]);
}
