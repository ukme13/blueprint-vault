import { isPreviewButton } from "./preview-shell";
import type { PreviewInspectKind, PreviewStroke } from "./preview-styles";

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

/** The edge a band is drawn with: the line it shares with the next. */
const BAND_DIVIDERS: Record<string, PreviewStroke> = {
  "shell-nav": inside("border.default", "bottom"),
  "shell-footer": inside("border.default", "top"),
};

export function previewNativeStyle(
  id: string,
  kind: PreviewInspectKind,
): PreviewNative {
  switch (kind) {
    case "button": {
      if (!isPreviewButton(id)) return {};
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
    case "band": {
      const stroke = BAND_DIVIDERS[id];
      return stroke ? { stroke } : {};
    }
    default:
      return {};
  }
}
