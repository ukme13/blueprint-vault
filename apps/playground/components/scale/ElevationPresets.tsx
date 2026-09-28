"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  ELEVATION_PRESETS,
  applyElevationPreset,
  elevationPreviewSurfaces,
  matchingElevationPreset,
  resolveElevationLevel,
  type ColorTrack,
  type ElevationLevel,
  type ElevationPresetId,
  type ElevationScale,
} from "@blueprint/ui";
import { useThemeMode } from "../../app/theme-provider";
import { PopoverOrSheet } from "../PopoverOrSheet";
import { ElevationPresetGrid } from "./ElevationPresetGrid";
import styles from "./scale-workspace.module.css";

interface ElevationPresetsProps {
  scale: ElevationScale;
  level: ElevationLevel;
  palettes: ColorTrack[];
  onChange: (scale: ElevationScale, editKey?: string) => void;
}

/**
 * The selected level's style preset, as one compact row: a live thumbnail
 * of the level's shadow, the preset it is ("Custom" once edited away from
 * every preset), and a chevron.
 *
 * It opens the presets as cards to the left of the panel, over the canvas —
 * where a layer's settings open too — or, on a phone, as a sheet. Picking
 * one replaces the level's layers, as one step in history, and closes.
 */
export function ElevationPresets({
  scale,
  level,
  palettes,
  onChange,
}: ElevationPresetsProps) {
  const { resolved: mode } = useThemeMode();
  const [isOpen, setIsOpen] = useState(false);
  const surface = elevationPreviewSurfaces(palettes)[mode];
  const active = matchingElevationPreset(level, scale, palettes);
  const preset = ELEVATION_PRESETS.find((each) => each.id === active);
  const name = preset?.name ?? "Custom";
  /* A preset says what it is for; Custom has nothing to describe, so it says
     what the row does instead. */
  const hint = preset?.description ?? "Click to change preset";
  const shadow = resolveElevationLevel(level, scale, palettes, mode).css;

  const pick = (id: ElevationPresetId) => {
    onChange(applyElevationPreset(scale, level.id, id, palettes));
    setIsOpen(false);
  };
  const trigger = (
    <button
      aria-expanded={isOpen}
      aria-label={`Style preset: ${name}`}
      className={styles.presetTrigger}
      type="button"
    >
      <span
        className={styles.presetThumb}
        style={{ background: surface.ground }}
      >
        <span
          className={styles.presetThumbTile}
          data-preset-thumbnail=""
          style={{ background: surface.card, boxShadow: shadow }}
        />
      </span>
      <span className={styles.presetTriggerText}>
        <span className={styles.presetTriggerName}>{name}</span>
        <span className={styles.presetTriggerHint}>{hint}</span>
      </span>
      <ChevronDown aria-hidden="true" className={styles.presetChevron} />
    </button>
  );

  return (
    <div
      aria-label={`${level.name} presets`}
      className={styles.settingSubgroup}
      role="group"
    >
      <h2>Style preset</h2>
      <PopoverOrSheet
        isOpen={isOpen}
        label="Style presets"
        trigger={trigger}
        width={320}
        onOpenChange={setIsOpen}
      >
        <div className={styles.presetPanel}>
          <h2 className={styles.presetPanelTitle}>Style presets</h2>
          <ElevationPresetGrid
            active={active}
            mode={mode}
            palettes={palettes}
            scale={scale}
            surface={surface}
            onPick={pick}
          />
        </div>
      </PopoverOrSheet>
    </div>
  );
}
