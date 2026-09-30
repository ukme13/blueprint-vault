"use client";

import { useLayoutEffect, type RefObject } from "react";
import {
  readScrollPosition,
  saveScrollPosition,
  scrollParent,
} from "./scroll-memory";

/** Frames to keep trying: the rows can still be settling when this mounts. */
const RESTORE_FRAMES = 20;

/**
 * Keeps the scroll position of whatever scrolls around `ref`, under `key`.
 *
 * Restored when the list mounts again, so a table left for another page, and
 * come back to, is where it was. The position is noted as it moves and saved
 * when the list goes, rather than read then: by that time the page beneath it
 * has changed height, and the container has already been pulled back to the
 * top. A layout effect, so the cleanup runs in the same commit that removes
 * the list, before the browser reports that pull as a scroll.
 */
export function useScrollMemory(
  ref: RefObject<HTMLElement | null>,
  key: string,
): void {
  useLayoutEffect(() => {
    const element = ref.current;
    const scroller = element && scrollParent(element);
    if (!scroller) return;

    let latest = scroller.scrollTop;
    const onScroll = () => {
      latest = scroller.scrollTop;
    };
    scroller.addEventListener("scroll", onScroll, { passive: true });

    const target = readScrollPosition(key);
    let frame = 0;
    if (target !== null) {
      let frames = RESTORE_FRAMES;
      const restore = () => {
        scroller.scrollTop = target;
        if (Math.abs(scroller.scrollTop - target) > 1 && frames-- > 0) {
          frame = requestAnimationFrame(restore);
        }
      };
      restore();
    }

    return () => {
      cancelAnimationFrame(frame);
      scroller.removeEventListener("scroll", onScroll);
      saveScrollPosition(key, latest);
    };
  }, [ref, key]);
}
