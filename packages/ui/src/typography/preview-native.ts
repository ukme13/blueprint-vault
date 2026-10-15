import { PREVIEW_PAGE_TOKEN } from "./preview-sections";
import { isPreviewButton } from "./preview-shell";
import type {
  PreviewButtonVariant,
  PreviewInspectKind,
  PreviewSlotStyle,
  PreviewStroke,
} from "./preview-styles";

/**
 * What an element of the preview page is drawn with before anyone changes it:
 * the fill it has, the edge it has, whether it casts a shadow.
 *
 * The page draws these from its own stylesheet, and the inspector shows them
 * as the starting values, so a button that is plainly outlined does not have
 * an empty Stroke. They are what the page does, written down once so the
 * panel and the page cannot drift: an end-to-end test reads the page's own
 * computed style against this table.
 *
 * Only what has a token to name is named. A shadow is a flag, not a level: the
 * buttons\x27 own is the button library\x27s and no step of the elevation scale.
 */
export interface PreviewNative {
  /** A semantic token id: what it is filled with. */
  fill?: string;
  stroke?: PreviewStroke;
  /** It casts a shadow of its own. */
  hasShadow?: boolean;
  /** An elevation level it is drawn with, where the shadow is a token's. */
  shadow?: string;
}

const inside = (tokenId: string, side?: "top" | "bottom"): PreviewStroke => ({
  tokenId,
  position: "inside",
  weight: 1,
  ...(side ? { side } : {}),
});

/** How a button is dressed, which the page decides where it draws it. */
export type PreviewButtonLook = "contained" | "outlined" | "inverted";

const OUTLINED_BUTTONS: readonly string[] = [
  "landing-hero-ghost",
  "landing-plan-1-cta",
  "landing-plan-3-cta",
  "landing-cta-ghost",
];

/** The featured plan\x27s button, light on its dark card. */
const INVERTED_BUTTONS: readonly string[] = ["landing-plan-2-cta"];

export function previewButtonLook(id: string): PreviewButtonLook {
  if (OUTLINED_BUTTONS.includes(id)) return "outlined";
  if (INVERTED_BUTTONS.includes(id)) return "inverted";
  return "contained";
}

/* What the page is painted with behind its bands: with the sections, since a band
   on that token is the page showing through. */
export { PREVIEW_PAGE_TOKEN };

/** The edge a band is drawn with: the line it shares with the next. */
const BAND_DIVIDERS: Record<string, PreviewStroke> = {
  "shell-nav": inside("border.default", "bottom"),
  "shell-footer": inside("border.default", "top"),
};

/**
 * How a button reads, for the control that switches it: the featured plan's
 * light button is a filled one.
 */
export function previewButtonAppearance(id: string): PreviewButtonVariant {
  return previewButtonLook(id) === "outlined" ? "outlined" : "contained";
}

/**
 * A button as the variant dresses it: filled and lightly shadowed, or
 * transparent with an edge. A variant is drawn from tokens, where the page's
 * own contained button is drawn by the button library, so the shadow here is a
 * level of the elevation scale.
 */
export function previewVariantNative(
  variant: PreviewButtonVariant,
): PreviewNative {
  return variant === "contained"
    ? { fill: "action.primary", shadow: "low" }
    : { stroke: inside("border.default") };
}

/**
 * A button's style with the variant switched. Choosing the way the page already
 * draws it clears the variant, so it is drawn by the page again; the other way
 * starts it clean, dropping the fill, label, edge and shadow set before, which
 * belonged to the other pattern. Room and shape are kept.
 */
export function withButtonVariant(
  style: PreviewSlotStyle,
  id: string,
  variant: PreviewButtonVariant,
): PreviewSlotStyle {
  const {
    fill,
    labelColor,
    stroke,
    shadow,
    isStrokeHidden,
    isShadowHidden,
    variant: previous,
    ...rest
  } = style;
  void fill;
  void labelColor;
  void stroke;
  void shadow;
  void isStrokeHidden;
  void isShadowHidden;
  void previous;
  return variant === previewButtonAppearance(id) ? rest : { ...rest, variant };
}

export function previewNativeStyle(
  id: string,
  kind: PreviewInspectKind,
  variant?: PreviewButtonVariant,
): PreviewNative {
  switch (kind) {
    case "button": {
      if (!isPreviewButton(id)) return {};
      if (variant) return previewVariantNative(variant);
      const look = previewButtonLook(id);
      if (look === "outlined") return { stroke: inside("border.default") };
      if (look === "inverted") {
        /* Its border is the colour of its fill, so there is no edge to see. */
        return { fill: "surface.base", hasShadow: true };
      }
      return { fill: "action.primary", hasShadow: true };
    }
    case "card":
      if (id === "card-pricing-featured") {
        /* As with the button on it, a border the colour of the fill is no edge. */
        return { fill: "fg.primary" };
      }
      if (id === "card-newsletter-field") {
        return { fill: "surface.base", stroke: inside("border.default") };
      }
      return { fill: "surface.raised", stroke: inside("border.subtle") };
    case "divider":
      return { stroke: inside("border.default", "top") };
    case "page":
      return { fill: PREVIEW_PAGE_TOKEN };
    case "band": {
      const stroke = BAND_DIVIDERS[id];
      return stroke ? { stroke } : {};
    }
    default:
      return {};
  }
}
