import { defaultLayoutTokens, type LayoutToken } from "./layout-tokens";
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

/**
 * Where a layout use points, frame by frame: the steps it names are steps the
 * preset keeps.
 */
export type SpacingPresetLayout = Readonly<
  Record<string, Readonly<Record<string, string>>>
>;

export interface SpacingPreset {
  id: SpacingPresetId;
  name: string;
  description: string;
  baseUnitPx: number;
  /** Multiples of the base unit, ascending. */
  steps: readonly number[];
  /**
   * Layout uses the preset points at steps of its own.
   *
   * A use is bound by the name of a step, and a step is a multiple of the base
   * unit, so a preset with a bigger unit doubles every use that is left on the
   * same name. The page's chrome, the navigation bar, is the part that should
   * not follow: it is bound here to the steps that give it the size it has on
   * the 4px grid, or the nearest the preset keeps.
   */
  layout?: SpacingPresetLayout;
}

export const SPACING_PRESETS: readonly SpacingPreset[] = [
  {
    id: "8pt",
    name: "8pt Standard Grid",
    description: "The universal 8pt grid with 4px half-step for UI components.",
    baseUnitPx: 8,
    steps: [0, 0.5, 1, 2, 3, 4, 6, 8, 12],
    /* 16px of bar padding, and 8, 16 and 24px between links: as on 4px. */
    layout: {
      "inset-nav-y": { phone: "2", tablet: "2", desktop: "2" },
      "gap-nav": { phone: "1", tablet: "2", desktop: "3" },
    },
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
    /* No step 3 here: 24px between links is 16 or 32, and the roomier. */
    layout: {
      "inset-nav-y": { phone: "2", tablet: "2", desktop: "2" },
      "gap-nav": { phone: "1", tablet: "2", desktop: "4" },
    },
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

/** The uses any preset binds: a preset that does not names them back to the default. */
const PRESET_LAYOUT_USE_IDS: readonly string[] = [
  ...new Set(
    SPACING_PRESETS.flatMap((preset) => Object.keys(preset.layout ?? {})),
  ),
];

/**
 * The layout uses a preset gives, put onto a list of them: the ones it names
 * point where it says, and the ones some other preset names but it does not go
 * back to the default, so the grid it replaces leaves nothing behind. A use no
 * preset names, and a frame a preset does not mention, is left as it was.
 */
export function applySpacingPresetLayout(
  layout: readonly LayoutToken[],
  presetId: SpacingPresetId,
): LayoutToken[] {
  const preset = SPACING_PRESETS.find((each) => each.id === presetId);
  if (!preset) return [...layout];
  const defaults = defaultLayoutTokens();
  return layout.map((token) => {
    if (!PRESET_LAYOUT_USE_IDS.includes(token.id)) return token;
    const given =
      preset.layout?.[token.id] ??
      defaults.find((each) => each.id === token.id)?.byDevice;
    return given
      ? { ...token, byDevice: { ...token.byDevice, ...given } }
      : token;
  });
}

/** A scale and the layout, as one preset gives them: one edit, so one undo. */
export function applySpacingPresetWithLayout(
  scale: SpacingScale,
  layout: readonly LayoutToken[],
  presetId: SpacingPresetId,
): { spacing: SpacingScale; layout: LayoutToken[] } {
  return {
    spacing: applySpacingPreset(scale, presetId),
    layout: applySpacingPresetLayout(layout, presetId),
  };
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
