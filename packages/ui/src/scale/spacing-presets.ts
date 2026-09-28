import {
  DEFAULT_SPACING_DENSITY,
  normalizeSpacingScale,
  type SpacingScale,
} from "./spacing";

/**
 * Spacing grids to start from, rather than pruning sixteen step chips by
 * hand. A preset sets the base unit and which steps the scale keeps, and
 * puts density back to 1 so its steps are the sizes it names; density can
 * be moved again afterwards without leaving the preset.
 */

export type SpacingPresetId = "8pt" | "4pt-compact" | "tailwind" | "spacious";

export interface SpacingPreset {
  id: SpacingPresetId;
  name: string;
  description: string;
  baseUnitPx: number;
  /** Multiples of the base unit, ascending. */
  steps: readonly number[];
}

export const SPACING_PRESETS: readonly SpacingPreset[] = [
  {
    id: "8pt",
    name: "8pt Standard Grid",
    description: "The universal 8pt grid with 4px half-step for UI components.",
    baseUnitPx: 8,
    steps: [0, 0.5, 1, 2, 3, 4, 6, 8, 12],
  },
  {
    id: "4pt-compact",
    name: "4pt Compact Grid",
    description: "Tight 4px grid for information-dense dashboards and tables.",
    baseUnitPx: 4,
    steps: [0, 0.5, 1, 1.5, 2, 3, 4, 5, 6, 8],
  },
  {
    id: "tailwind",
    name: "Tailwind v4 Harmonized",
    description: "Full stepped ramp matching Tailwind CSS utility classes.",
    baseUnitPx: 4,
    steps: [0, 0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10, 12, 16],
  },
  {
    id: "spacious",
    name: "Spacious / Editorial",
    description:
      "Roomy, generous spacing for editorial reading and marketing pages.",
    baseUnitPx: 8,
    steps: [0, 1, 2, 4, 6, 8, 12, 16],
  },
];

/** The scale a preset gives: its base unit and steps, at density 1. */
export function applySpacingPreset(
  scale: SpacingScale,
  presetId: SpacingPresetId,
): SpacingScale {
  const preset = SPACING_PRESETS.find((each) => each.id === presetId);
  if (!preset) return scale;
  return normalizeSpacingScale({
    ...scale,
    baseUnitPx: preset.baseUnitPx,
    density: DEFAULT_SPACING_DENSITY,
    steps: [...preset.steps],
  });
}

/**
 * The preset a scale is, or null — Custom — once its base unit or its kept
 * steps differ from every preset, as matchingElevationPreset answers. Density is not compared: it is the scale's
 * dial for how roomy the layout steps feel, and moving it keeps the grid.
 */
export function matchingSpacingPreset(
  scale: SpacingScale,
): SpacingPresetId | null {
  const kept = [...new Set(scale.steps)].sort((a, b) => a - b);
  const match = SPACING_PRESETS.find(
    (preset) =>
      preset.baseUnitPx === scale.baseUnitPx &&
      preset.steps.length === kept.length &&
      preset.steps.every((step, index) => step === kept[index]),
  );
  return match?.id ?? null;
}
