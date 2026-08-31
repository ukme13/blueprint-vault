"use client";

import type { ReactNode } from "react";
import { Selector } from "@astryxdesign/core/Selector";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@astryxdesign/core/SegmentedControl";
import { Slider } from "@astryxdesign/core/Slider";
import {
  Button,
  COLOUR_MODES,
  COLOUR_VISION_DEFICIENCIES,
  MIN_COLOUR_VISION_SEVERITY,
  colourVisionOptionLabel,
  type ColourMode,
  type ColourVisionDeficiency,
} from "@blueprint/ui";
import { usePaletteView } from "./palette/PaletteViewContext";
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
  /* Read from the context rather than passed in. Both pages sit inside
     PaletteViewProvider, so the vision preference is one value already — the
     chip here and the chip in the shade generator turn the same thing on. */
  const {
    deficiency,
    severity,
    simulation,
    setDeficiency,
    setSeverity,
    toggleSimulation,
  } = usePaletteView();
  const isSimulationOn = simulation !== "normal";

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex flex-wrap items-center gap-3 border-b border-[var(--color-neutral-800)] bg-[var(--color-neutral-900)] px-6 py-3 text-[var(--color-neutral-100)]">
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
        {/* The chip is the on/off and the list holds the deficiencies only,
            the same shape the shade generator uses. Offering "normal vision" as
            a fifth entry would give two ways to say the same thing and let them
            disagree — and a selector alone, which is what this was, has no way
            back to normal at all. */}
        <Button
          aria-pressed={isSimulationOn}
          scheme="neutral"
          size="small"
          variant={isSimulationOn ? "contained" : "outlined"}
          onClick={toggleSimulation}
        >
          Vision
        </Button>
        {isSimulationOn && (
          <div className="w-60">
            <Selector
              isLabelHidden
              label="Vision type"
              options={COLOUR_VISION_DEFICIENCIES.map((each) => ({
                label: colourVisionOptionLabel(each, severity),
                value: each,
              }))}
              size="sm"
              value={deficiency}
              onChange={(next) => setDeficiency(next as ColourVisionDeficiency)}
            />
          </div>
        )}
        {isSimulationOn && (
          <div className="w-32">
            {/* Stepped at 0.1, which is what Machado tabulates, and starting
                there because 0.0 is not a severity — it is the chip being
                off. */}
            <Slider
              isLabelHidden
              formatValue={(value) => `${Math.round(value * 100)}%`}
              label="Vision severity"
              max={1}
              min={MIN_COLOUR_VISION_SEVERITY}
              step={0.1}
              value={severity}
              valueDisplay="text"
              onChange={(value: number | [number, number]) =>
                setSeverity(value as number)
              }
            />
          </div>
        )}
        <WorkspaceNav active="preview" />
      </header>

      {/* The canvas. Everything inside it is drawn from the workspace's own
          tokens and nothing outside it is. Rendered without a wrapper so it can
          take the remaining height itself: a `flex-1` box around it left its
          background resolving against a parent with no definite height, and the
          page showed the chrome's colour under a short canvas. */}
      {children}

      <footer className="border-t border-[var(--color-neutral-800)] bg-[var(--color-neutral-900)] px-6 py-4 text-sm text-[var(--color-neutral-400)]">
        Drawn from {tokenCount} semantic tokens, in {mode} mode.
      </footer>
    </div>
  );
}
