"use client";

import type { ReactNode } from "react";
import type { ColourMode } from "@blueprint/ui";
import { ThemeControl } from "./ThemeControl";
import { VisionControl } from "./VisionControl";
import { WorkspaceNav } from "./WorkspaceNav";

/**
 * The tool around the preview, which is not part of what is being previewed.
 *
 * It lives outside `components/preview/` on purpose. That directory is checked
 * for primitives and hardcoded measurements, and the check is what makes the
 * canvas worth looking at; chrome has to reach for the studio's own colours,
 * which would either fail that check or force an exemption that hollows it out.
 * The directory boundary says which is which.
 *
 * One mode control, and it is the same one every other page has. This page
 * used to carry a switch of its own — two states, "Colour mode" — beside the
 * studio's three-state theme, which made a page with two things called a
 * theme each flipping a different half of it, and later a page whose only
 * switch could not say "system" when every other page could. The theme is one
 * choice for the whole application now.
 *
 * `colorScheme` on the root is still declared rather than inherited, because
 * this element is where the two halves have to agree: the canvas below draws
 * from semantic variables computed for a resolved mode, and the bar around it
 * draws from `light-dark()` chrome tokens, which resolve against whatever
 * `color-scheme` is in force. Naming the resolved mode here is what keeps a
 * `system` page from resolving those two against different answers.
 */

interface PreviewChromeProps {
  name: string;
  /** The resolved mode — what is being drawn, never `system`. */
  mode: ColourMode;
  /** What the footer reports about the canvas below. */
  tokenCount: number;
  children: ReactNode;
}

export function PreviewChrome({
  name,
  mode,
  tokenCount,
  children,
}: PreviewChromeProps) {
  return (
    <div className="flex min-h-dvh flex-col" style={{ colorScheme: mode }}>
      <header className="flex flex-wrap items-center gap-3 border-b border-border-default bg-surface-subtle px-6 py-3 text-fg-primary">
        <strong className="mr-auto text-sm">{name}</strong>
        <ThemeControl />
        <VisionControl />
        <WorkspaceNav active="preview" />
      </header>

      {/* The canvas. Everything inside it is drawn from the workspace's own
          tokens and nothing outside it is. Rendered without a wrapper so it can
          take the remaining height itself: a `flex-1` box around it left its
          background resolving against a parent with no definite height, and the
          page showed the chrome's colour under a short canvas. */}
      {children}

      <footer className="border-t border-border-default bg-surface-subtle px-6 py-4 text-sm text-fg-muted">
        Drawn from {tokenCount} semantic tokens, in {mode} mode.
      </footer>
    </div>
  );
}
