"use client";

import { Selector } from "@astryxdesign/core/Selector";
import { Slider } from "@astryxdesign/core/Slider";
import { Tooltip } from "@astryxdesign/core/Tooltip";
import {
  Button,
  COLOUR_VISION_DEFICIENCIES,
  MIN_COLOUR_VISION_SEVERITY,
  colourVisionOptionLabel,
  type ColourVisionDeficiency,
} from "@blueprint/ui";
import { usePaletteView } from "./palette/PaletteViewContext";
import styles from "./vision-control.module.css";

/**
 * Turn colour-vision simulation on, and say which and how much.
 *
 * One component for every page that offers it. The preview page first got a
 * plainer copy of this — a bare button and a selector — which meant one control
 * with two appearances, and the copy had no icon, no tooltip and none of the
 * joining that makes the pair read as a single thing.
 *
 * The chip is the on/off, so the list holds the deficiencies only. Offering
 * "normal vision" as a fifth entry would give two ways to say the same thing
 * and let them disagree — and a selector without a chip, which is what the
 * preview page had, gives no way back to normal at all.
 *
 * State comes from PaletteViewProvider, which every page that renders this sits
 * inside, so the preference is the workspace's rather than the page's.
 *
 * See docs/roadmap/colour-vision-simulation.md.
 */

function VisionIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="12"
      viewBox="0 0 18 12"
      width="18"
    >
      <circle cx="4" cy="7" r="3.2" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="14" cy="7" r="3.2" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M7.2 7h3.6M1 3.5C1.6 2 2.6 1.4 4 1.4M17 3.5c-.6-1.5-1.6-2.1-3-2.1"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.4"
      />
    </svg>
  );
}

/* Only the deficiencies. "Normal vision" is not an option here because the
   chip itself is the on/off — offering both would give two ways to say the
   same thing and let them disagree.

   The labels depend on severity: below full strength these are the anomalous
   trichromacies, which have different names, and a picker that said
   "Deuteranopia" while simulating 0.6 would be naming something else. */
function visionOptions(severity: number) {
  return COLOUR_VISION_DEFICIENCIES.map((deficiency) => ({
    value: deficiency,
    label: colourVisionOptionLabel(deficiency, severity),
  }));
}

export function VisionControl() {
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
    <span className={styles.visionGroup} data-open={isSimulationOn}>
      <Tooltip
        content="Preview the palette as someone with a colour vision deficiency sees it. Press again to turn it off."
        hasHoverIndication={false}
        placement="below"
      >
        <Button
          aria-pressed={isSimulationOn}
          className={styles.visionModeButton}
          data-active={isSimulationOn}
          leftIcon={<VisionIcon />}
          scheme="neutral"
          size="small"
          variant="outlined"
          onClick={toggleSimulation}
        >
          Vision
        </Button>
      </Tooltip>
      {isSimulationOn && (
        <span className={styles.visionOptions}>
          <Selector
            isLabelHidden
            label="Vision type"
            options={visionOptions(severity)}
            size="sm"
            value={deficiency}
            variant="ghost"
            onChange={(value) => setDeficiency(value as ColourVisionDeficiency)}
          />
        </span>
      )}
      {isSimulationOn && (
        <span className={styles.visionSeverity}>
          {/* Stepped at 0.1, which is exactly what Machado tabulates — so every
              position is a matrix read from the paper rather than an
              interpolation between two of them. It stops at 0.1 because 0.0 is
              not a severity, it is the chip being off. */}
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
        </span>
      )}
    </span>
  );
}
