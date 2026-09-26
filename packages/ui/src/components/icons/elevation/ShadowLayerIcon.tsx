import type { SVGProps } from "react";
import type { ShadowLayerEdges } from "../../../scale/elevation-edit";

export interface ShadowLayerIconProps extends SVGProps<SVGSVGElement> {
  /** The sides the shadow shows on, from `shadowLayerEdges`. */
  edges: ShadowLayerEdges;
  /** An inner shadow is marked inside the box; a drop shadow, outside it. */
  inner?: boolean;
}

/* The box is 14 units square, from 5 to 19. A drop shadow's mark runs 2
   outside an edge, an inner one's 3.5 inside it. */
const OUTER = { near: 3, far: 21, from: 7, to: 17 };
const INNER = { near: 8.5, far: 15.5, from: 9, to: 15 };

/**
 * A shadow layer: a box with a heavier line on the side its shadow falls, the
 * way Figma marks an effect in its layer list. A drop shadow's line is
 * outside the box, an inner shadow's inside it.
 *
 * Two marked sides that meet run to the shared corner, so a shadow down and
 * to the right reads as one L rather than two dashes. With every side marked,
 * as for a shadow with no offset, the line is drawn at half strength: the
 * shadow is even, not heavy.
 *
 * Every stroke keeps its width as the icon is sized, so it stays one weight
 * whether it is 16px or stretched to a row's height.
 */
export function ShadowLayerIcon({
  edges,
  inner = false,
  ...props
}: ShadowLayerIconProps) {
  const at = inner ? INNER : OUTER;
  const even = edges.top && edges.right && edges.bottom && edges.left;
  const span = (start: boolean, end: boolean): [number, number] => [
    start ? at.near : at.from,
    end ? at.far : at.to,
  ];
  const [leftX, rightX] = span(edges.left, edges.right);
  const [topY, bottomY] = span(edges.top, edges.bottom);
  const marks = [
    edges.top && `M${leftX} ${at.near}H${rightX}`,
    edges.bottom && `M${leftX} ${at.far}H${rightX}`,
    edges.left && `M${at.near} ${topY}V${bottomY}`,
    edges.right && `M${at.far} ${topY}V${bottomY}`,
  ].filter(Boolean);

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
        height="14"
        rx="2"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
        width="14"
        x="5"
        y="5"
      />
      <path
        d={marks.join("")}
        data-shadow-edges=""
        strokeOpacity={even ? 0.5 : 1}
        strokeWidth="2.5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
