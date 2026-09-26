import type { SVGProps } from "react";
import type { ShadowLayerEdges } from "../../../scale/elevation-edit";

export interface ShadowLayerIconProps extends SVGProps<SVGSVGElement> {
  /** The sides the shadow shows on, from `shadowLayerEdges`. */
  edges: ShadowLayerEdges;
  /** An inner shadow thickens its edges inward; a drop shadow, outward. */
  inner?: boolean;
}

/* The box runs from 5 to 19. A shadowed edge gains a bar this thick against
   the stroke, so the edge itself reads heavier rather than a second line
   appearing beside it. */
const BOX = { from: 5, to: 19 };
const BAR = 1.75;

type Side = keyof ShadowLayerEdges;
const SIDES: Side[] = ["top", "right", "bottom", "left"];

/** Where one side's bar sits: against the edge, outside it or inside it. */
function bar(side: Side, inner: boolean) {
  const { from, to } = BOX;
  const length = to - from;
  const near = inner ? from : from - BAR;
  const far = inner ? to - BAR : to;
  switch (side) {
    case "top":
      return { x: from, y: near, width: length, height: BAR };
    case "bottom":
      return { x: from, y: far, width: length, height: BAR };
    case "left":
      return { x: near, y: from, width: BAR, height: length };
    case "right":
      return { x: far, y: from, width: BAR, height: length };
  }
}

/**
 * A shadow layer: a box whose outline is heavier on the side its shadow
 * falls, the way Figma marks an effect in its layer list. The edge thickens
 * outward for a drop shadow and inward for an inner one, so the two read
 * differently even on the same side.
 *
 * With every side shadowed, as for a shadow with no offset, every edge is
 * heavier at half strength: the shadow is even, not heavy.
 */
export function ShadowLayerIcon({
  edges,
  inner = false,
  ...props
}: ShadowLayerIconProps) {
  const even = SIDES.every((side) => edges[side]);

  return (
    <svg
      aria-hidden
      fill="none"
      height="24"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width="24"
      {...props}
    >
      <rect
        height={BOX.to - BOX.from}
        rx="1.5"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
        width={BOX.to - BOX.from}
        x={BOX.from}
        y={BOX.from}
      />
      {SIDES.filter((side) => edges[side]).map((side) => (
        <rect
          key={side}
          {...bar(side, inner)}
          data-shadow-edge={side}
          data-shadow-side={inner ? "inside" : "outside"}
          fill="currentColor"
          fillOpacity={even ? 0.5 : 1}
          stroke="none"
        />
      ))}
    </svg>
  );
}
