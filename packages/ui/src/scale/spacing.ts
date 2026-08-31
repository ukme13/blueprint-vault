import { ROOT_FONT_SIZE_PX } from "../typography/types";

/**
 * The spacing scale: a base unit, and the multiples of it that ship.
 *
 * Not a ratio. A type scale multiplies, and every spacing scale in real use
 * counts a base unit out linearly and coarsens as it climbs — Astryx's,
 * Tailwind's and Material's all do. Running 4px through a 1.25 ratio gives 4,
 * 5, 6.25, 7.81, and nobody lays out a page on 6.25px.
 *
 * The steps are data rather than a formula, so a scale can carry half steps
 * near the bottom where 2px matters and skip the top where 40 and 44 rarely
 * both earn their place. `generateSpacingSteps` gives somewhere to start; the
 * editor prunes.
 *
 * See docs/roadmap/scale-studio.md.
 */

export const DEFAULT_SPACING_BASE_UNIT_PX = 4;

/**
 * Bounds on the base unit.
 *
 * 4 is the convention, 8 is a real choice for a roomier system, and a dense
 * product may want 2. Below 1 the scale stops being a grid; above 16 a single
 * step is already larger than most gaps.
 */
export const MIN_SPACING_BASE_UNIT_PX = 1;
export const MAX_SPACING_BASE_UNIT_PX = 16;

/** The largest multiple worth offering, so a generated ramp terminates. */
export const MAX_SPACING_STEP = 64;

/**
 * The steps a new scale starts with, already pruned.
 *
 * Halves below 2 because the difference between 2px and 4px is visible on a
 * border or an icon gap; whole numbers to 6 where most layout sits; then 8, 10
 * and 12 for section spacing, which is where a step of 1 stops being a
 * distinction anybody makes.
 *
 * 16 is here because the preview page asked for it — 64px of vertical padding
 * around a page section, which the list stopped short of. That is the whole
 * point of building the page against the scale rather than beside it.
 */
export const DEFAULT_SPACING_STEPS: readonly number[] = [
  0, 0.5, 1, 1.5, 2, 3, 4, 5, 6, 8, 10, 12, 16,
];

export interface SpacingScale {
  /** Every step is this many pixels, times its own multiple. */
  baseUnitPx: number;
  /** Multiples of the base unit, ascending and unique. */
  steps: number[];
}

export function defaultSpacingScale(): SpacingScale {
  return {
    baseUnitPx: DEFAULT_SPACING_BASE_UNIT_PX,
    steps: [...DEFAULT_SPACING_STEPS],
  };
}

/**
 * A step's name in a token: `0.5` becomes `0-5`.
 *
 * A dot is not usable in a custom property, and this is the spelling Astryx
 * already uses for the same scale, so a developer moving between them reads
 * one convention rather than two.
 */
export function spacingStepName(step: number): string {
  return String(step).replace(".", "-");
}

export function spacingVariableName(step: number): string {
  return `--spacing-${spacingStepName(step)}`;
}

export interface SpacingToken {
  step: number;
  name: string;
  variable: string;
  px: number;
  /**
   * The same length in rem, against the browser root rather than the type
   * scale's own base — a page with an 18px base still has 16px rems unless
   * somebody changed the root, and spacing that assumed otherwise would be
   * an eighth too large everywhere.
   */
  rem: number;
}

/** Every step as a token, in order. */
export function resolveSpacing(scale: SpacingScale): SpacingToken[] {
  return scale.steps.map((step) => {
    const px = step * scale.baseUnitPx;
    return {
      step,
      name: spacingStepName(step),
      variable: spacingVariableName(step),
      px,
      /* Rounded to four places, as the typography export does: 6 / 16 is
         0.375 exactly, but 7 / 16 × 3 is not, and a token file full of
         0.4374999999999999 helps nobody. */
      rem: Number((px / ROOT_FONT_SIZE_PX).toFixed(4)),
    };
  });
}

/**
 * A full ramp to prune.
 *
 * Halves below 2, whole numbers above it. This is a starting point offered to
 * the editor, never the stored scale: a scale that regenerated itself would
 * undo every removal the moment the base unit changed.
 */
export function generateSpacingSteps(maxStep = 12): number[] {
  const limit = Math.min(Math.max(Math.floor(maxStep), 1), MAX_SPACING_STEP);
  const halves = [0, 0.5, 1, 1.5];
  const wholes = Array.from({ length: limit - 1 }, (_, at) => at + 2);
  return [...halves, ...wholes].filter((step) => step <= limit);
}

/**
 * Make a scale usable, whatever it arrived as.
 *
 * Read tolerantly rather than rejected: a stored scale with a duplicate step or
 * an unsorted list is somebody's project, and the fix is obvious. A base unit
 * outside the bounds is clamped rather than replaced, so a 20px experiment
 * comes back as 16 rather than as 4.
 */
export function normalizeSpacingScale(scale: SpacingScale): SpacingScale {
  const baseUnitPx = Math.min(
    Math.max(
      Number.isFinite(scale.baseUnitPx)
        ? scale.baseUnitPx
        : DEFAULT_SPACING_BASE_UNIT_PX,
      MIN_SPACING_BASE_UNIT_PX,
    ),
    MAX_SPACING_BASE_UNIT_PX,
  );

  const steps = [
    ...new Set(
      scale.steps.filter(
        (step) =>
          Number.isFinite(step) && step >= 0 && step <= MAX_SPACING_STEP,
      ),
    ),
  ].sort((first, second) => first - second);

  /* A scale with no steps renders nothing and cannot be edited back into
     existence from the UI, so it falls back rather than staying empty. */
  return {
    baseUnitPx,
    steps: steps.length > 0 ? steps : [...DEFAULT_SPACING_STEPS],
  };
}

/**
 * The scale as custom properties.
 *
 * In rem, per the plan: spacing should grow when somebody raises their browser
 * font size, while a 4px corner should not. The px value is kept on the token
 * for anything that has to measure rather than render.
 */
export function spacingCssVariables(
  scale: SpacingScale,
): Record<string, string> {
  return Object.fromEntries(
    resolveSpacing(scale).map((token) => [token.variable, `${token.rem}rem`]),
  );
}
