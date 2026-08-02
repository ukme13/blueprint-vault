export type Rgb = [number, number, number];
export type Oklch = [number, number, number];

export type DistributionMode =
  | "linear"
  | "ease-in-out"
  | "ease-in"
  | "ease-out"
  | "custom";

export interface ShadeItem {
  weight: number;
  L: number;
  C: number;
  H: number;
  hex: string;
  isAnchor: boolean;
  isOverridden: boolean;
  anchorType: "source" | "custom" | null;
}

export interface TrackAdjustments {
  anchors: Record<number, string>;
  manualOverrides: Record<number, string>;
}

export interface ColorTrack {
  id: string;
  name: string;
  seedHex: string;
  adjustments: TrackAdjustments;
  shades: ShadeItem[];
}

export interface ColorTrackInput {
  id: string;
  name: string;
  seedHex: string;
  adjustments?: TrackAdjustments;
}

export interface PalettePreset {
  id: string;
  name: string;
  description: string;
  weights: number[];
  lightnessValues: number[];
}
