"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@astryxdesign/core/Button";
import { useToast, type ShowToastFn } from "@astryxdesign/core/Toast";
import {
  stepMessage,
  undoMove,
  type WorkspaceStep,
  type WorkspaceStore,
} from "@blueprint/ui";
import { readStudioViewMemory } from "./studio-view-memory";
import { pushStudioUrl } from "./use-url-state";

/**
 * One line for the step just taken: what was done and where, with the button
 * that takes it back. Redo on an undo, Undo on a redo.
 *
 * The button closes the line it is on; the step it takes shows its own, which
 * replaces any left behind, since both share an id.
 */
function announceStep(
  toast: ShowToastFn,
  step: WorkspaceStep,
  reverse: () => void,
): void {
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
}

/**
 * After an undo or a redo, says what was undone and goes to where the edit was
 * made.
 *
 * So what was reverted is on screen when it happens: an edit made in
 * Typography, undone from Spacing, takes the person back to Typography, as
 * Figma moves to what an undo changed, and the line says why the screen
 * changed. Keyed on the store's `revision`, which counts every undo and redo
 * however it was asked for (the shortcut, a button, the semantic table's own
 * keys), and not on the shortcut, so there is one place that does it. Not on
 * Home, which has no studio to take anyone to.
 *
 * Another view of the studio already open is reached by pushing the address
 * and telling the studio, as a tab click does; the router would change the
 * address and leave the tab where it was.
 */
export function useUndoNavigation(
  store: Pick<WorkspaceStore, "revision" | "lastStep" | "undo" | "redo">,
  pathname: string,
  isHome: boolean,
): void {
  const router = useRouter();
  const toast = useToast();
  const seen = useRef(store.revision);
  const { revision, lastStep, undo, redo } = store;

  useEffect(() => {
    if (revision === seen.current) return;
    seen.current = revision;
    if (isHome || !lastStep) return;

    announceStep(toast, lastStep, lastStep.direction === "undo" ? redo : undo);

    const move = undoMove(
      lastStep.origin,
      { pathname, search: window.location.search.replace(/^\?/, "") },
      readStudioViewMemory(),
    );
    if (!move) return;
    if (move.withinPage) pushStudioUrl(move.href);
    else router.push(move.href);
  }, [revision, lastStep, undo, redo, pathname, isHome, router, toast]);
}
