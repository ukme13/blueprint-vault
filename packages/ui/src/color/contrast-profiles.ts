import type { ColorTrack } from "./types";

/**
 * How strongly a tone's states differ from its fill, and how loud its soft
 * ground and edge are.
 *
 * A tone is a fill and everything a control needs around it: a hovered and a
 * pressed fill, a soft ground, its hover, an edge. The fill is the brand
 * colour; the profile decides the rest. `standard` is what the layer seeded
 * before profiles existed, so a palette that chooses nothing gets exactly the
 * layer it always did.
 */
export type ContrastProfile = "standard" | "high-contrast" | "subtle";

export const CONTRAST_PROFILES: readonly ContrastProfile[] = [
  "standard",
  "high-contrast",
  "subtle",
];

export interface ContrastProfileSpec {
  /** Shown where a profile is chosen. */
  label: string;
  description: string;
  /** Weight steps from the fill, toward the dark end in light mode. */
  hoverStep: number;
  activeStep: number;
  /**
   * The contrast the label on the fill is meant to reach.
   *
   * A target, not a promise. The label is whichever end of the neutral track
   * reads better on the fill, which is already the most contrast the palette
   * can give without moving the fill off the brand colour, and moving it off
   * is the one thing a tone seeded from the brand colour must not do. So the
   * studio reports the target against what was measured rather than bending
   * the fill to meet it.
   */
  onFillContrast: number;
  /** The soft ground's alpha, light then dark, and its hover's. */
  surfaceAlpha: [light: number, dark: number];
  surfaceHoverAlpha: [light: number, dark: number];
  /** The edge, one weight in both modes. */
  borderWeight: number;
}

export const CONTRAST_PROFILE_SPECS: Readonly<
  Record<ContrastProfile, ContrastProfileSpec>
> = {
  standard: {
    label: "Standard",
    description: "Balanced. The label on the fill aims for WCAG AA, 4.5:1.",
    hoverStep: 50,
    activeStep: 100,
    onFillContrast: 4.5,
    surfaceAlpha: [0.12, 0.16],
    surfaceHoverAlpha: [0.18, 0.22],
    /* Measured: the one weight that clears 3:1 on both canvases. */
    borderWeight: 450,
  },
  "high-contrast": {
    label: "High contrast",
    description:
      "Distinct states and a firmer edge. The label aims for WCAG AAA, 7:1.",
    hoverStep: 100,
    activeStep: 150,
    onFillContrast: 7,
    surfaceAlpha: [0.2, 0.24],
    surfaceHoverAlpha: [0.26, 0.3],
    borderWeight: 500,
  },
  subtle: {
    label: "Subtle",
    description:
      "Soft states and a faint edge. The label still aims for AA, 4.5:1.",
    hoverStep: 25,
    activeStep: 50,
    onFillContrast: 4.5,
    surfaceAlpha: [0.08, 0.1],
    surfaceHoverAlpha: [0.14, 0.16],
    /* Fainter than the 3:1 a boundary needs on a light canvas. That is the
       point of the profile, and the report says so. */
    borderWeight: 350,
  },
};

/** The weights a tone's states land on, light then dark. */
export interface ToneWeights {
  fill: [light: number, dark: number];
  hover: [light: number, dark: number];
  active: [light: number, dark: number];
  border: [light: number, dark: number];
}

/** The track's locked source shade, the brand colour as it was measured. */
export function sourceWeight(track: ColorTrack): number | undefined {
  return track.shades.find((shade) => shade.anchorType === "source")?.weight;
}

/** The weight on the track closest to the one asked for. */
function nearest(weights: readonly number[], weight: number): number {
  return weights.reduce((closest, each) =>
    Math.abs(each - weight) < Math.abs(closest - weight) ? each : closest,
  );
}

/**
 * A weight `step` from `from`, in `direction`, and past `after`.
 *
 * Snapped to a weight the track has: the steps are asked for on the 25 grid,
 * and a track with twelve shades has none at 525. "Past `after`" is what keeps
 * hover and active apart when a snap would otherwise land them on the same
 * shade — a subtle hover of +25 and active of +50 both round to 550 on a track
 * that steps by 50, and a pressed state that looks like the hovered one is no
 * state at all.
 *
 * When the ramp runs out in that direction the step turns round rather than
 * stopping at the end. A fill at 950 cannot get darker, and a hover that
 * repeats the fill says nothing.
 */
function stepFrom(
  weights: readonly number[],
  from: number,
  step: number,
  direction: 1 | -1,
  after: number,
): number {
  const beyond = (weight: number, dir: 1 | -1) =>
    dir === 1 ? weight > after : weight < after;
  const pick = (dir: 1 | -1) => {
    const candidates = weights.filter((weight) => beyond(weight, dir));
    return candidates.length === 0
      ? undefined
      : nearest(candidates, from + dir * step);
  };
  return pick(direction) ?? pick(direction === 1 ? -1 : 1) ?? from;
}

/**
 * Where a tone's fill, hover, active and edge sit on a track, per mode.
 *
 * - The light fill is `base`: the brand colour, as locked.
 * - The dark fill is `base` plus `darkOffset`, the distance the tone keeps
 *   between its two fills — a step lighter for most, a step darker for a pale
 *   one like warning.
 * - Hover and active step away from the fill: darker in light mode, lighter
 *   in dark, by the profile's steps.
 * - The edge is the profile's border weight in both modes.
 *
 * Every weight is snapped to one the track has.
 */
export function toneWeights(
  track: ColorTrack,
  base: number,
  darkOffset: number,
  profile: ContrastProfile,
): ToneWeights {
  const spec = CONTRAST_PROFILE_SPECS[profile];
  const weights = track.shades.map((shade) => shade.weight);
  const light = nearest(weights, base);
  const dark = nearest(weights, base + darkOffset);

  const states = (fill: number, direction: 1 | -1) => {
    const hover = stepFrom(weights, fill, spec.hoverStep, direction, fill);
    const active = stepFrom(
      weights,
      fill,
      spec.activeStep,
      hover === fill ? direction : ((hover > fill ? 1 : -1) as 1 | -1),
      hover,
    );
    return { hover, active };
  };
  const inLight = states(light, 1);
  const inDark = states(dark, -1);
  const border = nearest(weights, spec.borderWeight);

  return {
    fill: [light, dark],
    hover: [inLight.hover, inDark.hover],
    active: [inLight.active, inDark.active],
    border: [border, border],
  };
}
