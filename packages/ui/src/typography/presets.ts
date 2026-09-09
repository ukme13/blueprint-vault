import type { TypeScaleRatioPreset } from "./types";

export const TYPE_SCALE_RATIO_PRESETS: TypeScaleRatioPreset[] = [
  {
    id: "minor-second",
    name: "Minor Second",
    ratio: 1.067,
    description: "The tightest common interval; neighbouring steps stay close.",
  },
  {
    id: "major-second",
    name: "Major Second",
    ratio: 1.125,
    description: "A modest step, useful when many sizes have to coexist.",
  },
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
    id: "augmented-fourth",
    name: "Augmented Fourth",
    ratio: 1.414,
    description:
      "The square-root-of-two interval; a visible but not dramatic jump.",
  },
  {
    id: "perfect-fifth",
    name: "Perfect Fifth",
    ratio: 1.5,
    description:
      "A pronounced scale, at the edge of a comfortable interface ramp.",
  },
  {
    id: "golden-ratio",
    name: "Golden Ratio",
    ratio: 1.618,
    description: "A dramatic scale, best for editorial or marketing type.",
  },
];
