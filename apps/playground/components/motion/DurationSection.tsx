"use client";

import { NumberInput } from "@astryxdesign/core/NumberInput";
import { Slider } from "@astryxdesign/core/Slider";
import {
  setDurationMs,
  type DurationToken,
  type MotionScale,
} from "@blueprint/ui";
import { SheetSelector } from "../SheetSelector";
import styles from "./motion-studio.module.css";

/** The slider's reach. A token past it is still set by the field. */
const SLIDER_MAX_MS = 1000;
const STEP_MS = 25;

/**
 * The Duration section: which token, and how long, as a slider to feel it and a
 * field to say it, both writing the same number. One edit key per token, so a
 * drag or a run of typing is one step in the history.
 */
export function DurationSection({
  scale,
  token,
  onSelect,
  onChange,
}: {
  scale: MotionScale;
  token: DurationToken | undefined;
  onSelect: (id: string) => void;
  onChange: (scale: MotionScale, editKey: string) => void;
}) {
  if (!token) {
    return (
      <section aria-label="Duration" className={styles.settingGroup}>
        <h2>Duration</h2>
        <p className={styles.settingHint}>This scale has no durations.</p>
      </section>
    );
  }
  const set = (ms: number) =>
    onChange(setDurationMs(scale, token.id, ms), `motion:duration:${token.id}`);

  return (
    <section aria-label="Duration" className={styles.settingGroup}>
      <h2>Duration</h2>
      <SheetSelector
        label="Duration token"
        options={scale.durations.map((each) => ({
          label: `${each.name} · ${each.ms}ms`,
          value: each.id,
        }))}
        size="md"
        value={token.id}
        onChange={(value) => onSelect(value as string)}
      />
      <span className={styles.durationRow}>
        <Slider
          formatValue={(value) => `${value}ms`}
          isLabelHidden
          label={`${token.name} duration`}
          max={Math.max(SLIDER_MAX_MS, token.ms)}
          min={0}
          step={STEP_MS}
          value={token.ms}
          valueDisplay="none"
          width="100%"
          onChange={(value: number) => set(value)}
        />
        <NumberInput
          hasNumberSteppers
          isIntegerOnly
          isLabelHidden
          label={`${token.name} duration in milliseconds`}
          max={10_000}
          min={0}
          size="md"
          step={STEP_MS}
          units="ms"
          value={token.ms}
          width={120}
          onChange={set}
        />
      </span>
    </section>
  );
}
