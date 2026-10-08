"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { undoDestination, type WorkspaceStore } from "@blueprint/ui";
import { readStudioViewMemory } from "./studio-view-memory";

/**
 * After an undo or a redo, goes to where the edit was made.
 *
 * So what was reverted is on screen when it happens: an edit made in
 * Typography, undone from Spacing, takes the person back to Typography, as
 * Figma moves to what an undo changed. Keyed on the store's `revision`, which
 * counts every undo and redo however it was asked for (the shortcut, a button,
 * the semantic table's own keys), and not on the shortcut, so there is one
 * place that does it. Not on Home, which has no studio to take anyone to.
 */
export function useUndoNavigation(
  store: Pick<WorkspaceStore, "revision" | "undoOrigin">,
  pathname: string,
  isHome: boolean,
): void {
  const router = useRouter();
  const seen = useRef(store.revision);

  useEffect(() => {
    if (store.revision === seen.current) return;
    seen.current = store.revision;
    if (isHome) return;
    const destination = undoDestination(
      store.undoOrigin,
      { pathname, search: window.location.search.replace(/^\?/, "") },
      readStudioViewMemory(),
    );
    if (destination) router.push(destination);
  }, [store.revision, store.undoOrigin, pathname, isHome, router]);
}
