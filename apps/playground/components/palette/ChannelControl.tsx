"use client";

import type { CSSProperties } from "react";
import styles from "./palette-workspace.module.css";

export interface ChannelControlProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  gradient?: string;
  hasOutOfGamut?: boolean;
  thumbColour?: string;
  onChange: (value: number) => void;
}

export function ChannelControl({
  label,
  value,
  min,
  max,
  step,
  gradient,
  hasOutOfGamut,
  thumbColour,
  onChange,
}: ChannelControlProps) {
  return (
    <label className={styles.colourChannel}>
      <span>{label}</span>
      <input
        aria-label={`${label} value`}
        max={max}
        min={min}
        step={step}
        type="number"
        value={Number(value.toFixed(step < 0.01 ? 3 : step < 1 ? 2 : 0))}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <input
        aria-label={`${label} slider`}
        data-has-out-of-gamut={hasOutOfGamut || undefined}
        max={max}
        min={min}
        step={step}
        style={
          {
            background: gradient,
            "--slider-thumb-colour": thumbColour,
          } as CSSProperties
        }
        type="range"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}
