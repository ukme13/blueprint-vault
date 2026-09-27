"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Popover } from "@astryxdesign/core/Popover";
import {
  ELEVATION_PRESETS,
  applyElevationPreset,
  elevationPreviewSurfaces,
  matchingElevationPreset,
  resolveElevation,
  type ColorTrack,
  type ElevationLevel,
  type ElevationPresetId,
  type ElevationScale,
} from "@blueprint/ui";
import { useThemeMode } from "../../app/theme-provider";
import { Sheet } from "../Sheet";
import { useIsPhone } from "../use-is-phone";
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
  const isPhone = useIsPhone();
  const { resolved: mode } = useThemeMode();
  const [isOpen, setIsOpen] = useState(false);
  const surface = elevationPreviewSurfaces(palettes)[mode];
  const active = matchingElevationPreset(level, scale, palettes);
  const preset = ELEVATION_PRESETS.find((each) => each.id === active);
  const name = preset?.name ?? "Custom";
  /* A preset says what it is for; Custom has nothing to describe, so it says
     what the row does instead. */
  const hint = preset?.description ?? "Click to change preset";
  const shadow =
    resolveElevation(scale, palettes, mode).find((each) => each.id === level.id)
      ?.css ?? "none";

  const pick = (id: ElevationPresetId) => {
    onChange(applyElevationPreset(scale, level.id, id, palettes));
    setIsOpen(false);
  };
  const grid = (
    <ElevationPresetGrid
      active={active}
      mode={mode}
      palettes={palettes}
      scale={scale}
      surface={surface}
      onPick={pick}
    />
  );

  const trigger = (
    <button
      aria-expanded={isOpen}
      aria-label={`Style preset: ${name}`}
      className={styles.presetTrigger}
      type="button"
      /* On a wider screen the Popover owns the click; a handler here as
         well would toggle it straight back shut. */
      onClick={isPhone ? () => setIsOpen(true) : undefined}
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
      {isPhone ? (
        <>
          {trigger}
          <Sheet
            isOpen={isOpen}
            label="Style presets"
            onClose={() => setIsOpen(false)}
          >
            <div className={styles.presetPanel}>
              <h2 className={styles.presetPanelTitle}>Style presets</h2>
              {isOpen ? grid : null}
            </div>
          </Sheet>
        </>
      ) : (
        <Popover
          alignment="start"
          /* Built only while open: Astryx's Popover keeps its content
             mounted when closed, and each card resolves a shadow. */
          content={
            isOpen ? (
              <div className={styles.presetPanel}>
                <h2 className={styles.presetPanelTitle}>Style presets</h2>
                {grid}
              </div>
            ) : null
          }
          hasCloseButton={false}
          isOpen={isOpen}
          label="Style presets"
          placement="start"
          width={320}
          onOpenChange={setIsOpen}
        >
          {trigger}
        </Popover>
      )}
    </div>
  );
}
