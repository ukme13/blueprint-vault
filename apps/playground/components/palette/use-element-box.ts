"use client";

import { useLayoutEffect, useState, type RefObject } from "react";

/** Where an element sits inside its container, in the container's pixels. */
export interface ElementBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * The box of the element a selector finds inside a container, kept current.
 *
 * What a selection outline is drawn from: one overlay in the container, placed
 * over whichever element is selected, rather than an outline on each element
 * that a parent's overflow could clip. Re-measured when either box resizes,
 * which is what a window resize or a wrapped line does to it.
 */
export function useElementBox(
  container: RefObject<HTMLElement | null>,
  selector: string | null,
): ElementBox | null {
  const [box, setBox] = useState<ElementBox | null>(null);

  useLayoutEffect(() => {
    const root = container.current;
    const element = selector ? root?.querySelector(selector) : null;
    if (!root || !element) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBox(null);
      return;
    }
    const measure = () => {
      const outer = root.getBoundingClientRect();
      const inner = element.getBoundingClientRect();
      setBox({
        left: inner.left - outer.left,
        top: inner.top - outer.top,
        width: inner.width,
        height: inner.height,
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    observer.observe(element);
    return () => observer.disconnect();
  }, [container, selector]);

  return box;
}
