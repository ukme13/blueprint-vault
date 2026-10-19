import type { DurationToken, EasingToken, MotionScale } from "./types";

/*
 * Which token each moment on the stage is played with.
 *
 * A system names its paces its own way: Carbon has `fast-01` and `moderate-02`,
 * Primer three and no more. So a moment asks for a pace by what it is (a press,
 * a panel opening, a dialog) and gets the token of that name where the scale has
 * one, and else the token at the same place in the ramp.
 */

export type StageMoment = "press" | "panel" | "dialog";

/** The id each moment looks for first. */
const PREFERRED: Record<StageMoment, string> = {
  press: "fast",
  panel: "normal",
  dialog: "moderate",
};

/** How far along the ramp each moment sits when its name is not there. */
const RAMP_POSITION: Record<StageMoment, number> = {
  press: 0.25,
  panel: 0.5,
  dialog: 0.75,
};

export function stageDuration(
  scale: MotionScale,
  moment: StageMoment,
): DurationToken | null {
  const { durations } = scale;
  if (durations.length === 0) return null;
  const named = durations.find((token) => token.id === PREFERRED[moment]);
  if (named) return named;
  const at = Math.round(RAMP_POSITION[moment] * (durations.length - 1));
  return durations[at] ?? null;
}

/** The curve the stage plays with: `standard`, or the first the scale has. */
export function stageEasing(scale: MotionScale): EasingToken | null {
  return (
    scale.easings.find((token) => token.id === "standard") ??
    scale.easings[0] ??
    null
  );
}
