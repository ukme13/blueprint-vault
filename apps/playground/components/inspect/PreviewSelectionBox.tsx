"use client";

import { useLayoutEffect, useState, type RefObject } from "react";
import styles from "./selection-box.module.css";

interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * The selected element's outline, with a handle at each corner and its size.
 *
 * One box over the page, in the page's own scrolling content, so it moves
 * with the element as the page scrolls and no overflow on an ancestor can
 * clip it. The page is a scroller, so a position is the element's rectangle
 * less the page's, plus how far the page has scrolled. Re-measured whenever
 * the page or the element changes size, which is what an override of padding
 * or a new line of copy does to it.
 *
 * Laid over the page and passing clicks through, as the spacing overlay is.
 */
export function PreviewSelectionBox({
  canvasRef,
  id,
  isBand = false,
}: {
  canvasRef: RefObject<HTMLElement | null>;
  id: string;
  /** A band shares its id with a slot in two places, so it says which. */
  isBand?: boolean;
}) {
  const [box, setBox] = useState<Box | null>(null);

  useLayoutEffect(() => {
    const site = canvasRef.current;
    const target = site?.querySelector<HTMLElement>(
      isBand ? `[data-preview-section="${id}"]` : `[data-preview-slot="${id}"]`,
    );
    if (!site || !target) {
      setBox(null);
      return;
    }
    const measure = () => {
      const outer = site.getBoundingClientRect();
      const inner = target.getBoundingClientRect();
      setBox({
        left: inner.left - outer.left + site.scrollLeft,
        top: inner.top - outer.top + site.scrollTop,
        width: inner.width,
        height: inner.height,
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(site);
    observer.observe(target);
    return () => observer.disconnect();
  }, [canvasRef, id, isBand]);

  if (!box) return null;
  return (
    <span
      aria-hidden="true"
      className={styles.box}
      data-testid="preview-selection"
      style={box}
    >
      <i />
      <i />
      <i />
      <i />
      <small>
        {Math.round(box.width)} × {Math.round(box.height)}
      </small>
    </span>
  );
}
