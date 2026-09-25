"use client";

import {
  Button,
  ELEVATION_PRESETS,
  applyElevationPreset,
  type ColorTrack,
  type ElevationLevel,
  type ElevationScale,
} from "@blueprint/ui";
import styles from "./scale-workspace.module.css";

interface ElevationPresetsProps {
  scale: ElevationScale;
  level: ElevationLevel;
  palettes: ColorTrack[];
  onChange: (scale: ElevationScale, editKey?: string) => void;
}

/**
 * Quick starting points for the selected level. A preset replaces the level's
 * layers only; its name and variable stay. Each press is its own step in
 * history, so one undo puts the old stack back.
 */
export function ElevationPresets({
  scale,
  level,
  palettes,
  onChange,
}: ElevationPresetsProps) {
  return (
    <div
      aria-label={`${level.name} presets`}
      className={styles.settingGroup}
      role="group"
    >
      <h2>Presets</h2>
      <div className={styles.elevationPresets}>
        {ELEVATION_PRESETS.map((preset) => (
          <Button
            key={preset.id}
            scheme="neutral"
            size="small"
            title={preset.description}
            variant="outlined"
            onClick={() =>
              onChange(
                applyElevationPreset(scale, level.id, preset.id, palettes),
              )
            }
          >
            {preset.name}
          </Button>
        ))}
      </div>
    </div>
  );
}
