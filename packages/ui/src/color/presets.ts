import type { PalettePreset } from "./types";

export const BLUEPRINT_20_PRESET: PalettePreset = {
  id: "blueprint-20",
  name: "Blueprint 20",
  description:
    "Twenty stable tokens from 25 to 950, with a 97.5% lightness highlight.",
  weights: [
    25, 50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700,
    750, 800, 850, 900, 950,
  ],
  lightnessValues: [
    97.5, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50, 45, 40, 35, 30, 25, 20, 15,
    10, 5,
  ],
};
