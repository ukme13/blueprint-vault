import {
  labelRoleForFill,
  semanticVariableName,
  SemanticToken,
} from "../color/semantic";
import { elevationVariableName } from "../scale/elevation";
import { radiusVariableName } from "../scale/radius";
import { spacingVariableName } from "../scale/spacing";
import { PreviewNative } from "./preview-native";
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

  if (style.fill && (kind === "button" || kind === "card" || kind === "chip")) {
    out.backgroundColor = `var(${semanticVariableName(style.fill)})`;
    /* A button's label has to read on what it is now filled with. A card's
       copy is its own slots', set where each is drawn. */
    if (kind === "button") {
      out.color = `var(${semanticVariableName(
        previewButtonLabelToken(style.fill, tokens),
      )})`;
    }
  }

  /* A label colour of its own is the person's and wins over the one derived
     from the fill. */
  if ((kind === "button" || kind === "chip") && style.labelColor) {
    out.color = `var(${semanticVariableName(style.labelColor)})`;
  }

  /* An edge on one side alone is a border of that side; all the way round it
     is a shadow, so it can sit inside, outside or on the edge. */
  const { stroke } = style;
  const ringed = stroke && !stroke.side ? strokeShadow(stroke) : [];
  const shadows = [
    ...ringed,
    ...(typeof style.shadow === "string"
      ? [`var(${elevationVariableName(style.shadow)})`]
      : []),
    /* With an edge drawn as a shadow, the shadow the element already had must
       be said too, or it is lost: the library keeps it in a variable. */
    ...(style.shadow === undefined && native.hasShadow && ringed.length > 0
      ? ["var(--tw-shadow, 0 0 #0000)"]
      : []),
  ];
  if (shadows.length > 0) out.boxShadow = shadows.join(", ");
  else if (style.shadow === null) out.boxShadow = "none";

  /* A stroke, or the taking away of one, is the element's edge, so the edge it
     already has gives way: an outlined button, a card and a section keep a
     border of their own, and with a stroke on top the element would show two
     outlines. Longhands, since the base styles set border colours as longhands
     and a shorthand beside them is what React warns of when one is removed. */
  if (stroke !== undefined) {
    out.borderTopWidth = 0;
    out.borderRightWidth = 0;
    out.borderBottomWidth = 0;
    out.borderLeftWidth = 0;
  }
  if (stroke?.side) {
    const edge = stroke.side === "top" ? "Top" : "Bottom";
    out[`border${edge}Width`] = stroke.weight;
    out[`border${edge}Style`] = "solid";
    out[`border${edge}Color`] = `var(${semanticVariableName(stroke.tokenId)})`;
  }

  return out;
}
