import type { TypeScaleRatioPreset } from "./types";

export const TYPE_SCALE_RATIO_PRESETS: TypeScaleRatioPreset[] = [
  {
    id: "minor-third",
    name: "Minor Third",
    ratio: 1.2,
    description: "A gentle scale with subtly distinct steps.",
  },
  {
    id: "major-third",
    name: "Major Third",
    ratio: 1.25,
    description: "A balanced, commonly used scale for interfaces.",
  },
  {
    id: "perfect-fourth",
    name: "Perfect Fourth",
    ratio: 1.333,
    description: "A confident scale with clear size contrast.",
  },
  {
    id: "golden-ratio",
    name: "Golden Ratio",
    ratio: 1.618,
    description: "A dramatic scale, best for editorial or marketing type.",
  },
];
