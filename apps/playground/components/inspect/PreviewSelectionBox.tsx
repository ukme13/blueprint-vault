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
 * A group of cards has one outline for each card.
 *
 * Boxes over the page, in the page's own scrolling content, so each moves with
 * its element as the page scrolls and no overflow on an ancestor can clip it.
 * The page is a scroller, so a position is the element's rectangle less the
 * page's, plus how far the page has scrolled. Measured again when the page or
 * an element changes size, which is what a new padding or a new line of copy
 * does, and when the page scrolls, since a sticky element, the nav, does not
 * move with the content and its place in it changes.
 *
 * Sizes are watched as border boxes. The default is the content box, and a
 * padding added to a button of automatic width grows its border box and leaves
 * its content box alone, so an outline watching the content never heard of it.
 *
 * Laid over the page and passing clicks through, as the spacing overlay is,
 * and above the sticky nav, which would otherwise draw over its own outline.
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
  const [boxes, setBoxes] = useState<Box[]>([]);

  useLayoutEffect(() => {
    const site = canvasRef.current;
    const targets = site
      ? [
          ...site.querySelectorAll<HTMLElement>(
            isBand
              ? `[data-preview-section="${id}"]`
              : `[data-preview-slot="${id}"]`,
          ),
        ]
      : [];
    if (!site || targets.length === 0) {
      setBoxes([]);
      return;
    }
    const measure = () => {
      const outer = site.getBoundingClientRect();
      setBoxes(
        targets.map((target) => {
          const inner = target.getBoundingClientRect();
          return {
            left: inner.left - outer.left + site.scrollLeft,
            top: inner.top - outer.top + site.scrollTop,
            width: inner.width,
            height: inner.height,
          };
        }),
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(site);
    for (const target of targets) {
      observer.observe(target, { box: "border-box" });
    }
    site.addEventListener("scroll", measure, { passive: true });
    return () => {
      observer.disconnect();
      site.removeEventListener("scroll", measure);
    };
  }, [canvasRef, id, isBand]);

  return (
    <>
      {boxes.map((box, index) => (
        <span
          key={index}
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
      ))}
    </>
  );
}
