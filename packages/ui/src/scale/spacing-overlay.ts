import {
  resolveSpacing,
  type SpacingScale,
  type SpacingToken,
} from "./spacing";

/**
 * The geometry of a spacing overlay: where a page's paddings and gaps are,
 * as rectangles to hatch, worked out from boxes the caller has measured.
 *
 * Pure, so it can be tested without a browser. The caller reads the DOM
 * (an element's box, its padding, its gap and its children's boxes) and
 * hands the numbers here; this says which bands of space they make.
 */

export interface OverlayRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface OverlayPadding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** A band of space and which way it runs: across a page, or down it. */
export interface SpacingBand extends OverlayRect {
  /** The space's size, in px: the band's thickness. */
  px: number;
  axis: "block" | "inline";
}

/**
 * An element's padding as bands: one per side that has any, each as thick
 * as its padding and inside the element's border box.
 */
export function paddingBands(
  box: OverlayRect,
  padding: OverlayPadding,
): SpacingBand[] {
  const bands: SpacingBand[] = [];
  const { x, y, width, height } = box;
  if (padding.top > 0) {
    bands.push({
      x,
      y,
      width,
      height: padding.top,
      px: padding.top,
      axis: "block",
    });
  }
  if (padding.bottom > 0) {
    bands.push({
      x,
      y: y + height - padding.bottom,
      width,
      height: padding.bottom,
      px: padding.bottom,
      axis: "block",
    });
  }
  if (padding.left > 0) {
    bands.push({
      x,
      y,
      width: padding.left,
      height,
      px: padding.left,
      axis: "inline",
    });
  }
  if (padding.right > 0) {
    bands.push({
      x: x + width - padding.right,
      y,
      width: padding.right,
      height,
      px: padding.right,
      axis: "inline",
    });
  }
  return bands;
}

/* A measured space counts as the gap when it is the gap's size, give or
   take the rounding of a fractional layout. */
const GAP_SLACK = 1;

/**
 * The gaps a flex or grid container leaves between its children, as bands.
 *
 * Consecutive children are compared in document order. Side by side, the
 * space between them is a column gap, a band running down between them.
 * One below the other, or a new row starting, it is a row gap, a band across
 * the container's content box. A space that is not the declared gap (a
 * margin, an item pushed along by justify-content) is not drawn: it is not
 * what the gap token sizes.
 */
export function gapBands(
  content: OverlayRect,
  children: readonly OverlayRect[],
  rowGap: number,
  columnGap: number,
): SpacingBand[] {
  const bands: SpacingBand[] = [];
  for (let index = 1; index < children.length; index += 1) {
    const before = children[index - 1]!;
    const after = children[index]!;
    const across = after.y - (before.y + before.height);
    const along = after.x - (before.x + before.width);
    if (rowGap > 0 && Math.abs(across - rowGap) <= GAP_SLACK) {
      bands.push({
        x: content.x,
        y: before.y + before.height,
        width: content.width,
        height: across,
        px: rowGap,
        axis: "block",
      });
    } else if (columnGap > 0 && Math.abs(along - columnGap) <= GAP_SLACK) {
      const top = Math.min(before.y, after.y);
      const bottom = Math.max(before.y + before.height, after.y + after.height);
      bands.push({
        x: before.x + before.width,
        y: top,
        width: along,
        height: bottom - top,
        px: columnGap,
        axis: "inline",
      });
    }
  }
  return bands;
}

/**
 * The spacing step a measured size lands on, or null when it lands on none:
 * a size set in px, or a step times a factor, such as a section's padding
 * at 1.25 of its gap.
 */
export function spacingTokenForPx(
  scale: SpacingScale,
  px: number,
): SpacingToken | null {
  return (
    resolveSpacing(scale).find((token) => Math.abs(token.px - px) < 0.5) ?? null
  );
}
