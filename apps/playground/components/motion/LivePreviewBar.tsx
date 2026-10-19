"use client";

import { useEffect, useState } from "react";
import styles from "./motion-studio.module.css";

/** How long the indicator rests at each end before it goes back, in ms. */
const REST_MS = 450;

/** Whether the person has asked their system for less motion. */
function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * The live preview: a pill track and an indicator that slides across it and
 * back, in the duration and on the curve being edited, so a change is felt as
 * it is made. It runs on its own; Replay starts it from the beginning.
 *
 * With reduced motion asked for it does not run by itself, and moves only when
 * the track is pressed.
 */
export function LivePreviewBar({
  durationMs,
  easingCss,
  replayKey,
}: {
  /** The duration as it is played, at the speed chosen. */
  durationMs: number;
  easingCss: string;
  replayKey: number;
}) {
  const [isAtEnd, setIsAtEnd] = useState(false);
  const isReduced = prefersReducedMotion();

  /* One lap is the trip there and the rest at the end; the next is the trip
     back. Restarted when the pace, the curve or a replay changes, so the new
     one is seen from its start rather than waited for. */
  useEffect(() => {
    if (isReduced) return;
    const start = window.setTimeout(() => setIsAtEnd(false), 0);
    const first = window.setTimeout(() => setIsAtEnd(true), 80);
    const loop = window.setInterval(
      () => setIsAtEnd((end) => !end),
      durationMs + REST_MS,
    );
    return () => {
      window.clearTimeout(start);
      window.clearTimeout(first);
      window.clearInterval(loop);
    };
  }, [durationMs, easingCss, replayKey, isReduced]);

  return (
    <button
      aria-label="Live preview. Press to play"
      className={styles.runnerTrack}
      data-at-end={isAtEnd || undefined}
      type="button"
      onClick={() => setIsAtEnd((end) => !end)}
    >
      <span
        aria-hidden="true"
        className={styles.runnerIndicator}
        style={{
          transitionDuration: `${durationMs}ms`,
          transitionTimingFunction: easingCss,
        }}
      />
    </button>
  );
}
