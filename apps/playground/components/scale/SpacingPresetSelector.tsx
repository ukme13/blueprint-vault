"use client";

import {
  SPACING_PRESETS,
  matchingSpacingPreset,
  type SpacingPresetId,
  type SpacingScale,
} from "@blueprint/ui";
import { SheetSelector } from "../SheetSelector";
import styles from "./scale-workspace.module.css";

const CUSTOM = "custom";

interface SpacingPresetSelectorProps {
  scale: SpacingScale;
  /** Replace the scale's base unit and steps with the preset's. */
  onApply: (id: SpacingPresetId) => void;
}

/**
 * A spacing grid to start from: picking one sets the base unit and the kept
 * steps in one step of history, instead of pruning the chips below by hand.
 * It shows the grid the scale is, or Custom once a chip or the base unit
 * has moved away from every preset — Custom is where the scale is, not
 * something to pick, so it cannot be chosen.
 *
 * A selector rather than cards: on a phone it opens as a sheet, as every
 * selector here does.
 */
export function SpacingPresetSelector({
  scale,
  onApply,
}: SpacingPresetSelectorProps) {
  const current = matchingSpacingPreset(scale);

  return (
    <div className={styles.settingGroup}>
      <h2>Scale preset</h2>
      <SheetSelector
        isLabelHidden
        label="Scale preset"
        options={[
          ...SPACING_PRESETS.map((preset) => ({
            value: preset.id,
            label: preset.name,
            description: preset.description,
          })),
          {
            value: CUSTOM,
            label: "Custom",
            description: "Your own base unit and steps.",
            disabled: true,
          },
        ]}
        size="md"
        value={current ?? CUSTOM}
        onChange={(next) => {
          /* Custom is disabled, so a pick is always a preset. */
          if (next && next !== current) onApply(next as SpacingPresetId);
        }}
      />
    </div>
  );
}
