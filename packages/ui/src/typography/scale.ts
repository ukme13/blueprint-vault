import {
  SEMANTIC_ROLES,
  type RoleAssignment,
  type SemanticRole,
  type TypeScale,
  type TypeScaleInput,
  type TypeStep,
} from "./types";

export const MIN_STEP_COUNT = 3;
export const MAX_STEP_COUNT = 24;
export const MIN_BASE_FONT_SIZE_PX = 8;
export const MAX_BASE_FONT_SIZE_PX = 72;
export const MIN_RATIO = 1.05;
export const MAX_RATIO = 2;

const ROLE_ORDER_SMALL_TO_LARGE: SemanticRole[] = [...SEMANTIC_ROLES].reverse();

const ROLE_STEP_OFFSET: Record<SemanticRole, number> = {
  caption: -2,
  label: -1,
  body: 0,
  title: 1,
  heading: 3,
  display: 5,
};

const DEFAULT_ROLE_STYLE: Record<
  SemanticRole,
  { fontWeight: number; lineHeight: number; letterSpacingPx: number }
> = {
  display: { fontWeight: 700, lineHeight: 1.1, letterSpacingPx: -0.5 },
  heading: { fontWeight: 700, lineHeight: 1.2, letterSpacingPx: -0.25 },
  title: { fontWeight: 600, lineHeight: 1.3, letterSpacingPx: 0 },
  body: { fontWeight: 400, lineHeight: 1.5, letterSpacingPx: 0 },
  label: { fontWeight: 500, lineHeight: 1.4, letterSpacingPx: 0.1 },
  caption: { fontWeight: 400, lineHeight: 1.4, letterSpacingPx: 0.2 },
};

function assertStepCount(stepCount: number): void {
  if (
    !Number.isInteger(stepCount) ||
    stepCount < MIN_STEP_COUNT ||
    stepCount > MAX_STEP_COUNT
  ) {
    throw new RangeError(
      `Step count must be an integer from ${MIN_STEP_COUNT} to ${MAX_STEP_COUNT}.`,
    );
  }
}

function assertBaseFontSize(baseFontSizePx: number): void {
  if (
    !Number.isFinite(baseFontSizePx) ||
    baseFontSizePx < MIN_BASE_FONT_SIZE_PX ||
    baseFontSizePx > MAX_BASE_FONT_SIZE_PX
  ) {
    throw new RangeError(
      `Base font size must be between ${MIN_BASE_FONT_SIZE_PX} and ${MAX_BASE_FONT_SIZE_PX}px.`,
    );
  }
}

function assertRatio(ratio: number): void {
  if (!Number.isFinite(ratio) || ratio < MIN_RATIO || ratio > MAX_RATIO) {
    throw new RangeError(
      `Scale ratio must be between ${MIN_RATIO} and ${MAX_RATIO}.`,
    );
  }
}

/** Steps generated below base. Everything past that goes up. */
export const STEPS_BELOW_BASE = 2;

/**
 * Smallest size the scale will generate, and the only odd one.
 *
 * 12 is often too heavy for the smallest caption and 10 too small to read, so 11
 * earns its exception. It sits below the validation's 12px body minimum on
 * purpose: 11 is for captions, and body text landing there should still fail.
 */
export const MIN_GENERATED_FONT_SIZE_PX = 11;

/**
 * Round a size to an even number of pixels, never below the floor.
 *
 * A tie resolves to whichever candidate divides by four — 25 becomes 24, not 26.
 * That is unambiguous by construction, since exactly one of any two consecutive
 * even numbers divides by four, and it pulls the scale toward the 4px grid most
 * component work already sits on.
 */
export function roundToEvenPx(fontSizePx: number): number {
  const lower = Math.floor(fontSizePx / 2) * 2;
  const upper = lower + 2;
  const toLower = fontSizePx - lower;
  const toUpper = upper - fontSizePx;

  let rounded: number;
  if (toLower < toUpper) rounded = lower;
  else if (toUpper < toLower) rounded = upper;
  else rounded = lower % 4 === 0 ? lower : upper;

  return Math.max(rounded, MIN_GENERATED_FONT_SIZE_PX);
}

export function generateTypeSteps(
  baseFontSizePx: number,
  ratio: number,
  stepCount: number,
): TypeStep[] {
  assertBaseFontSize(baseFontSizePx);
  assertRatio(ratio);
  assertStepCount(stepCount);

  /* Two steps below base, the rest above. A type scale needs a little room
     under body for captions and labels, and a lot above it for headings —
     centring the ramp spent half of it on sizes nobody sets. */
  const baseIndex = Math.min(STEPS_BELOW_BASE, stepCount - 1);

  return Array.from({ length: stepCount }, (_, index) => {
    const exactFontSizePx = baseFontSizePx * Math.pow(ratio, index - baseIndex);
    return {
      step: index,
      offset: index - baseIndex,
      /* Rounded at generation, so the preview, the role table and the export
         can never disagree about a size. */
      fontSizePx: roundToEvenPx(exactFontSizePx),
      exactFontSizePx,
      isBase: index === baseIndex,
    };
  });
}

export function assignDefaultRoles(steps: TypeStep[]): RoleAssignment[] {
  const baseStep = steps.find((step) => step.isBase) ?? steps[0]!;
  const lastIndex = steps.length - 1;

  return ROLE_ORDER_SMALL_TO_LARGE.map((role) => {
    const targetStep = Math.min(
      lastIndex,
      Math.max(0, baseStep.step + ROLE_STEP_OFFSET[role]),
    );
    const style = DEFAULT_ROLE_STYLE[role];

    return {
      role,
      step: targetStep,
      fontWeight: style.fontWeight,
      lineHeight: style.lineHeight,
      letterSpacingPx: style.letterSpacingPx,
    };
  });
}

export function generateTypeScale(input: TypeScaleInput): TypeScale {
  const steps = generateTypeSteps(
    input.baseFontSizePx,
    input.ratio,
    input.stepCount,
  );

  return {
    fontFamily: input.fontFamily,
    baseFontSizePx: input.baseFontSizePx,
    ratio: input.ratio,
    steps,
    roles: assignDefaultRoles(steps),
  };
}
