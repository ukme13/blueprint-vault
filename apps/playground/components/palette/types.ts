export interface ActiveShade {
  trackId: string;
  weight: number;
}

export const MIN_SHADE_COUNT = 10;

export type LightnessPattern = "linear" | "ease-in-out" | "custom";

export type TrackProperty = "name" | "seedHex";
