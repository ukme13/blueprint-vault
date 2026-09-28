import type { CSSProperties, HTMLAttributes } from "react";
import type { ShadowLayer } from "../../../scale/elevation";
import { shadowLayerIconShadow } from "../../../scale/elevation-edit";

export interface ShadowLayerIconProps extends HTMLAttributes<HTMLSpanElement> {
  /** The layer it stands for: its type and the direction of its offset. */
  layer: Pick<ShadowLayer, "type" | "offsetXPx" | "offsetYPx">;
}

/**
 * A shadow layer: a square outline that casts a small copy of the layer's own
 * shadow, so its edge reads heavier on the side the shadow falls — the way
 * Figma marks an effect in its layer list. A drop layer casts outside the
 * square; an inner one is `inset`, inside it.
 *
 * Not an SVG, as the other icons are: an SVG shape cannot cast a
 * `box-shadow`, and a real shadow is the point. It is drawn in currentColor
 * all the same, so it follows its parent's text colour.
 *
 * The frame is square and fills whatever box it is given; the outline sits
 * in its middle, with room around it for the shadow to fall into.
 */
export function ShadowLayerIcon({
  layer,
  style,
  ...props
}: ShadowLayerIconProps) {
  const frame: CSSProperties = {
    display: "inline-grid",
    placeItems: "center",
    aspectRatio: "1",
    ...style,
  };
  const square: CSSProperties = {
    boxSizing: "border-box",
    width: "58%",
    aspectRatio: "1",
    border: "1.5px solid currentColor",
    borderRadius: "3px",
    boxShadow: shadowLayerIconShadow(layer),
  };
  return (
    <span aria-hidden="true" style={frame} {...props}>
      <span data-shadow-icon="" style={square} />
    </span>
  );
}
