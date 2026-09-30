"use client";

import { Slider } from "@astryxdesign/core/Slider";
import {
  MAX_SPACING_DENSITY,
  MIN_SPACING_DENSITY,
  SPACING_DENSITY_STEP,
  formatSpacingDensity,
} from "@blueprint/ui";
import styles from "./scale-workspace.module.css";

interface SpacingDensitySettingProps {
  density: number;
  /** The slider: one step in history per drag. */
  onChange: (density: number) => void;
}

/**
 * Density: one slider, from half to twice, a notch of 0.05 at a time.
 *
 * There used to be three one-click values above it. The slider reaches them
 * and everything between, and spacing rounds to even pixels, so any density is
 * a clean set of sizes; the buttons were a second way to the same place. The
 * slider rounds to its step itself, so the value is whole hundredths.
 */
export function SpacingDensitySetting({
  density,
  onChange,
}: SpacingDensitySettingProps) {
  return (
    <div className={styles.settingGroup}>
      <h2>Density</h2>
      <p className={styles.settingHint}>
        One multiplier on layout gaps (step 2 and up). The fine grid does not
        follow it, so a 2px hairline stays 2px.
      </p>
      <Slider
        formatValue={formatSpacingDensity}
        label={`Density: ${formatSpacingDensity(density)}`}
        max={MAX_SPACING_DENSITY}
        min={MIN_SPACING_DENSITY}
        step={SPACING_DENSITY_STEP}
        value={density}
        onChange={onChange}
      />
    </div>
  );
}
