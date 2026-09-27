"use client";

import {
  SegmentedControl,
  SegmentedControlItem,
} from "@astryxdesign/core/SegmentedControl";
import { Slider } from "@astryxdesign/core/Slider";
import {
  MAX_SPACING_DENSITY,
  MIN_SPACING_DENSITY,
  SPACING_DENSITY_PRESETS,
} from "@blueprint/ui";
import styles from "./scale-workspace.module.css";

interface SpacingDensitySettingProps {
  density: number;
  /** A preset: its own step in history. */
  onPreset: (density: number) => void;
  /** The slider: one step in history per drag. */
  onChange: (density: number) => void;
}

/**
 * Density: three one-click values, and the slider for anything between.
 * The presets mark the one the scale is at, and none when the slider sits
 * between them; the slider shows wherever a preset put it.
 */
export function SpacingDensitySetting({
  density,
  onPreset,
  onChange,
}: SpacingDensitySettingProps) {
  const current = SPACING_DENSITY_PRESETS.find(
    (preset) => preset.value === density,
  );

  return (
    <div className={styles.settingGroup}>
      <h2>Density</h2>
      <p className={styles.settingHint}>
        One multiplier on layout gaps (step 2 and up). The fine grid does not
        follow it, so a 2px hairline stays 2px.
      </p>
      <SegmentedControl
        label="Density preset"
        layout="fill"
        size="md"
        value={current?.id ?? ""}
        onChange={(id) => {
          const preset = SPACING_DENSITY_PRESETS.find((each) => each.id === id);
          if (preset && preset.value !== density) onPreset(preset.value);
        }}
      >
        {SPACING_DENSITY_PRESETS.map((preset) => (
          <SegmentedControlItem
            key={preset.id}
            label={`${preset.name} ${preset.value}×`}
            value={preset.id}
          />
        ))}
      </SegmentedControl>
      <Slider
        label={`Density: ${density}×`}
        max={MAX_SPACING_DENSITY}
        min={MIN_SPACING_DENSITY}
        step={0.25}
        value={density}
        onChange={onChange}
      />
    </div>
  );
}
