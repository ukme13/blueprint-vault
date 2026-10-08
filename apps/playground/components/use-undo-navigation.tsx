"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@astryxdesign/core/Button";
import { useToast } from "@astryxdesign/core/Toast";
import {
  stepMessage,
  undoDestination,
  type WorkspaceStore,
} from "@blueprint/ui";
import { readStudioViewMemory } from "./studio-view-memory";
import { pushStudioUrl } from "./use-url-state";

/**
 * After an undo or a redo, goes to where the edit was made.
 *
 * So what was reverted is on screen when it happens: an edit made in
 * Typography, undone from Spacing, takes the person back to Typography, as
 * Figma moves to what an undo changed. Keyed on the store's `revision`, which
 * counts every undo and redo however it was asked for (the shortcut, a button,
 * the semantic table's own keys), and not on the shortcut, so there is one
 * place that does it. Not on Home, which has no studio to take anyone to.
 *
 * A view of the studio already open (the Colour studio's Semantics tab, from
 * its shade generator) is reached by pushing the address and telling the
 * studio, as a tab click does, since the router would change the address and
 * leave the tab where it was. And a line says what was undone and where, so a
 * change of screen is never unexplained, with the one button that takes it back:
 * Redo on an undo, Undo on a redo.
 */
export function useUndoNavigation(
  store: Pick<WorkspaceStore, "revision" | "lastStep" | "undo" | "redo">,
  pathname: string,
  isHome: boolean,
): void {
  const router = useRouter();
  const toast = useToast();
  const seen = useRef(store.revision);

  useEffect(() => {
    if (store.revision === seen.current) return;
    seen.current = store.revision;
    if (isHome) return;
    const step = store.lastStep;
    if (!step) return;
    /* The step's opposite, so a slip is a click away. It closes the line it
       is on; the step it takes brings its own, which replaces any left. */
    const reverse = step.direction === "undo" ? store.redo : store.undo;
    let dismiss = () => {};
    dismiss = toast({
      body: stepMessage(step),
      type: "info",
      uniqueID: "workspace-undo",
      autoHideDuration: 5000,
      endContent: (
        <Button
          label={step.direction === "undo" ? "Redo" : "Undo"}
          size="sm"
          variant="secondary"
          onClick={() => {
            dismiss();
            reverse();
          }}
        />
      ),
    });
    const destination = undoDestination(
      step.origin,
      { pathname, search: window.location.search.replace(/^\?/, "") },
      readStudioViewMemory(),
    );
    if (!destination) return;
    const samePage =
      destination.split("?")[0] === pathname.replace(/(.)\/$/, "$1");
    if (samePage) pushStudioUrl(destination);
    else router.push(destination);
  }, [
    store.revision,
    store.lastStep,
    store.undo,
    store.redo,
    pathname,
    isHome,
    router,
    toast,
  ]);
}
