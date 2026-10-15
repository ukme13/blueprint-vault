import {
  labelRoleForFill,
  semanticVariableName,
  SemanticToken,
} from "../color/semantic";
import { elevationVariableName } from "../scale/elevation";
import { radiusVariableName } from "../scale/radius";
import { spacingVariableName } from "../scale/spacing";
import type { PreviewNative } from "./preview-native";
import { PREVIEW_PAGE_VARIABLE } from "./preview-sections";
import {
  PreviewStroke,
  PREVIEW_PADDING_SIDES,
  PreviewPaddingSide,
  PREVIEW_RADIUS_CORNERS,
  PreviewRadiusCorner,
  PreviewSlotStyle,
  PreviewInspectKind,
  previewInspectOffers,
} from "./preview-style-model";

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

/**
 * The label token a button is drawn with once it has a fill or a colour of its
 * own choosing, and whether that was chosen or derived. Nothing when neither
 * is set: the page draws the label as it always did.
 */
export function previewButtonLabelOf(
  style: PreviewSlotStyle,
  tokens: readonly SemanticToken[],
  kind: "button" | "chip" = "button",
): { tokenId: string; isChosen: boolean } | null {
  if (style.labelColor) return { tokenId: style.labelColor, isChosen: true };
  /* A chip's text is not derived from its fill; it is what it was. */
  if (kind === "button" && style.fill) {
    return {
      tokenId: previewButtonLabelToken(style.fill, tokens),
      isChosen: false,
    };
  }
  return null;
}

/** CSS properties, camel-cased as React takes them. */
export type PreviewStyleDeclarations = Record<string, string | number>;

/**
 * An edge all the way round, as an outline.
 *
 * An outline is drawn over the border box's edge and takes no room, so an edge
 * can sit inside, on or outside it without the element growing or shrinking by
 * the border it replaces, which a border or an inset shadow would: a button
 * that is 38px tall is 38px tall with the stroke and without it. It follows the
 * corner radius, and it leaves the box-shadow to the shadow.
 */
function strokeOutline(stroke: PreviewStroke): PreviewStyleDeclarations {
  const { weight } = stroke;
  const offset =
    stroke.position === "inside"
      ? -weight
      : stroke.position === "center"
        ? -weight / 2
        : 0;
  return {
    outlineStyle: "solid",
    outlineWidth: `${weight}px`,
    outlineColor: `var(${semanticVariableName(stroke.tokenId)})`,
    outlineOffset: `${offset}px`,
  };
}

/**
 * An element's overrides as inline style, every length a variable.
 *
 * A stroke and a shadow are one `box-shadow`: two properties cannot both own
 * it. The stroke goes first so it is drawn over the shadow.
 *
 * A band's fill is not here: it is the band's own, and is drawn by its own
 * code, which also paints an image. A card's is, as a button's is.
 */
export function previewStyleDeclarations(
  style: PreviewSlotStyle,
  tokens: readonly SemanticToken[] = [],
  kind: PreviewInspectKind = "band",
  native: PreviewNative = {},
): PreviewStyleDeclarations {
  const out: PreviewStyleDeclarations = {};

  /* Only where it does something: a gap stored on a band before it was taken
     away stays in the file and draws nothing. */
  if (style.gap !== undefined && previewInspectOffers(kind, "gap")) {
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

  /* A button dressed the other way draws the variant's fill, edge and shadow
     where none is set: the page's own are the other pattern's. */
  const look = kind === "button" ? style.variant : undefined;
  const fill = style.fill ?? (look ? native.fill : undefined);

  if (
    fill &&
    (kind === "button" || kind === "card" || kind === "chip" || kind === "page")
  ) {
    out.backgroundColor = `var(${semanticVariableName(fill)})`;
    /* The page is painted, and only the page: the canvas role is left as it is.
       Its colour is also said as a property, for a band that must be opaque over
       it, the sticky nav. */
    if (kind === "page") {
      out[PREVIEW_PAGE_VARIABLE] = `var(${semanticVariableName(fill)})`;
    }
    /* A button's label has to read on what it is now filled with. A card's
       copy is its own slots', set where each is drawn. */
    if (kind === "button") {
      out.color = `var(${semanticVariableName(
        previewButtonLabelToken(fill, tokens),
      )})`;
    }
  } else if (look) {
    /* Outlined: no fill, and the text is the ordinary text colour. */
    out.backgroundColor = "transparent";
    out.color = "var(--color-fg-primary)";
  }

  /* A label colour of its own is the person's and wins over the one derived
     from the fill. */
  if ((kind === "button" || kind === "chip") && style.labelColor) {
    out.color = `var(${semanticVariableName(style.labelColor)})`;
  }

  /* An edge on one side alone is a border of that side; all the way round it
     is a shadow, so it can sit inside, outside or on the edge. */
  /* A closed eye draws what taking it away would: nothing, and the edge the
     page had gives way too. What was chosen stays in the style. */
  const chosenStroke =
    style.stroke !== undefined
      ? style.stroke
      : look
        ? (native.stroke ?? null)
        : undefined;
  const chosenShadow =
    style.shadow !== undefined
      ? style.shadow
      : look
        ? (native.shadow ?? null)
        : undefined;
  const stroke = style.isStrokeHidden ? null : chosenStroke;
  const shadow = style.isShadowHidden ? null : chosenShadow;
  if (typeof shadow === "string") {
    out.boxShadow = `var(${elevationVariableName(shadow)})`;
  } else if (shadow === null) {
    out.boxShadow = "none";
  }

  /* An edge, or the taking away of one, is the element's edge, so the one it
     has gives way: an outlined button, a card and a section keep a border of
     their own. Its colour goes and its width stays, so the element keeps its
     size; with a stroke on top it would otherwise show two outlines. The colour
     is the shorthand, which is what the buttons' own style sets. */
  if (stroke !== undefined) out.borderColor = "transparent";
  if (stroke && !stroke.side) Object.assign(out, strokeOutline(stroke));
  if (stroke?.side) {
    /* On one side alone it is that side's border, and the others have none. */
    out.borderTopWidth = 0;
    out.borderRightWidth = 0;
    out.borderBottomWidth = 0;
    out.borderLeftWidth = 0;
    const edge = stroke.side === "top" ? "Top" : "Bottom";
    out[`border${edge}Width`] = stroke.weight;
    out[`border${edge}Style`] = "solid";
    out[`border${edge}Color`] = `var(${semanticVariableName(stroke.tokenId)})`;
    delete out.borderColor;
  }

  return out;
}
