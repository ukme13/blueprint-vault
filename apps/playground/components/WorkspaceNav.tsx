"use client";

import Link from "next/link";

interface WorkspaceNavProps {
  active: "colour" | "typography" | "scale" | "preview";
}

/**
 * Links between the studios.
 *
 * Styled here rather than by whoever renders it. The look used to live in two
 * CSS modules — the palette workspace's and the typography one's — which meant
 * the two pages added since had no styling at all and rendered as default
 * browser links.
 *
 * The colour is inherited and the state is opacity, so one rule works on the
 * studios' dark topbar and on a light page. A fixed pair of neutrals could not:
 * the active colour that reads on `--color-neutral-900` disappears on white.
 */
const LINK =
  "no-underline opacity-70 transition-opacity hover:opacity-100 aria-[current=page]:opacity-100";

/**
 * The colour, forced rather than classed.
 *
 * `text-inherit` loses here: Astryx's stylesheet sets a link colour in a layer
 * that sorts after Tailwind's utilities, and layer order beats specificity. The
 * typography topbar showed it — the link resolved to a mid grey and 70% of that
 * on a near-black bar is about 2.5:1.
 */
const INHERIT_COLOUR = { color: "inherit" } as const;

export function WorkspaceNav({ active }: WorkspaceNavProps) {
  return (
    <nav
      aria-label="Blueprint workspaces"
      className="flex items-center gap-3 text-xs"
    >
      <Link
        aria-current={active === "colour" ? "page" : undefined}
        className={LINK}
        style={INHERIT_COLOUR}
        href="/"
      >
        Colour
      </Link>
      <Link
        className={LINK}
        style={INHERIT_COLOUR}
        aria-current={active === "typography" ? "page" : undefined}
        href="/typography"
      >
        Typography
      </Link>
      <Link
        className={LINK}
        style={INHERIT_COLOUR}
        aria-current={active === "scale" ? "page" : undefined}
        href="/scale"
      >
        Scale
      </Link>
      <Link
        className={LINK}
        style={INHERIT_COLOUR}
        aria-current={active === "preview" ? "page" : undefined}
        href="/preview"
      >
        Preview
      </Link>
    </nav>
  );
}
