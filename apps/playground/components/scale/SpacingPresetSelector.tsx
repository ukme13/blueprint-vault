"use client";

import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import {
  SPACING_PRESETS,
  matchingSpacingPreset,
  type SpacingPresetId,
  type SpacingScale,
} from "@blueprint/ui";
import { PopoverOrSheet } from "../PopoverOrSheet";
import styles from "./scale-workspace.module.css";

/** What Custom says about itself: it is where the scale is, not a grid. */
const CUSTOM_HINT = "Your own base unit and steps.";

interface SpacingPresetSelectorProps {
  scale: SpacingScale;
  /** Replace the scale's base unit and steps with the preset's. */
  onApply: (id: SpacingPresetId) => void;
}

/**
 * A spacing grid to start from: picking one sets the base unit and the kept
 * steps in one step of history, instead of pruning the chips below by hand.
 *
 * Shown as a card that says the grid the scale is, by name and in full, with a
 * chevron: the first choice in the inspector, so it is large enough to be read
 * and not a single-line field that cuts the description short. It reads
 * Custom once a chip or the base unit has moved away from every preset.
 * Custom is where the scale is, not something to pick, so the list offers only
 * the grids.
 *
 * The list opens beside the panel, or as a sheet on a phone, as every choice
 * here does.
 */
export function SpacingPresetSelector({
  scale,
  onApply,
}: SpacingPresetSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const current = matchingSpacingPreset(scale);
  const preset = SPACING_PRESETS.find((each) => each.id === current);
  const name = preset?.name ?? "Custom";
  const hint = preset?.description ?? CUSTOM_HINT;

  const pick = (id: SpacingPresetId) => {
    if (id !== current) onApply(id);
    setIsOpen(false);
  };

  const trigger = (
    <button
      aria-expanded={isOpen}
      aria-label={`Scale preset: ${name}`}
      className={styles.presetTrigger}
      data-wrap=""
      type="button"
    >
      <span className={styles.presetTriggerText}>
        <span className={styles.presetTriggerName}>{name}</span>
        <span className={styles.presetTriggerHint}>{hint}</span>
      </span>
      <ChevronDown aria-hidden="true" className={styles.presetChevron} />
    </button>
  );

  return (
    <div className={styles.settingGroup}>
      <h2>Scale preset</h2>
      <PopoverOrSheet
        isOpen={isOpen}
        label="Scale presets"
        trigger={trigger}
        width={320}
        onOpenChange={setIsOpen}
      >
        <div className={styles.presetPanel}>
          <h2 className={styles.presetPanelTitle}>Scale presets</h2>
          <div
            aria-label="Scale presets"
            className={styles.presetOptions}
            role="listbox"
          >
            {SPACING_PRESETS.map((each) => {
              const isSelected = each.id === current;
              return (
                <button
                  key={each.id}
                  aria-selected={isSelected}
                  className={styles.presetOption}
                  role="option"
                  type="button"
                  onClick={() => pick(each.id)}
                >
                  <span className={styles.presetOptionText}>
                    <span className={styles.presetOptionName}>{each.name}</span>
                    <span className={styles.presetOptionHint}>
                      {each.description}
                    </span>
                  </span>
                  {isSelected && (
                    <Check
                      aria-hidden="true"
                      className={styles.presetOptionCheck}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </PopoverOrSheet>
    </div>
  );
}
