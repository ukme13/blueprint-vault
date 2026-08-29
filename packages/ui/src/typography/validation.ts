export const TYPOGRAPHY_THRESHOLDS = {
  minRecommendedBodyFontSizePx: 16,
  minBodyFontSizePx: 12,
  minLineHeight: 1.2,
  minLineHeightFail: 1.1,
  /* Thai stacks vowels and tone marks above the line and vowels below it, so
     a leading that is comfortable for Latin closes the gap those marks need
     and they collide with the line above. */
  minLineHeightThai: 1.4,
  minLineHeightThaiFail: 1.25,
  maxRecommendedRatio: 1.5,
  maxRecommendedStepCount: 12,
  minFontWeight: 100,
  maxFontWeight: 900,
} as const;

export type TypographyStatus = "pass" | "warn" | "fail";

export interface BodyFontSizeResult {
  fontSizePx: number;
  status: TypographyStatus;
  summary: string;
}

/** A writing system whose line-height needs differ from Latin. */
export type TypographyScript = "thai";

export interface LineHeightResult {
  lineHeight: number;
  status: TypographyStatus;
  summary: string;
  /** The script that raised the minimum, or null when Latin rules applied. */
  script: TypographyScript | null;
  /** The minimum that was actually applied, which the script decides. */
  minLineHeight: number;
}

export interface ScaleGrowthResult {
  ratio: number;
  status: TypographyStatus;
  summary: string;
}

export interface StepCountResult {
  stepCount: number;
  status: TypographyStatus;
  summary: string;
}

/**
 * What this check needs of a role, which is less than a role carries.
 *
 * Deliberately not RoleAssignment: that types `role` as a SemanticRole, and a
 * system can name its roles anything since groups arrived — h1, body-2. The
 * name is only ever read back out into a message, so a string is the truth.
 */
export interface RoleWeightCheck {
  role: string;
  fontWeight: number;
}

export interface RoleWeightsResult {
  invalidRoles: string[];
  status: TypographyStatus;
  summary: string;
}

export function assessBodyFontSize(fontSizePx: number): BodyFontSizeResult {
  if (fontSizePx < TYPOGRAPHY_THRESHOLDS.minBodyFontSizePx) {
    return {
      fontSizePx,
      status: "fail",
      summary: `Body text at ${fontSizePx}px is too small to read comfortably.`,
    };
  }

  if (fontSizePx < TYPOGRAPHY_THRESHOLDS.minRecommendedBodyFontSizePx) {
    return {
      fontSizePx,
      status: "warn",
      summary: `Body text at ${fontSizePx}px is below the recommended ${TYPOGRAPHY_THRESHOLDS.minRecommendedBodyFontSizePx}px minimum.`,
    };
  }

  return {
    fontSizePx,
    status: "pass",
    summary: "Body text size is comfortable to read.",
  };
}

/** Whether a string contains Thai, by the Unicode block the script occupies. */
export function hasThaiScript(text: string): boolean {
  return /[฀-๿]/.test(text);
}

/**
 * The line-height check, against the script the specimen is actually written in.
 *
 * Latin needs less room than the studio's own guidance assumes of Thai, so one
 * threshold was never both. The specimen text decides, because that is the copy
 * the person is judging the scale with — and mixed text takes the stricter of
 * the two, since the marks still have to fit.
 */
export function assessLineHeight(
  lineHeight: number,
  specimenText = "",
): LineHeightResult {
  const thai = hasThaiScript(specimenText);
  const script: TypographyScript | null = thai ? "thai" : null;
  const minLineHeight = thai
    ? TYPOGRAPHY_THRESHOLDS.minLineHeightThai
    : TYPOGRAPHY_THRESHOLDS.minLineHeight;
  const failBelow = thai
    ? TYPOGRAPHY_THRESHOLDS.minLineHeightThaiFail
    : TYPOGRAPHY_THRESHOLDS.minLineHeightFail;

  /* The script is named in every message it changed, so the advice can be
     acted on rather than just obeyed. */
  if (lineHeight < failBelow) {
    return {
      lineHeight,
      script,
      minLineHeight,
      status: "fail",
      summary: thai
        ? `A line height of ${lineHeight} is too tight for Thai, whose tone marks and vowels stack above and below the line.`
        : `A line height of ${lineHeight} is too tight and will crowd wrapped lines.`,
    };
  }

  if (lineHeight < minLineHeight) {
    return {
      lineHeight,
      script,
      minLineHeight,
      status: "warn",
      summary: thai
        ? `A line height of ${lineHeight} is below the ${minLineHeight} Thai needs for its marks to clear the line above.`
        : `A line height of ${lineHeight} is below the recommended ${minLineHeight} minimum.`,
    };
  }

  return {
    lineHeight,
    script,
    minLineHeight,
    status: "pass",
    summary: thai
      ? "Line height gives Thai marks room to clear the line above."
      : "Line height gives wrapped lines enough room.",
  };
}

export function assessScaleGrowth(ratio: number): ScaleGrowthResult {
  if (ratio > TYPOGRAPHY_THRESHOLDS.maxRecommendedRatio) {
    return {
      ratio,
      status: "warn",
      summary: `A ratio of ${ratio} grows quickly; neighbouring steps may feel disconnected.`,
    };
  }

  return {
    ratio,
    status: "pass",
    summary: "Scale ratio grows at a comfortable pace between steps.",
  };
}

export function assessStepCount(stepCount: number): StepCountResult {
  if (stepCount > TYPOGRAPHY_THRESHOLDS.maxRecommendedStepCount) {
    return {
      stepCount,
      status: "warn",
      summary: `${stepCount} steps is a lot of sizes to keep consistent across a product.`,
    };
  }

  return {
    stepCount,
    status: "pass",
    summary: "Step count stays easy to manage.",
  };
}

export function assessRoleWeights(roles: RoleWeightCheck[]): RoleWeightsResult {
  const invalidRoles = roles
    .filter(
      (role) =>
        !Number.isFinite(role.fontWeight) ||
        role.fontWeight < TYPOGRAPHY_THRESHOLDS.minFontWeight ||
        role.fontWeight > TYPOGRAPHY_THRESHOLDS.maxFontWeight,
    )
    .map((role) => role.role);

  if (invalidRoles.length > 0) {
    return {
      invalidRoles,
      status: "fail",
      summary: `Missing or invalid font weight for: ${invalidRoles.join(", ")}.`,
    };
  }

  return {
    invalidRoles,
    status: "pass",
    summary: "Every semantic role has a valid font weight.",
  };
}
