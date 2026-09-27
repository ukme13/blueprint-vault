"use client";

import { useState } from "react";
import {
  ArrowDownToLine,
  Contrast,
  Feather,
  Maximize2,
  Moon,
  MoveDiagonal,
  MoveVertical,
  Sparkles,
  Sun,
  SunMedium,
  type LucideIcon,
} from "lucide-react";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@astryxdesign/core/SegmentedControl";
import {
  ELEVATION_ADJUSTMENTS,
  levelAdjustmentDefault,
  readLevelAdjustmentValues,
  tuneElevationLevel,
  type ColourMode,
  type ElevationAdjustment,
  type ElevationAdjustmentStyle,
  type ElevationLevel,
  type ElevationScale,
} from "@blueprint/ui";
import { useThemeMode } from "../../app/theme-provider";
import { ElevationSliderRow } from "./ElevationSliderRow";
import styles from "./scale-workspace.module.css";

interface ElevationAdjustmentsProps {
  scale: ElevationScale;
  level: ElevationLevel;
  onChange: (scale: ElevationScale, editKey?: string) => void;
}

/** Each slider's icon and name. Distance moves straight down for a shadow,
    diagonally for Neumorphic, whose shadow and highlight sit on a diagonal. */
const ROW: Record<ElevationAdjustment, { icon: LucideIcon; label: string }> = {
  distance: { icon: MoveVertical, label: "Distance" },
  softness: { icon: Feather, label: "Softness" },
  spread: { icon: Maximize2, label: "Spread" },
  opacity: { icon: Contrast, label: "Opacity" },
  depth: { icon: ArrowDownToLine, label: "Depth" },
  highlight: { icon: Sun, label: "Highlight" },
  shadow: { icon: Moon, label: "Shadow" },
  radius: { icon: Sparkles, label: "Radius" },
  intensity: { icon: SunMedium, label: "Intensity" },
};

function rowFor(style: ElevationAdjustmentStyle, key: ElevationAdjustment) {
  return style === "neumorphic" && key === "distance"
    ? { icon: MoveDiagonal, label: "Distance" }
    : ROW[key];
}

/**
 * Simple's adjustments for the selected level, laid out like Lightroom's
 * Develop panel: a Light / Dark switch, then one slider row per adjustment
 * for this kind of shadow — Standard and Subtle card, Inset, Neumorphic or
 * Glow. Geometry is shared by both modes; the strengths are the mode's.
 *
 * A stack of no preset's shape gets nothing here; it is edited in Advanced.
 */
export function ElevationAdjustments({
  scale,
  level,
  onChange,
}: ElevationAdjustmentsProps) {
  /* Starts on the mode the studio is showing, the one being looked at. */
  const { resolved } = useThemeMode();
  const [mode, setMode] = useState<ColourMode>(resolved);
  const read = readLevelAdjustmentValues(level, mode);
  if (!read) return null;

  return (
    <div
      aria-label={`${level.name} adjustments`}
      className={styles.settingSubgroup}
      role="group"
    >
      <SegmentedControl
        label="Adjust for mode"
        layout="fill"
        size="md"
        value={mode}
        onChange={(value) => setMode(value as ColourMode)}
      >
        <SegmentedControlItem
          icon={<Sun aria-hidden="true" />}
          label="Light"
          value="light"
        />
        <SegmentedControlItem
          icon={<Moon aria-hidden="true" />}
          label="Dark"
          value="dark"
        />
      </SegmentedControl>
      <div className={styles.sliderStack}>
        {ELEVATION_ADJUSTMENTS[read.style].map((range) => {
          const { icon, label } = rowFor(read.style, range.key);
          /* Where this level started: its preset's value, or a seeded
             level's own seed. */
          const initial = levelAdjustmentDefault(level, range.key, mode);
          return (
            <ElevationSliderRow
              key={range.key}
              format={(value) =>
                range.unit === "%"
                  ? `${Math.round(value * 100)}%`
                  : `${value}px`
              }
              icon={icon}
              label={label}
              max={range.max}
              min={range.min}
              step={range.step}
              value={read.values[range.key] ?? range.min}
              onChange={(value) =>
                onChange(
                  tuneElevationLevel(scale, level.id, range.key, value, mode),
                  /* One step in history per drag, not one per value. */
                  `elevation:adjust:${level.id}:${range.key}:${mode}`,
                )
              }
              defaultValue={initial}
              onReset={() => {
                /* A reset is its own step in history, not part of a drag. */
                if (initial !== undefined) {
                  onChange(
                    tuneElevationLevel(
                      scale,
                      level.id,
                      range.key,
                      initial,
                      mode,
                    ),
                  );
                }
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
