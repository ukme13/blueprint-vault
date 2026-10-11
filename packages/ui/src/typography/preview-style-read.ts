import {
  PreviewStrokePosition,
  PREVIEW_STROKE_POSITIONS,
  PREVIEW_STROKE_WEIGHTS,
  PreviewEdgeSide,
  PREVIEW_EDGE_SIDES,
  PreviewStroke,
  PREVIEW_PADDING_SIDES,
  PreviewPaddingSide,
  PREVIEW_RADIUS_CORNERS,
  PreviewRadiusCorner,
  PreviewSlotStyle,
  PreviewStyles,
  PREVIEW_BUTTON_VARIANTS,
  PreviewButtonVariant,
} from "./preview-style-model";

/* ---- reading ---- */

function isStep(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function readStroke(value: unknown): PreviewStroke | undefined {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as Record<string, unknown>;
  if (!isId(raw.tokenId)) return undefined;
  const position = PREVIEW_STROKE_POSITIONS.includes(
    raw.position as PreviewStrokePosition,
  )
    ? (raw.position as PreviewStrokePosition)
    : "inside";
  const weight = (PREVIEW_STROKE_WEIGHTS as readonly number[]).includes(
    raw.weight as number,
  )
    ? (raw.weight as number)
    : 1;
  const side = PREVIEW_EDGE_SIDES.includes(raw.side as PreviewEdgeSide)
    ? (raw.side as PreviewEdgeSide)
    : undefined;
  return side
    ? { tokenId: raw.tokenId, position, weight, side }
    : { tokenId: raw.tokenId, position, weight };
}

/** One element's stored style, or null when nothing in it can be read. */
export function readSlotStyle(value: unknown): PreviewSlotStyle | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const style: PreviewSlotStyle = {};

  if (isStep(raw.gap)) style.gap = raw.gap;

  if (raw.padding && typeof raw.padding === "object") {
    const padding: Partial<Record<PreviewPaddingSide, number>> = {};
    for (const side of PREVIEW_PADDING_SIDES) {
      const step = (raw.padding as Record<string, unknown>)[side];
      if (isStep(step)) padding[side] = step;
    }
    if (Object.keys(padding).length > 0) style.padding = padding;
  }

  if (typeof raw.opacity === "number" && Number.isFinite(raw.opacity)) {
    style.opacity = Math.min(100, Math.max(0, Math.round(raw.opacity)));
  }

  if (raw.radius && typeof raw.radius === "object") {
    const radius: Partial<Record<PreviewRadiusCorner, string>> = {};
    for (const corner of PREVIEW_RADIUS_CORNERS) {
      const id = (raw.radius as Record<string, unknown>)[corner];
      if (isId(id)) radius[corner] = id;
    }
    if (Object.keys(radius).length > 0) style.radius = radius;
  }

  if (isId(raw.fill)) style.fill = raw.fill;
  if (isId(raw.labelColor)) style.labelColor = raw.labelColor;
  if (raw.stroke === null) style.stroke = null;
  else {
    const stroke = readStroke(raw.stroke);
    if (stroke) style.stroke = stroke;
  }
  if (raw.shadow === null) style.shadow = null;
  else if (isId(raw.shadow)) style.shadow = raw.shadow;
  if (PREVIEW_BUTTON_VARIANTS.includes(raw.variant as PreviewButtonVariant)) {
    style.variant = raw.variant as PreviewButtonVariant;
  }
  /* Only a closed eye is kept: an open one is what absent already says. */
  if (raw.isStrokeHidden === true) style.isStrokeHidden = true;
  if (raw.isShadowHidden === true) style.isShadowHidden = true;

  return Object.keys(style).length > 0 ? style : null;
}

/**
 * A stored map, or none. Anything unreadable about an element drops that
 * element's override rather than the file: the page draws what it always did.
 */
export function readPreviewStyles(value: unknown): PreviewStyles {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const styles: PreviewStyles = {};
  for (const [id, raw] of Object.entries(value)) {
    const style = readSlotStyle(raw);
    if (style) styles[id] = style;
  }
  return styles;
}
