"use client";

import type { MotionScale, MotionSpeed } from "@blueprint/ui";
import { DurationSection } from "./DurationSection";
import { EasingSection } from "./EasingSection";
import styles from "./motion-studio.module.css";

/**
 * The settings beside the stage, in Framer's order: how long, then the shape of
 * the movement, with the preview that plays both at the foot.
 */
export function MotionInspector({
  scale,
  selectedDurationId,
  selectedEasingId,
  speed,
  replayKey,
  onSelectDuration,
  onSelectEasing,
  onChange,
}: {
  scale: MotionScale;
  selectedDurationId: string | undefined;
  selectedEasingId: string | undefined;
  speed: MotionSpeed;
  replayKey: number;
  onSelectDuration: (id: string) => void;
  onSelectEasing: (id: string) => void;
  onChange: (scale: MotionScale, editKey: string) => void;
}) {
  /* The token chosen, or the first when it has gone: an undo can take it away. */
  const duration =
    scale.durations.find((token) => token.id === selectedDurationId) ??
    scale.durations[0];
  const easing =
    scale.easings.find((token) => token.id === selectedEasingId) ??
    scale.easings[0];

  return (
    <>
      <header className={styles.inspectorHeader}>Transition</header>
      <DurationSection
        scale={scale}
        token={duration}
        onChange={onChange}
        onSelect={onSelectDuration}
      />
      <EasingSection
        duration={duration}
        easing={easing}
        replayKey={replayKey}
        scale={scale}
        speed={speed}
        onChange={onChange}
        onSelect={onSelectEasing}
      />
    </>
  );
}
