"use client";

import { RotateCcw, type LucideIcon } from "lucide-react";
import { IconButton } from "@astryxdesign/core/IconButton";
import { Slider } from "@astryxdesign/core/Slider";
import styles from "./scale-workspace.module.css";

interface ElevationSliderRowProps {
  icon: LucideIcon;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  /** How the value reads at the end of the row: "12px", "35%". */
  format: (value: number) => string;
  onChange: (value: number) => void;
  /** Where the slider's preset starts it; undefined when there is none. */
  defaultValue: number | undefined;
  /** Put the slider back at `defaultValue`. */
  onReset: () => void;
}

/**
 * One adjustment, the way Lightroom's Develop panel lays one out: an icon,
 * a name, the track, and the value at the end of the row, all on one 32px
 * line so a stack of them reads as a column of numbers. Once a slider has
 * moved, a reset button at the end of its row puts it back where its preset
 * starts; double-clicking the name does too, as in Lightroom.
 */
export function ElevationSliderRow({
  icon: Icon,
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
  defaultValue,
  onReset,
}: ElevationSliderRowProps) {
  const canReset = defaultValue !== undefined && value !== defaultValue;
  return (
    <div className={styles.sliderRow} data-adjustment-row="">
      {/* Double-clicking the name resets the slider too, as in Lightroom;
          the button at the end of the row is the way anyone finds. */}
      <span
        aria-hidden="true"
        className={styles.sliderRowName}
        data-reset=""
        title={canReset ? `Double-click to reset ${label}` : undefined}
        onDoubleClick={canReset ? onReset : undefined}
      >
        <Icon className={styles.sliderRowIcon} />
        <span className={styles.sliderRowLabel}>{label}</span>
      </span>
      <Slider
        formatValue={format}
        isLabelHidden
        label={label}
        max={max}
        min={min}
        step={step}
        value={value}
        valueDisplay="none"
        width="100%"
        onChange={(next: number) => onChange(next)}
      />
      <output aria-hidden="true" className={styles.sliderRowValue}>
        {format(value)}
      </output>
      {/* Only once the slider has moved, so an untouched panel stays quiet;
          its column is always there, so the row does not shift when it
          appears. */}
      <span className={styles.sliderRowReset}>
        {canReset ? (
          <IconButton
            icon={<RotateCcw aria-hidden="true" />}
            label={`Reset ${label}`}
            size="sm"
            tooltip={`Reset to ${format(defaultValue)}`}
            variant="ghost"
            onClick={onReset}
          />
        ) : null}
      </span>
    </div>
  );
}
