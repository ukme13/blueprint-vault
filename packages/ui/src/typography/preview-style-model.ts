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

/** The edges a stroke can be drawn on alone: a divider's. */
export type PreviewEdgeSide = "top" | "bottom";

export const PREVIEW_EDGE_SIDES: readonly PreviewEdgeSide[] = ["top", "bottom"];

export interface PreviewStroke {
  /** A semantic token id, usually a border: `border.default`. */
  tokenId: string;
  position: PreviewStrokePosition;
  weight: number;
  /**
   * On one edge only, as a divider has it: the line between two bands. Absent,
   * the stroke goes all the way round and is drawn by `position`.
   */
  side?: PreviewEdgeSide;
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
  /**
   * A semantic token id: the colour of a button's label. Absent, the label
   * takes the one that reads on its fill.
   */
  labelColor?: string;
  /**
   * The edge. Absent, the element has the one it was drawn with; `null`, it
   * has none, which is the person taking it away.
   */
  stroke?: PreviewStroke | null;
  /** An elevation level id. Absent, the element's own; `null`, none. */
  shadow?: string | null;
  /**
   * The edge is kept and not drawn: the person's eye, closed, to see the
   * element with and without it. Whatever the edge is, chosen or the page's own.
   */
  isStrokeHidden?: boolean;
  /** The shadow is kept and not drawn, as the edge can be. */
  isShadowHidden?: boolean;
}

export type PreviewStyles = Record<string, PreviewSlotStyle>;

/** What the inspector shows for an element. */
export type PreviewInspectKind =
  "text" | "button" | "band" | "card" | "chip" | "divider";

/**
 * The groups of cards on the page, each styled as one: every feature card
 * together, every card of the quad, every plan. A card is not a slot of copy,
 * so these ids are of their own and cannot meet a slot's or a band's.
 */
export const PREVIEW_CARD_IDS = [
  "card-feature-card",
  "card-quad-card",
  "card-pricing",
  "card-pricing-featured",
  "card-newsletter-field",
] as const;

export type PreviewCardId = (typeof PREVIEW_CARD_IDS)[number];

export const PREVIEW_CARD_LABEL: Record<PreviewCardId, string> = {
  "card-feature-card": "Feature cards",
  "card-quad-card": "Quad cards",
  "card-pricing": "Pricing cards",
  "card-pricing-featured": "Featured plan",
  "card-newsletter-field": "Newsletter field",
};

export function isPreviewCard(id: string): id is PreviewCardId {
  return (PREVIEW_CARD_IDS as readonly string[]).includes(id);
}

/**
 * The lines between parts of the page that can be picked as what they are.
 * The row at the foot of the footer owns the line above it.
 */
export const PREVIEW_DIVIDER_IDS = ["divider-footer-base"] as const;

export type PreviewDividerId = (typeof PREVIEW_DIVIDER_IDS)[number];

export const PREVIEW_DIVIDER_LABEL: Record<PreviewDividerId, string> = {
  "divider-footer-base": "Footer divider",
};

export function isPreviewDivider(id: string): id is PreviewDividerId {
  return (PREVIEW_DIVIDER_IDS as readonly string[]).includes(id);
}

/** An element that is no slot of copy: a card, a field or a divider. */
export function isPreviewSurface(id: string): boolean {
  return isPreviewCard(id) || isPreviewDivider(id);
}

/** What the inspector calls a card, a divider or a chip; nothing for text. */
export function previewSurfaceLabel(id: string): string | null {
  if (isPreviewCard(id)) return PREVIEW_CARD_LABEL[id];
  if (isPreviewDivider(id)) return PREVIEW_DIVIDER_LABEL[id];
  if (isPreviewChip(id)) return "Plan tag";
  return null;
}

/**
 * Tags that are a small filled shape of their own, with copy in it: the
 * plan's "Popular". A slot of text that is also a surface.
 */
export const PREVIEW_CHIP_IDS: readonly string[] = ["landing-plan-2-tag"];

export function isPreviewChip(id: string): boolean {
  return PREVIEW_CHIP_IDS.includes(id);
}

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
  if (isPreviewCard(id)) return "card";
  if (isPreviewDivider(id)) return "divider";
  if (isPreviewChip(id)) return "chip";
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
  | "labelColor"
  | "stroke"
  | "effects";

/**
 * What each kind of element offers, in the order the panel shows it.
 *
 * Text: its copy, its type and its colour (the Fill), and how opaque it is.
 * A button: its copy and type, the room and shape it has, what it is filled
 * with, its edge and its shadow. A band or a card: the room it holds, its
 * fill, how opaque and how round it is, its edge and its shadow; its copy is
 * its children's, not its own.
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
    "labelColor",
    "stroke",
    "effects",
  ],
  /* No gap: a band is a block with one wrapper inside it, which has nothing
     to put a space between. The room inside it is its padding. */
  band: ["padding", "opacity", "radius", "fill", "stroke", "effects"],
  /* A card is a surface that holds copy: the room it keeps, how round and how
     opaque it is, what it is filled with, its edge and its shadow. */
  card: ["gap", "padding", "opacity", "radius", "fill", "stroke", "effects"],
  /* A chip is text in a small shape: its copy and type, the room it keeps, how
     round it is, what it is filled with, the colour of its text and its edge. */
  chip: [
    "copy",
    "typography",
    "padding",
    "radius",
    "fill",
    "labelColor",
    "stroke",
  ],
  /* A divider is a line, and the room around it. */
  divider: ["padding", "stroke"],
};

export function previewInspectOffers(
  kind: PreviewInspectKind,
  field: PreviewInspectField,
): boolean {
  return PREVIEW_INSPECT_FIELDS[kind].includes(field);
}
