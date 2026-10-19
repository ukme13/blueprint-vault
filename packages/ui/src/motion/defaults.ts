import { easingToken } from "./easing";
import type {
  CubicBezier,
  DurationToken,
  EasingToken,
  MotionScale,
} from "./types";

/** Five paces, from a press answering the pointer to a page changing. */
export const DEFAULT_DURATIONS: readonly DurationToken[] = [
  { id: "instant", name: "Instant", ms: 100 },
  { id: "fast", name: "Fast", ms: 150 },
  { id: "normal", name: "Normal", ms: 250 },
  { id: "moderate", name: "Moderate", ms: 350 },
  { id: "slow", name: "Slow", ms: 500 },
];

/**
 * Four curves, named for what the thing is doing.
 *
 * `standard` is for something that moves and stays on screen; `decelerate`
 * for something arriving, which starts fast and settles; `accelerate` for
 * something leaving, which starts slow and goes; `emphasized` for a change
 * worth noticing, which overshoots its start and lands softly.
 */
export const DEFAULT_EASINGS: readonly EasingToken[] = [
  easingToken("standard", "Standard", [0.2, 0, 0, 1]),
  easingToken("decelerate", "Decelerate", [0, 0, 0.2, 1]),
  easingToken("accelerate", "Accelerate", [0.3, 0, 1, 1]),
  easingToken("emphasized", "Emphasized", [0.05, 0.7, 0.1, 1]),
];

/**
 * The scale a workspace has until somebody changes it.
 *
 * A fresh copy each time: a caller that edits a token must not edit the
 * defaults every other workspace is built from.
 */
export function defaultMotionScale(): MotionScale {
  return {
    durations: DEFAULT_DURATIONS.map((token) => ({ ...token })),
    easings: DEFAULT_EASINGS.map((token) => ({
      ...token,
      curve: [...token.curve] as CubicBezier,
    })),
  };
}
