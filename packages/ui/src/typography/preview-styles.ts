import { labelRoleForFill, semanticVariableName } from "../color/semantic";
import type { SemanticToken } from "../color/semantic";
import { elevationVariableName } from "../scale/elevation";
import { radiusVariableName } from "../scale/radius";
import { spacingVariableName } from "../scale/spacing";
import { isPreviewButton } from "./preview-shell";

/**
 * What the inspector can change about one element of the preview page, beyond
 * its copy, type role and text colour.
 *
 * Every value is a reference to something the system already names: a step of
 * the spacing scale, a token of the radius scale, a level of the elevation
 * scale, a role of the semantic layer. There is no free length. A value the
 * person has not set is absent and the page draws what it always did, so a
 * project saved before this existed is read unchanged and an element with
 * nothing set takes no space in the file.
 *
 * Opacity is the one number, a percentage, since it is not a length and no
 * scale names it. A stroke's weight is one of a short list for the same
 * reason: it is not in a scale, and a closed list is not an invented length.
 */
export type PreviewStrokePosition = "inside" | "center" | "outside";

export const PREVIEW_STROKE_POSITIONS: readonly PreviewStrokePosition[] = [
  "inside",
  "center",
  "outside",
];

export const PREVIEW_STROKE_WEIGHTS = [1, 2, 3, 4] as const;

export interface PreviewStroke {
  /** A semantic token id, usually a border: `border.default`. */
  tokenId: string;
  position: PreviewStrokePosition;
  weight: number;
}

export const PREVIEW_PADDING_SIDES = [
  "top",
  "right",
  "bottom",
  "left",
] as const;
export type PreviewPaddingSide = (typeof PREVIEW_PADDING_SIDES)[number];

export const PREVIEW_RADIUS_CORNERS = [
  "topLeft",
  "topRight",
  "bottomRight",
  "bottomLeft",
] as const;
export type PreviewRadiusCorner = (typeof PREVIEW_RADIUS_CORNERS)[number];

export interface PreviewSlotStyle {
  /** A spacing step: the gap between what the element holds. */
  gap?: number;
  /** Spacing steps, a side each. */
  padding?: Partial<Record<PreviewPaddingSide, number>>;
  /** 0 to 100. */
  opacity?: number;
  /** Radius token ids, a corner each. */
  radius?: Partial<Record<PreviewRadiusCorner, string>>;
  /** A semantic token id: what a button is filled with. */
  fill?: string;
  stroke?: PreviewStroke;
  /** An elevation level id. */
  shadow?: string;
}

export type PreviewStyles = Record<string, PreviewSlotStyle>;

/** What the inspector shows for an element. */
export type PreviewInspectKind = "text" | "button" | "band";

/**
 * What an element is, by its id and whether it is a band.
 *
 * Told by the caller and not by the id, because a band and a slot can share
 * one: the quote is a band called `landing-quote` and a slot called that too.
 */
export function previewInspectKind(
  id: string,
  isBand = false,
): PreviewInspectKind {
  if (isBand) return "band";
  return isPreviewButton(id) ? "button" : "text";
}

/**
 * Where an element's style is kept. A slot is under its own id; a band is
 * under `band:` and its id, so the quote's text and the quote's band are two
 * entries and not one.
 */
export function previewStyleKey(id: string, isBand = false): string {
  return isBand ? `band:${id}` : id;
}

/** One thing the inspector can set. */
export type PreviewInspectField =
  | "copy"
  | "typography"
  | "gap"
  | "padding"
  | "opacity"
  | "radius"
  | "fill"
  | "stroke"
  | "effects";

/**
 * What each kind of element offers, in the order the panel shows it.
 *
 * Text: its copy, its type and its colour (the Fill), and how opaque it is.
 * A button: its copy and type, the room and shape it has, what it is filled
 * with, its edge and its shadow. A band: the room it holds, its fill, how
 * opaque and how round it is, its edge and its shadow; its copy is its
 * children's, not its own.
 */
export const PREVIEW_INSPECT_FIELDS: Record<
  PreviewInspectKind,
  readonly PreviewInspectField[]
> = {
  text: ["copy", "typography", "fill", "opacity"],
  button: [
    "copy",
    "typography",
    "padding",
    "radius",
    "fill",
    "stroke",
    "effects",
  ],
  band: ["gap", "padding", "opacity", "radius", "fill", "stroke", "effects"],
};

export function previewInspectOffers(
  kind: PreviewInspectKind,
  field: PreviewInspectField,
): boolean {
  return PREVIEW_INSPECT_FIELDS[kind].includes(field);
}

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
  return { tokenId: raw.tokenId, position, weight };
}

function readSlotStyle(value: unknown): PreviewSlotStyle | null {
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
  const stroke = readStroke(raw.stroke);
  if (stroke) style.stroke = stroke;
  if (isId(raw.shadow)) style.shadow = raw.shadow;

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

/* ---- drawing ---- */

/**
 * The token that labels a button filled with a token of its own choosing.
 *
 * The role the seed measures a label against that fill with, where there is
 * one (`action.primary` is read by `fg.on-action`), or the ordinary text
 * colour: a surface is labelled by text.
 */
export function previewButtonLabelToken(
  fillId: string,
  tokens: readonly SemanticToken[],
): string {
  const seeded = labelRoleForFill(fillId);
  if (seeded) return seeded;
  const [, leaf] = fillId.split(".");
  const generated = leaf ? `fg.on-${leaf}` : null;
  if (generated && tokens.some((token) => token.id === generated)) {
    return generated;
  }
  return "fg.primary";
}

/** CSS properties, camel-cased as React takes them. */
export type PreviewStyleDeclarations = Record<string, string | number>;

function strokeShadow(stroke: PreviewStroke): string[] {
  const colour = `var(${semanticVariableName(stroke.tokenId)})`;
  const { weight } = stroke;
  if (stroke.position === "inside") {
    return [`inset 0 0 0 ${weight}px ${colour}`];
  }
  if (stroke.position === "outside") return [`0 0 0 ${weight}px ${colour}`];
  /* Centred: half of it either side of the edge. */
  const half = weight / 2;
  return [`inset 0 0 0 ${half}px ${colour}`, `0 0 0 ${half}px ${colour}`];
}

/**
 * An element's overrides as inline style, every length a variable.
 *
 * A stroke and a shadow are one `box-shadow`: two properties cannot both own
 * it. The stroke goes first so it is drawn over the shadow.
 *
 * A band's fill is not here: it is the band's own, and is drawn by its own
 * code, which also paints an image.
 */
export function previewStyleDeclarations(
  style: PreviewSlotStyle,
  tokens: readonly SemanticToken[] = [],
  kind: PreviewInspectKind = "band",
): PreviewStyleDeclarations {
  const out: PreviewStyleDeclarations = {};

  if (style.gap !== undefined) {
    out.gap = `var(${spacingVariableName(style.gap)})`;
  }

  const sides: Record<PreviewPaddingSide, string> = {
    top: "paddingTop",
    right: "paddingRight",
    bottom: "paddingBottom",
    left: "paddingLeft",
  };
  for (const side of PREVIEW_PADDING_SIDES) {
    const step = style.padding?.[side];
    if (step !== undefined) {
      out[sides[side]] = `var(${spacingVariableName(step)})`;
    }
  }

  if (style.opacity !== undefined) out.opacity = style.opacity / 100;

  const corners: Record<PreviewRadiusCorner, string> = {
    topLeft: "borderTopLeftRadius",
    topRight: "borderTopRightRadius",
    bottomRight: "borderBottomRightRadius",
    bottomLeft: "borderBottomLeftRadius",
  };
  for (const corner of PREVIEW_RADIUS_CORNERS) {
    const id = style.radius?.[corner];
    if (id) out[corners[corner]] = `var(${radiusVariableName(id)})`;
  }

  if (style.fill && kind === "button") {
    out.backgroundColor = `var(${semanticVariableName(style.fill)})`;
    /* A button's label has to read on what it is now filled with. */
    out.color = `var(${semanticVariableName(
      previewButtonLabelToken(style.fill, tokens),
    )})`;
  }

  const shadows = [
    ...(style.stroke ? strokeShadow(style.stroke) : []),
    ...(style.shadow ? [`var(${elevationVariableName(style.shadow)})`] : []),
  ];
  if (shadows.length > 0) out.boxShadow = shadows.join(", ");

  return out;
}
