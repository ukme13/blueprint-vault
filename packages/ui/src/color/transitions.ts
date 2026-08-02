import type { ShadeItem } from "./types";

export type TrackTransitionWarningCode =
  | "lightness-order"
  | "hue-jump"
  | "manual-jump";

export interface TrackTransitionWarning {
  code: TrackTransitionWarningCode;
  message: string;
  weights: number[];
}

const LARGE_HUE_CHANGE = 75;
const MIN_MEANINGFUL_CHROMA = 0.04;
const MANUAL_JUMP_DISTANCE = 0.08;

interface OklabPoint {
  L: number;
  a: number;
  b: number;
}

function toOklab(shade: ShadeItem): OklabPoint {
  const hue = shade.H * (Math.PI / 180);
  return {
    L: shade.L,
    a: shade.C * Math.cos(hue),
    b: shade.C * Math.sin(hue),
  };
}

function distance(first: OklabPoint, second: OklabPoint): number {
  return Math.hypot(first.L - second.L, first.a - second.a, first.b - second.b);
}

function hueDistance(first: number, second: number): number {
  const difference = Math.abs(first - second) % 360;
  return Math.min(difference, 360 - difference);
}

export function assessTrackTransitions(
  shades: ShadeItem[],
): TrackTransitionWarning[] {
  const warnings: TrackTransitionWarning[] = [];

  const brokenLightnessIndex = shades.findIndex(
    (shade, index) => index > 0 && shade.L >= shades[index - 1]!.L,
  );
  if (brokenLightnessIndex > 0) {
    const previous = shades[brokenLightnessIndex - 1]!;
    const current = shades[brokenLightnessIndex]!;
    warnings.push({
      code: "lightness-order",
      message: `Shade ${current.weight} is not darker than ${previous.weight}.`,
      weights: [previous.weight, current.weight],
    });
  }

  const anchors = shades.filter((shade) => shade.anchorType !== null);
  const hueJumpIndex = anchors.findIndex((anchor, index) => {
    if (index === 0) return false;
    const previous = anchors[index - 1]!;
    return (
      Math.min(previous.C, anchor.C) >= MIN_MEANINGFUL_CHROMA &&
      hueDistance(previous.H, anchor.H) > LARGE_HUE_CHANGE
    );
  });
  if (hueJumpIndex > 0) {
    const previous = anchors[hueJumpIndex - 1]!;
    const current = anchors[hueJumpIndex]!;
    warnings.push({
      code: "hue-jump",
      message: `Anchors ${previous.weight} and ${current.weight} have a large hue change.`,
      weights: [previous.weight, current.weight],
    });
  }

  const unevenManualShade = shades.find((shade, index) => {
    if (!shade.isOverridden) return false;

    const previous = shades[index - 1];
    const next = shades[index + 1];
    if (!previous && !next) return false;

    const neighbours = [previous, next].filter(
      (item): item is ShadeItem => item !== undefined,
    );
    const neighbourPoints = neighbours.map(toOklab);
    const expected = neighbourPoints.reduce(
      (result, point) => ({
        L: result.L + point.L / neighbourPoints.length,
        a: result.a + point.a / neighbourPoints.length,
        b: result.b + point.b / neighbourPoints.length,
      }),
      { L: 0, a: 0, b: 0 },
    );

    return distance(toOklab(shade), expected) > MANUAL_JUMP_DISTANCE;
  });
  if (unevenManualShade) {
    warnings.push({
      code: "manual-jump",
      message: `Manual shade ${unevenManualShade.weight} creates an uneven transition.`,
      weights: [unevenManualShade.weight],
    });
  }

  return warnings;
}
