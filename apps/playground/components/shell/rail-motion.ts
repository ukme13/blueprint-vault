import type { CSSProperties } from "react";

/**
 * Rail expand/collapse timings, in milliseconds.
 *
 * The rail animates its width while the expanded chrome cross-fades, and the
 * chrome is unmounted on a timer rather than by a transition end. That splits
 * the motion across CSS and React, so these numbers have to move together.
 * They live here, and both sides read them: `railMotionStyle()` publishes them
 * to the stylesheet as custom properties, and the components import the
 * milliseconds directly for their timers.
 *
 * The invariant is `FADE_MS < UNMOUNT_MS < DURATION_MS`:
 *
 * - `FADE_MS` — the expanded chrome fades out.
 * - `UNMOUNT_MS` — the chrome leaves the tree, just after its fade finishes so
 *   it is already invisible, and well before the width settles so the collapsed
 *   triggers can fade in while the rail is still closing. Shortening this below
 *   `FADE_MS` pops the chrome out mid-fade; lengthening it past `DURATION_MS`
 *   leaves a blank rail.
 * - `DURATION_MS` — the width transition, and how long to wait before focusing
 *   the name field when the rail opens from the collapsed pencil.
 *
 * `assertRailMotion` checks the invariant at module load, so a bad edit fails
 * immediately rather than as a visual glitch nobody connects to this file.
 */
export const RAIL_MOTION = {
  FADE_MS: 180,
  UNMOUNT_MS: 190,
  DURATION_MS: 240,
} as const;

/** Easing for the width transition. Mirrored into CSS beside the duration. */
export const RAIL_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

function assertRailMotion(): void {
  const { FADE_MS, UNMOUNT_MS, DURATION_MS } = RAIL_MOTION;
  if (!(FADE_MS < UNMOUNT_MS && UNMOUNT_MS < DURATION_MS)) {
    throw new Error(
      `Rail motion is out of order: expected FADE_MS < UNMOUNT_MS < DURATION_MS, got ${FADE_MS} < ${UNMOUNT_MS} < ${DURATION_MS}.`,
    );
  }
}

assertRailMotion();

/**
 * The timings as CSS custom properties, for the rail element's `style`.
 *
 * The stylesheet keeps literal fallbacks, so the rail still animates if this
 * is ever dropped; the fallbacks are the defaults, not a second source.
 */
export function railMotionStyle(): CSSProperties {
  return {
    "--rail-duration": `${RAIL_MOTION.DURATION_MS}ms`,
    "--rail-fade": `${RAIL_MOTION.FADE_MS}ms`,
    "--rail-ease": RAIL_EASE,
  } as CSSProperties;
}
