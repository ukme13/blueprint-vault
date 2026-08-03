import type { RoleAssignment } from "./types";

export const TYPOGRAPHY_THRESHOLDS = {
  minRecommendedBodyFontSizePx: 16,
  minBodyFontSizePx: 12,
  minLineHeight: 1.2,
  minLineHeightFail: 1.1,
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

export interface LineHeightResult {
  lineHeight: number;
  status: TypographyStatus;
  summary: string;
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

export function assessLineHeight(lineHeight: number): LineHeightResult {
  if (lineHeight < TYPOGRAPHY_THRESHOLDS.minLineHeightFail) {
    return {
      lineHeight,
      status: "fail",
      summary: `A line height of ${lineHeight} is too tight and will crowd wrapped lines.`,
    };
  }

  if (lineHeight < TYPOGRAPHY_THRESHOLDS.minLineHeight) {
    return {
      lineHeight,
      status: "warn",
      summary: `A line height of ${lineHeight} is below the recommended ${TYPOGRAPHY_THRESHOLDS.minLineHeight} minimum.`,
    };
  }

  return {
    lineHeight,
    status: "pass",
    summary: "Line height gives wrapped lines enough room.",
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

export function assessRoleWeights(roles: RoleAssignment[]): RoleWeightsResult {
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
