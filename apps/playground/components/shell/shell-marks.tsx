import type { SVGProps } from "react";
import { Layers, Paintbrush, Radius, Ruler, Type } from "lucide-react";

type MarkProps = SVGProps<SVGSVGElement>;

/**
 * Shared drawing attributes for the custom rail marks.
 *
 * Width and height stay off this object: SideNav wraps component icons in
 * `Icon` at `sm` (1rem). A baked-in 24px box fights that size.
 */
const mark = {
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  strokeWidth: 2,
  viewBox: "0 0 24 24",
};

/** Registration reticle for the Blueprint Home control. */
export function BlueprintMark(props: MarkProps) {
  return (
    <svg aria-hidden {...mark} {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
    </svg>
  );
}

/** Paintbrush — the colour bench. */
export function ColourStudioIcon(props: MarkProps) {
  return <Paintbrush aria-hidden {...props} />;
}

/** A T — the type scale. */
export function TypographyStudioIcon(props: MarkProps) {
  return <Type aria-hidden {...props} />;
}

/** A rule — spacing steps. */
export function SpacingStudioIcon(props: MarkProps) {
  return <Ruler aria-hidden {...props} />;
}

/** A corner radius. */
export function RadiusStudioIcon(props: MarkProps) {
  return <Radius aria-hidden {...props} />;
}

/** Stacked layers — elevation. */
export function ElevationStudioIcon(props: MarkProps) {
  return <Layers aria-hidden {...props} />;
}

/** A specimen page. */
export function PreviewStudioIcon(props: MarkProps) {
  return (
    <svg aria-hidden {...mark} {...props}>
      <rect height="16" rx="2" width="14" x="5" y="4" />
      <path d="M8 9h8M8 13h5" />
    </svg>
  );
}
