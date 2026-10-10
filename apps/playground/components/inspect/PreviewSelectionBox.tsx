"use client";

import { useLayoutEffect, useState, type RefObject } from "react";
import styles from "./selection-box.module.css";

interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Whether two sets of boxes are one: to a hundredth of a pixel. */
function sameBoxes(a: readonly Box[], b: readonly Box[]): boolean {
  return (
    a.length === b.length &&
    a.every((box, index) => {
      const other = b[index]!;
      return (
        Math.abs(box.left - other.left) < 0.01 &&
        Math.abs(box.top - other.top) < 0.01 &&
        Math.abs(box.width - other.width) < 0.01 &&
        Math.abs(box.height - other.height) < 0.01
      );
    })
  );
}

/**
 * The selected element's outline, with a handle at each corner and its size.
 * A group of cards has one outline for each card.
 *
 * Boxes over the page, in the page's own scrolling content, so each moves with
 * its element as the page scrolls and no overflow on an ancestor can clip it.
 * The page is a scroller, so a position is the element's rectangle less the
 * page's, plus how far the page has scrolled.
 *
 * Measured on every frame, not on an event. Whatever an element's size or
 * place turns on, a different size of type, a line of copy that wraps, a font
 * that has just loaded, a neighbour that grew and pushed it along, a colour
 * that eases while its padding changes, a sticky nav that holds its place as
 * the page scrolls, can be missed by a watcher of one kind: a ResizeObserver
 * is told nothing of an inline text, nor of an element that only moved. The
 * elements are looked up again each frame too, so one that React has drawn
 * anew is followed and not the one it replaced. A frame in which nothing
 * moved sets nothing, so a still page costs a few rectangle reads.
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
    const selector = isBand
      ? `[data-preview-section="${id}"]`
      : `[data-preview-slot="${id}"]`;
    let last: Box[] = [];

    const measure = () => {
      const site = canvasRef.current;
      const targets = site
        ? [...site.querySelectorAll<HTMLElement>(selector)]
        : [];
      const outer = site?.getBoundingClientRect();
      const next = targets.map((target): Box => {
        const inner = target.getBoundingClientRect();
        return {
          left: inner.left - outer!.left + site!.scrollLeft,
          top: inner.top - outer!.top + site!.scrollTop,
          width: inner.width,
          height: inner.height,
        };
      });
      if (!sameBoxes(last, next)) {
        last = next;
        setBoxes(next);
      }
    };

    measure();
    let frame = requestAnimationFrame(function tick() {
      measure();
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
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
