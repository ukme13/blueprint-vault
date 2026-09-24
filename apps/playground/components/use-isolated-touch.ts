"use client";

import { useCallback } from "react";

/**
 * A ref that keeps an element's touches to itself.
 *
 * For a 2D control that is dragged, like the colour picker's field or the
 * elevation pad, sitting in a bottom sheet. A touch that pulls down from the
 * top of the sheet's scroll is also how the sheet is swiped shut, and Astryx
 * listens for that with native listeners on the sheet, which React's
 * `stopPropagation` reaches too late. So the element stops its own touches
 * natively, before they get there.
 *
 * `touch-action: none` on the element is not enough on its own: measured with
 * real touches, one drag in three still closed the sheet.
 */
export function useIsolatedTouch<T extends HTMLElement>(isEnabled = true) {
  return useCallback(
    (node: T | null) => {
      if (!node || !isEnabled) return;
      const stop = (event: TouchEvent) => event.stopPropagation();
      node.addEventListener("touchstart", stop, { passive: true });
      node.addEventListener("touchmove", stop, { passive: true });
      return () => {
        node.removeEventListener("touchstart", stop);
        node.removeEventListener("touchmove", stop);
      };
    },
    [isEnabled],
  );
}
