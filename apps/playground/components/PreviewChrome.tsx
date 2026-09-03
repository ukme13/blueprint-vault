"use client";

import type { ReactNode } from "react";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@astryxdesign/core/SegmentedControl";
import { COLOUR_MODES, type ColourMode } from "@blueprint/ui";
import { VisionControl } from "./VisionControl";
import { StudioThemeControl } from "./StudioThemeControl";
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
 * It also fixes a real mismatch. The bar used to be painted from the semantic
 * layer, so on a light system it was a light bar holding Astryx controls that
 * follow the app's dark theme — a row of black blobs. Studio chrome is dark
 * everywhere, like the other topbars, and now the controls sit on the surface
 * they were built for.
 */

interface PreviewChromeProps {
  name: string;
  mode: ColourMode;
  onModeChange: (mode: ColourMode) => void;
  /** What the footer reports about the canvas below. */
  tokenCount: number;
  children: ReactNode;
}

export function PreviewChrome({
  name,
  mode,
  onModeChange,
  tokenCount,
  children,
}: PreviewChromeProps) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex flex-wrap items-center gap-3 border-b border-border-default bg-surface-subtle px-6 py-3 text-fg-primary">
        <strong className="mr-auto text-sm">{name}</strong>
        <SegmentedControl
          label="Colour mode"
          size="sm"
          value={mode}
          onChange={(next) => onModeChange(next as ColourMode)}
        >
          {COLOUR_MODES.map((each) => (
            <SegmentedControlItem
              key={each}
              label={each === "light" ? "Light" : "Dark"}
              value={each}
            />
          ))}
        </SegmentedControl>
        <VisionControl />
        <StudioThemeControl />
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
