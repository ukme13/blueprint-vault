"use client";

import type { LucideIcon } from "lucide-react";
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
  /** Put the slider back where its preset starts. */
  onReset: () => void;
}

/**
 * One adjustment, the way Lightroom's Develop panel lays one out: an icon,
 * a name, the track, and the value at the end of the row, all on one 32px
 * line so a stack of them reads as a column of numbers. Double-clicking the
 * name puts the slider back where its preset starts, as Lightroom does.
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
  onReset,
}: ElevationSliderRowProps) {
  return (
    <div className={styles.sliderRow} data-adjustment-row="">
      {/* Double-clicking the name resets the slider, as in Lightroom. */}
      <span
        aria-hidden="true"
        className={styles.sliderRowName}
        data-reset=""
        title={`Double-click to reset ${label}`}
        onDoubleClick={onReset}
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
    </div>
  );
}
