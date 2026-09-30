import { formatLetterSpacing } from "./export";
import {
  fontFamilyValue,
  letterSpacingEmSizePx,
  letterSpacingPxOnDevice,
  resolveLineHeight,
  resolveRoleSizePx,
  type TypeFont,
  type TypeRole,
  type TypeSystem,
} from "./system";
import type { TypeStep } from "./types";
import {
  assessBodyFontSize,
  assessLineHeight,
  assessRoleWeights,
  assessScaleGrowth,
  assessStepCount,
  type TypographyStatus,
} from "./validation";

/** One check the studio runs over a type system, named so its row keeps its
    identity as others come and go with the scale. */
export interface TypeScaleWarning {
  id:
    | "body-size"
    | "line-height"
    | "scale-growth"
    | "step-count"
    | "role-weights";
  status: TypographyStatus;
  summary: string;
}

/** The role the body checks judge: `body` itself, or the first in its group. */
export function bodyRoleOf(system: TypeSystem): TypeRole | undefined {
  return (
    system.roles.find((role) => role.id === "body") ??
    system.roles.find((role) => role.groupId === "body")
  );
}

/**
 * Every check on a system as it renders on one device.
 *
 * `steps` are that device's steps, so the body is judged at the size it has
 * there. `specimenText` decides the line-height threshold: Thai marks need
 * more room than Latin, and this is the copy being judged. A check with
 * nothing to judge (no body role) is left out rather than passed.
 */
export function assessTypeSystem(
  system: TypeSystem,
  steps: TypeStep[],
  deviceId: string,
  specimenText: string,
): TypeScaleWarning[] {
  const body = bodyRoleOf(system);
  const bodySizePx = body
    ? resolveRoleSizePx(system, steps, body, deviceId)
    : null;

  const checks: [
    TypeScaleWarning["id"],
    { status: TypographyStatus; summary: string } | null,
  ][] = [
    ["body-size", bodySizePx === null ? null : assessBodyFontSize(bodySizePx)],
    [
      "line-height",
      body && bodySizePx !== null
        ? /* The resolved ratio: the thresholds are ratios, and the config is
             an intent rather than a number. */
          assessLineHeight(
            resolveLineHeight(body, bodySizePx, deviceId, system)
              .computedLineHeightRatio,
            specimenText,
          )
        : null,
    ],
    ["scale-growth", assessScaleGrowth(system.ratio)],
    ["step-count", assessStepCount(system.stepCount)],
    [
      "role-weights",
      assessRoleWeights(
        system.roles.map((role) => ({
          role: role.id,
          fontWeight: role.fontWeight,
        })),
      ),
    ],
  ];

  return checks.flatMap(([id, result]) =>
    result ? [{ id, status: result.status, summary: result.summary }] : [],
  );
}

/** The warnings worth acting on: a pass ran and found nothing, not news. */
export function openTypeScaleWarnings(
  warnings: TypeScaleWarning[],
): TypeScaleWarning[] {
  return warnings.filter((warning) => warning.status !== "pass");
}

/** The CSS a role renders with; a subset of React's CSSProperties. */
export interface RoleStyle {
  fontFamily: string;
  fontSize: string;
  fontWeight: number;
  lineHeight: number;
  letterSpacing: string;
  textTransform: TypeRole["textTransform"];
}

/**
 * A role's resolved CSS on one device, so a template never does scale maths.
 *
 * Sizes stay in px: this is a rendered preview, not exported output. The
 * letter-spacing is the exported em, measured against the desktop size, so
 * tracking scales with the previewed size the way the file will.
 */
export function roleStyleOnDevice(
  system: TypeSystem,
  steps: TypeStep[],
  desktopSteps: TypeStep[],
  role: TypeRole,
  deviceId: string,
): RoleStyle {
  const fontSizePx = resolveRoleSizePx(system, steps, role, deviceId);
  const desktopSizePx = resolveRoleSizePx(
    system,
    desktopSteps,
    role,
    "desktop",
  );
  return {
    fontFamily: fontFamilyValue(system, role),
    fontSize: `${fontSizePx}px`,
    fontWeight: role.fontWeight,
    lineHeight: resolveLineHeight(role, fontSizePx, deviceId, system)
      .computedLineHeightRatio,
    letterSpacing: formatLetterSpacing(
      letterSpacingPxOnDevice(role, deviceId),
      letterSpacingEmSizePx(role, fontSizePx, desktopSizePx, deviceId),
    ),
    textTransform: role.textTransform,
  };
}

/**
 * The font entry the step list renders in: the one chosen, else whatever
 * body uses, since that is the size people read most, else the first. Falls
 * through when the chosen entry has since been removed.
 */
export function previewFontFor(
  system: TypeSystem,
  chosenId: string | null,
): TypeFont | undefined {
  return (
    system.fonts.find((font) => font.id === chosenId) ??
    system.fonts.find(
      (font) =>
        font.id === system.roles.find((role) => role.id === "body")?.fontId,
    ) ??
    system.fonts[0]
  );
}

/**
 * The weight to preview in, from those the family actually ships: the one
 * chosen while the family still has it, else 400, else its first. A family
 * the catalogue does not know previews at 400.
 */
export function previewWeightFor(
  weights: readonly number[],
  chosen: number | null,
): number {
  if (chosen !== null && weights.includes(chosen)) return chosen;
  return weights.find((weight) => weight === 400) ?? weights[0] ?? 400;
}

/**
 * The roles in the order the Groups panel shows them: each group in
 * `system.groups` order, its roles in the order they are defined, as they
 * sit in the group's card. A role whose group no longer exists goes last,
 * in definition order, rather than dropping out of the specimen.
 */
export function rolesInGroupOrder(system: TypeSystem): TypeRole[] {
  const groupIds = new Set(system.groups.map((group) => group.id));
  return [
    ...system.groups.flatMap((group) =>
      system.roles.filter((role) => role.groupId === group.id),
    ),
    ...system.roles.filter((role) => !groupIds.has(role.groupId)),
  ];
}
