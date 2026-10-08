"use client";

import { useEffect } from "react";
import type { WorkspaceStore, WorkspaceTarget } from "@blueprint/ui";

/** How long after an undo a studio that opens late still points at its edit. */
const FRESH_MS = 5000;
/** The flash, matching the `undo-flash` animation in the global stylesheet. */
const FLASH_MS = 1400;
/** Frames to wait for a studio that is still rendering what was restored. */
const FRAMES_TO_WAIT = 20;

/* Per page, not per studio: a studio opened by the undo has not seen it, and
   one that was open must not flash for a step it already showed. */
let flashedRevision = 0;
const timers = new WeakMap<Element, number>();

/**
 * Flashes what the latest undo or redo changed, so the eye finds it.
 *
 * A studio says how to find a target on its screen; this finds them once the
 * studio has drawn what was restored, scrolls the first into view, and sets
 * `data-undo-highlight` on each for a moment. The look is the stylesheet's, so
 * a studio opts in by calling this with its own `find` and nothing else.
 *
 * Keyed on the store's `revision`, and on the step being recent, so a studio
 * that mounts because the undo took the person there flashes, and one opened
 * minutes later does not.
 */
export function useUndoHighlight(
  store: Pick<WorkspaceStore, "revision" | "lastStep">,
  find: (target: WorkspaceTarget) => Element | null,
): void {
  const { revision, lastStep } = store;

  useEffect(() => {
    if (revision === 0 || revision === flashedRevision) return;
    const targets = lastStep?.targets ?? [];
    if (!lastStep || targets.length === 0) return;
    if (Date.now() - lastStep.at > FRESH_MS) return;

    let frame = 0;
    let waited = 0;
    const look = () => {
      const found = targets
        .map(find)
        .filter((element): element is Element => element !== null);
      if (found.length === 0 && waited < FRAMES_TO_WAIT) {
        waited += 1;
        frame = requestAnimationFrame(look);
        return;
      }
      flashedRevision = revision;
      if (found.length === 0) return;
      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      found[0]!.scrollIntoView({
        block: "nearest",
        inline: "nearest",
        behavior: reduced ? "auto" : "smooth",
      });
      for (const element of found) flash(element);
    };
    frame = requestAnimationFrame(look);
    return () => cancelAnimationFrame(frame);
  }, [revision, lastStep, find]);
}

/** Sets the attribute afresh, so a second flash on the same element replays. */
function flash(element: Element): void {
  window.clearTimeout(timers.get(element));
  element.removeAttribute("data-undo-highlight");
  void (element as HTMLElement).offsetWidth;
  element.setAttribute("data-undo-highlight", "");
  timers.set(
    element,
    window.setTimeout(
      () => element.removeAttribute("data-undo-highlight"),
      FLASH_MS,
    ),
  );
}
