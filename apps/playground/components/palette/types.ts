export interface ActiveShade {
  trackId: string;
  weight: number;
}

export type LightnessPattern = "linear" | "ease-in-out" | "custom";

export type TrackProperty = "name" | "seedHex";
