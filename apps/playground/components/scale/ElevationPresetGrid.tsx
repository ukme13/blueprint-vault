"use client";

import { Check } from "lucide-react";
import {
  ELEVATION_PRESETS,
  elevationPresetCss,
  type ColorTrack,
  type ColourMode,
  type ElevationPresetId,
  type ElevationScale,
} from "@blueprint/ui";
import styles from "./scale-workspace.module.css";

interface ElevationPresetGridProps {
  scale: ElevationScale;
  palettes: ColorTrack[];
  /** The studio's mode: previews use its strength and its surfaces. */
  mode: ColourMode;
  surface: { ground: string; card: string };
  /** The preset the level is exactly, or null for Custom. */
  active: ElevationPresetId | null;
  onPick: (id: ElevationPresetId) => void;
}

/**
 * Every preset as a card: a live preview of its real `box-shadow` on the
 * current surface, its name, and what it is for. The active one is marked.
 *
 * A preview is the preset resolved against this scale and palette, the same
 * value applying it would draw — so Glow is in this palette's brand colour
 * and Neumorphic's highlight is this palette's lightest shade.
 */
export function ElevationPresetGrid({
  scale,
  palettes,
  mode,
  surface,
  active,
  onPick,
}: ElevationPresetGridProps) {
  return (
    <div className={styles.presetGrid}>
      {ELEVATION_PRESETS.map((preset) => {
        const isActive = preset.id === active;
        return (
          <button
            key={preset.id}
            aria-label={`${preset.name}: ${preset.description}`}
            aria-pressed={isActive}
            className={styles.presetCard}
            data-active={isActive || undefined}
            type="button"
            onClick={() => onPick(preset.id)}
          >
            <span
              className={styles.presetPreview}
              style={{ background: surface.ground }}
            >
              <span
                className={styles.presetTile}
                data-preset-preview={preset.id}
                style={{
                  background: surface.card,
                  boxShadow: elevationPresetCss(
                    preset.id,
                    scale,
                    palettes,
                    mode,
                  ),
                }}
              />
            </span>
            <span className={styles.presetText}>
              <span className={styles.presetName}>
                {preset.name}
                {isActive ? (
                  <Check aria-hidden="true" className={styles.presetCheck} />
                ) : null}
              </span>
              <span className={styles.presetDescription}>
                {preset.description}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
