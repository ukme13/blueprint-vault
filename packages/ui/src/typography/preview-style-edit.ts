import { readSlotStyle } from "./preview-style-read";
import {
  PREVIEW_PADDING_SIDES,
  PreviewPaddingSide,
  PREVIEW_RADIUS_CORNERS,
  PreviewRadiusCorner,
  PreviewSlotStyle,
  PreviewStyles,
} from "./preview-style-model";

/* ---- editing ---- */

export function previewStyleOf(
  styles: PreviewStyles | undefined,
  id: string,
): PreviewSlotStyle {
  return styles?.[id] ?? {};
}

/** The map with an element's style replaced, or dropped when it is empty. */
export function setPreviewStyle(
  styles: PreviewStyles | undefined,
  id: string,
  style: PreviewSlotStyle,
): PreviewStyles {
  const rest = { ...(styles ?? {}) };
  delete rest[id];
  const kept = readSlotStyle(style);
  return kept ? { ...rest, [id]: kept } : rest;
}

/** Back to what the page draws on its own. */
export function clearPreviewStyle(
  styles: PreviewStyles | undefined,
  id: string,
): PreviewStyles {
  return setPreviewStyle(styles, id, {});
}

/**
 * Sides padding can be set for in one go: the two on an axis, or all four.
 * `x` is left and right, `y` is top and bottom.
 */
export type PreviewPaddingTarget = PreviewPaddingSide | "x" | "y" | "all";

const PADDING_SIDES_OF: Record<PreviewPaddingTarget, PreviewPaddingSide[]> = {
  top: ["top"],
  right: ["right"],
  bottom: ["bottom"],
  left: ["left"],
  x: ["left", "right"],
  y: ["top", "bottom"],
  all: [...PREVIEW_PADDING_SIDES],
};

/** A step for some sides, or none to put them back. */
export function withPadding(
  style: PreviewSlotStyle,
  target: PreviewPaddingTarget,
  step: number | undefined,
): PreviewSlotStyle {
  const padding = { ...(style.padding ?? {}) };
  for (const side of PADDING_SIDES_OF[target]) {
    if (step === undefined) delete padding[side];
    else padding[side] = step;
  }
  const rest = { ...style };
  delete rest.padding;
  return Object.keys(padding).length > 0 ? { ...rest, padding } : rest;
}

export type PreviewRadiusTarget = PreviewRadiusCorner | "all";

/** A radius token for a corner, or all four; none puts them back. */
export function withRadius(
  style: PreviewSlotStyle,
  target: PreviewRadiusTarget,
  tokenId: string | undefined,
): PreviewSlotStyle {
  const radius = { ...(style.radius ?? {}) };
  const corners = target === "all" ? [...PREVIEW_RADIUS_CORNERS] : [target];
  for (const corner of corners) {
    if (tokenId === undefined) delete radius[corner];
    else radius[corner] = tokenId;
  }
  const rest = { ...style };
  delete rest.radius;
  return Object.keys(radius).length > 0 ? { ...rest, radius } : rest;
}

/**
 * How a group of sides reads: one value for all, none, or mixed.
 *
 * What the single field of a collapsed row shows: the value when every side
 * agrees, nothing when none is set, "Mixed" when they differ.
 */
export type PreviewGroupReading<T> =
  { kind: "none" } | { kind: "same"; value: T } | { kind: "mixed" };

function readGroup<T>(values: (T | undefined)[]): PreviewGroupReading<T> {
  if (values.every((value) => value === undefined)) return { kind: "none" };
  const [first] = values;
  return first !== undefined && values.every((value) => value === first)
    ? { kind: "same", value: first }
    : { kind: "mixed" };
}

export function readPadding(
  style: PreviewSlotStyle,
  target: PreviewPaddingTarget,
): PreviewGroupReading<number> {
  return readGroup(
    PADDING_SIDES_OF[target].map((side) => style.padding?.[side]),
  );
}

export function readRadius(
  style: PreviewSlotStyle,
  target: PreviewRadiusTarget,
): PreviewGroupReading<string> {
  const corners = target === "all" ? [...PREVIEW_RADIUS_CORNERS] : [target];
  return readGroup(corners.map((corner) => style.radius?.[corner]));
}
