import type { SVGProps } from "react";

type MarkProps = SVGProps<SVGSVGElement>;

const mark = {
  fill: "none",
  height: 24,
  stroke: "currentColor",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  strokeWidth: 2,
  viewBox: "0 0 24 24",
  width: 24,
} as const;

/** Registration reticle for the Blueprint Home control. */
export function BlueprintMark(props: MarkProps) {
  return (
    <svg aria-hidden {...mark} {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
    </svg>
  );
}

/** Three shade chips — the colour bench. */
export function ColourStudioIcon(props: MarkProps) {
  return (
    <svg aria-hidden {...mark} {...props}>
      <rect height="12" rx="1" width="5" x="3" y="6" />
      <rect height="12" rx="1" width="5" x="9.5" y="6" />
      <rect height="12" rx="1" width="5" x="16" y="6" />
    </svg>
  );
}

/** Type hierarchy as three measure lines. */
export function TypographyStudioIcon(props: MarkProps) {
  return (
    <svg aria-hidden {...mark} {...props}>
      <path d="M5 7h14M5 12h10M5 17h7" />
    </svg>
  );
}

/** A rule with ticks — spacing, radius, elevation. */
export function ScaleStudioIcon(props: MarkProps) {
  return (
    <svg aria-hidden {...mark} {...props}>
      <rect height="8" rx="1" width="16" x="4" y="8" />
      <path d="M8 8v3M12 8v5M16 8v3" />
    </svg>
  );
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
