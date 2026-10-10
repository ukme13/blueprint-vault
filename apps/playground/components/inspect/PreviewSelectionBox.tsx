"use client";

import { useLayoutEffect, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import styles from "./selection-box.module.css";

interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
  /**
   * What the box is drawn inside, when its element sticks: the sticky element
   * itself. Inside it the box is carried by the same scroll that carries what
   * it outlines, and so cannot fall behind it.
   */
  host: HTMLElement | null;
}

/** The nearest element, itself included, that holds its place as the page scrolls. */
function stickyHost(
  target: HTMLElement,
  site: HTMLElement,
): HTMLElement | null {
  for (
    let node: HTMLElement | null = target;
    node && node !== site;
    node = node.parentElement
  ) {
    const { position } = getComputedStyle(node);
    if (position === "sticky" || position === "fixed") return node;
  }
  return null;
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
        Math.abs(box.height - other.height) < 0.01 &&
        box.host === other.host
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
 * A sticky element, the nav, and what is in it, hold their place while the
 * page scrolls, and a box that script moves is always a frame behind: the page
 * scrolls on its own thread and the script hears of it afterwards. So their
 * boxes are drawn inside the sticky element, where the same scroll carries
 * them, and are placed there once. Every other box is under the nav, as what
 * it outlines is when the page has scrolled it away beneath.
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
        const host = stickyHost(target, site!);
        if (host) {
          /* Where it sits in the sticky element, which does not change as the
             page scrolls: inside the host's border. */
          const from = host.getBoundingClientRect();
          return {
            left: inner.left - from.left - host.clientLeft,
            top: inner.top - from.top - host.clientTop,
            width: inner.width,
            height: inner.height,
            host,
          };
        }
        return {
          left: inner.left - outer!.left + site!.scrollLeft,
          top: inner.top - outer!.top + site!.scrollTop,
          width: inner.width,
          height: inner.height,
          host: null,
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
      {boxes.map((box, index) => {
        const { host, ...place } = box;
        const outline = (
          <span
            key={index}
            aria-hidden="true"
            className={host ? `${styles.box} ${styles.hosted}` : styles.box}
            data-testid="preview-selection"
            style={place}
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
        return host ? createPortal(outline, host, String(index)) : outline;
      })}
    </>
  );
}
