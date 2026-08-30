import {
  WCAG_CONTRAST,
  assessTextContrastAtSize,
  type AccessibilityStatus,
} from "../color/accessibility";
import {
  assessPreview,
  selectPreviewShades,
  type PreviewAssessment,
  type SemanticPairCheck,
} from "../color/preview-assessment";
import type { ColorTrack } from "../color/types";
import {
  COLOUR_VISION_DEFICIENCIES,
  colourVisionLabel,
  describeColourVisionMethod,
} from "../color/vision";
import { generateTypeSteps } from "../typography/scale";
import { resolveRoleSizePx, type TypeSystem } from "../typography/system";

/*
 * One accessibility report for a workspace.
 *
 * Combines what the preview already measures with the colour-vision warnings,
 * and covers the type scale as well as the palette — the contrast assessment
 * has taken a size and weight since the Thai line-height work, so a verdict
 * that names the size it was made at is worth more than one that does not.
 *
 * This assembles; it computes nothing new. Every number here comes from a
 * function that is tested where it lives.
 *
 * See docs/roadmap/colour-vision-simulation.md.
 */

/** The WCAG version the thresholds in `accessibility.ts` are taken from. */
export const REPORT_WCAG_VERSION = "WCAG 2.2";

export interface ReportMethod {
  wcagVersion: string;
  /** Named per deficiency, including the severity each was simulated at. */
  colourVision: Array<{
    deficiency: string;
    name: string;
    citation: string;
    severity: number;
  }>;
  /**
   * What simulation is and is not.
   *
   * Stated in the report rather than only in the docs, because the report is
   * the part that leaves this workspace and gets read by somebody who never
   * saw the roadmap.
   */
  note: string;
}

export interface ReportTypographyRole {
  id: string;
  name: string;
  /**
   * The families the role names, never the file behind them.
   *
   * A report is a document, not a payload: an uploaded font lives in
   * IndexedDB under its entry id and must never travel with one. The export
   * guard holds that up for these two formatters as it does for every other.
   */
  fontFamilies: string[];
  fontSizePx: number;
  fontWeight: number;
  isLargeText: boolean;
  ratio: number;
  requiredAA: number;
  status: AccessibilityStatus;
  summary: string;
}

export interface ReportTypography {
  systemName: string;
  /** The pair every role is measured against, and where it came from. */
  foreground: string;
  background: string;
  roles: ReportTypographyRole[];
  failing: number;
}

export interface AccessibilityReport {
  projectName: string;
  /** Omitted unless the caller supplies one; see `buildAccessibilityReport`. */
  generatedAt?: string;
  method: ReportMethod;
  colour: PreviewAssessment;
  typography: ReportTypography | null;
}

export interface AccessibilityReportInput {
  projectName: string;
  palettes: ColorTrack[];
  typography?: TypeSystem | null;
  /**
   * When the report was made, if the caller wants it recorded.
   *
   * Not defaulted to "now". A report built during render must be a pure
   * function of its inputs, or the preview in the export dialog and the file
   * that gets downloaded disagree about a value nobody can see — which is
   * exactly the kind of mismatch that has bitten this workspace before. The
   * caller supplies a timestamp deliberately or the report has none, and the
   * method is what makes it traceable either way.
   */
  generatedAt?: string;
}

const SIMULATION_NOTE =
  "Colour-vision results are design guidance, not a WCAG requirement. Simulation shows how colours may be perceived; it does not change any token value, and no exported token is simulated.";

function reportMethod(): ReportMethod {
  return {
    wcagVersion: REPORT_WCAG_VERSION,
    colourVision: COLOUR_VISION_DEFICIENCIES.map((deficiency) => {
      const method = describeColourVisionMethod(deficiency);
      return { deficiency, ...method };
    }),
    note: SIMULATION_NOTE,
  };
}

/**
 * Every role in the scale, measured at the size the scale gives it.
 *
 * Body text on the light neutral surface, because that is the pair the palette
 * preview already calls "Body text" and the one a page of prose actually uses.
 * Naming the pair in the report matters more than choosing a different one:
 * a ratio without its two colours cannot be checked.
 */
function reportTypography(
  system: TypeSystem,
  foreground: string,
  background: string,
): ReportTypography {
  const steps = generateTypeSteps(
    system.baseFontSizePx,
    system.ratio,
    system.stepCount,
  );

  const roles = system.roles.map((role) => {
    const fontSizePx = resolveRoleSizePx(system, steps, role);
    const font = system.fonts.find((entry) => entry.id === role.fontId);
    const result = assessTextContrastAtSize(
      foreground,
      background,
      fontSizePx,
      role.fontWeight,
    );

    return {
      id: role.id,
      name: role.name,
      fontFamilies: font ? [...font.families] : [],
      fontSizePx,
      fontWeight: role.fontWeight,
      isLargeText: result.isLargeText,
      ratio: result.ratio,
      requiredAA: result.requiredAA,
      status: result.status,
      summary: result.summary,
    };
  });

  return {
    systemName: system.name,
    foreground,
    background,
    roles,
    failing: roles.filter((role) => role.status !== "pass").length,
  };
}

export function buildAccessibilityReport(
  input: AccessibilityReportInput,
): AccessibilityReport | null {
  const shades = selectPreviewShades(input.palettes);
  if (!shades) return null;

  const colour = assessPreview(shades);

  return {
    projectName: input.projectName,
    ...(input.generatedAt ? { generatedAt: input.generatedAt } : {}),
    method: reportMethod(),
    colour,
    typography: input.typography
      ? reportTypography(
          input.typography,
          shades.neutralDark.hex,
          shades.neutralLight.hex,
        )
      : null,
  };
}

export function formatAccessibilityReportJson(
  report: AccessibilityReport,
): string {
  return `${JSON.stringify(report, null, 2)}\n`;
}

function verdict(status: AccessibilityStatus): string {
  if (status === "pass") return "Pass";
  if (status === "partial") return "Review";
  return "Fail";
}

function pairRow(check: SemanticPairCheck): string {
  const under =
    check.collapsesUnder.length === 0
      ? "—"
      : check.collapsesUnder.map(colourVisionLabel).join(", ");
  const state = check.result.isTooSimilar
    ? "Too similar"
    : check.collapsesUnder.length > 0
      ? "Collapses"
      : "Distinct";

  return `| ${check.label} | ${check.first.hex} / ${check.second.hex} | ${(check.result.difference * 100).toFixed(1)} | ${state} | ${under} |`;
}

export function formatAccessibilityReportMarkdown(
  report: AccessibilityReport,
): string {
  const { colour, typography, method } = report;
  const lines: string[] = [];

  lines.push(`# Accessibility report — ${report.projectName}`);
  lines.push("");
  if (report.generatedAt) lines.push(`Generated ${report.generatedAt}.`);
  lines.push(
    `Contrast measured against ${method.wcagVersion}. ${colour.issueCount === 0 ? "No warnings." : `${colour.issueCount} warning${colour.issueCount === 1 ? "" : "s"}.`}`,
  );
  lines.push("");
  lines.push(`> ${method.note}`);
  lines.push("");

  lines.push("## Text contrast");
  lines.push("");
  lines.push("| Pair | Foreground | Background | Ratio | Result |");
  lines.push("| --- | --- | --- | --- | --- |");
  for (const check of colour.textChecks) {
    lines.push(
      `| ${check.label} | ${check.foreground} | ${check.background} | ${check.result.ratio.toFixed(2)}:1 | ${verdict(check.result.status)} |`,
    );
  }
  lines.push("");

  lines.push("## Controls and focus");
  lines.push("");
  lines.push("| Element | Colours | Ratio | Required | Result |");
  lines.push("| --- | --- | --- | --- | --- |");
  for (const check of colour.nonTextChecks) {
    lines.push(
      `| ${check.label} | ${check.foreground} on ${check.background} | ${check.result.ratio.toFixed(2)}:1 | ${WCAG_CONTRAST.nonText}:1 | ${check.countsTowardWarnings ? verdict(check.result.status) : "Advisory"} |`,
    );
  }
  lines.push(
    `| Keyboard focus | ${colour.shades.primaryFocus.hex} on ${colour.shades.neutralDark.hex} | ${colour.focusCheck.adjacentContrast.toFixed(2)}:1 | ${WCAG_CONTRAST.focusIndicator}:1 | ${verdict(colour.focusCheck.status)} |`,
  );
  lines.push("");

  lines.push("## Colour vision");
  lines.push("");
  lines.push(
    "Semantic pairs compared in OKLab, under normal vision and under each simulated deficiency.",
  );
  lines.push("");
  lines.push("| Pair | Colours | Distance | State | Collapses under |");
  lines.push("| --- | --- | --- | --- | --- |");
  for (const check of colour.semanticPairs) lines.push(pairRow(check));
  lines.push("");

  if (typography) {
    lines.push("## Typography");
    lines.push("");
    lines.push(
      `Every role in "${typography.systemName}" measured at the size the scale gives it, using ${typography.foreground} on ${typography.background}.`,
    );
    lines.push("");
    lines.push(
      "| Role | Font | Size | Weight | WCAG size | Ratio | Required | Result |",
    );
    lines.push("| --- | --- | --- | --- | --- | --- | --- | --- |");
    for (const role of typography.roles) {
      lines.push(
        `| ${role.name} | ${role.fontFamilies.join(", ") || "—"} | ${role.fontSizePx.toFixed(1)}px | ${role.fontWeight} | ${role.isLargeText ? "Large" : "Normal"} | ${role.ratio.toFixed(2)}:1 | ${role.requiredAA}:1 | ${verdict(role.status)} |`,
      );
    }
    lines.push("");
  }

  lines.push("## Method");
  lines.push("");
  lines.push(`- Contrast: ${method.wcagVersion}.`);
  for (const entry of method.colourVision) {
    lines.push(
      `- ${entry.name} at severity ${entry.severity}: ${entry.citation}.`,
    );
  }
  lines.push("");

  return lines.join("\n");
}
