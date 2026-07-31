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
}

export interface ColorTrack {
  id: string;
  name: string;
  seedHex: string;
  shades: ShadeItem[];
}

export type ColorTrackInput = Omit<ColorTrack, "shades">;

export interface PalettePreset {
  id: string;
  name: string;
  description: string;
  weights: number[];
  lightnessValues: number[];
}
