import {
  contrastRatio,
  WCAG_CONTRAST,
  type AccessibilityStatus,
} from "./accessibility";
import { APCA_LC, apcaContrast } from "./apca";
import type { ContrastStandard } from "./palette-view";
import type { PreviewAssessment } from "./preview-assessment";

/**
 * What a pair has to clear, and how each standard words the result.
 *
 * A job is the thing the colours do: body text, large text (a heading), the
 * label of a control, or a UI component and other non-text. Each standard has its own line for each job
 * and its own words for passing it. The sandbox's card and the accessibility
 * report both read these, so they cannot disagree.
 */
export type ContrastJob = "body" | "large" | "label" | "ui";

export interface JobGrade {
  /** The figure as it is shown: `7.4:1`, or `Lc 87`. */
  value: string;
  /** The word beside it: `AAA`, `AA`, `Pass` or `Fail`. */
  grade: string;
  passes: boolean;
}

/**
 * A WCAG 2 ratio against a job: AAA, AA or Fail.
 *
 * Shown cut to one place, not rounded to it: 4.478 reads 4.4:1, under the 4.5
 * it fails, where rounding showed 4.5:1 beside a Fail. WCAG's own rule is that
 * a ratio is not rounded up to reach a line.
 *
 * A label has no relaxed line in WCAG 2, which only lowers it for text of 18pt
 * or 14pt bold, so it is held to body text's.
 */
function gradeRatio(ratio: number, job: ContrastJob): JobGrade {
  const value = `${(Math.floor(ratio * 10 + 1e-9) / 10).toFixed(1)}:1`;
  const [aa, aaa] =
    job === "body" || job === "label"
      ? [WCAG_CONTRAST.normalTextAA, WCAG_CONTRAST.normalTextAAA]
      : job === "large"
        ? [WCAG_CONTRAST.largeTextAA, WCAG_CONTRAST.largeTextAAA]
        : [WCAG_CONTRAST.nonText, Infinity];
  if (ratio >= aaa) return { value, grade: "AAA", passes: true };
  if (ratio >= aa) return { value, grade: "AA", passes: true };
  return { value, grade: "Fail", passes: false };
}

/**
 * An APCA Lc against a job: its size, as it is shown, must reach the job's
 * line.
 *
 * Judged on the figure on screen. Lc 44.8 is shown as Lc 45, and a card that
 * said "Lc 45, Fail" against a line of 45 contradicted itself. APCA's own
 * tables are in whole numbers, so the whole number is the figure.
 *
 * A label, the text of a button or a badge, is short, heavy and set large
 * for its job, so it takes large text's line and not the fluent-reading one
 * body text is held to.
 */
function gradeLc(lc: number, job: ContrastJob): JobGrade {
  const shown = Math.round(Math.abs(lc));
  const line =
    job === "body"
      ? APCA_LC.bodyText
      : job === "large" || job === "label"
        ? APCA_LC.largeText
        : APCA_LC.uiComponent;
  const passes = shown >= line;
  return {
    value: `Lc ${shown}`,
    grade: passes ? "Pass" : "Fail",
    passes,
  };
}

/**
 * How a colour does on a ground, under a standard.
 *
 * `text` is the colour being judged and `ground` what it sits on: APCA depends
 * on which is which, WCAG 2 does not.
 */
export function gradeContrast(
  standard: ContrastStandard,
  job: ContrastJob,
  text: string,
  ground: string,
): JobGrade {
  return standard === "wcag3"
    ? gradeLc(apcaContrast(text, ground), job)
    : gradeRatio(contrastRatio(text, ground), job);
}

/** The tier a size of Lc reaches, as the report words it. */
export type ApcaTier = "Body" | "Large" | "UI" | "Fail";

export function apcaTier(lc: number): ApcaTier {
  const magnitude = Math.abs(lc);
  if (magnitude >= APCA_LC.bodyText) return "Body";
  if (magnitude >= APCA_LC.largeText) return "Large";
  if (magnitude >= APCA_LC.uiComponent) return "UI";
  return "Fail";
}

/**
 * The report's verdict for text, by Lc: body grade is a pass, large and UI
 * grade are partial (fit for a heading or a control, not for reading), and
 * under the UI line it fails.
 */
export function apcaTextStatus(lc: number): AccessibilityStatus {
  const tier = apcaTier(lc);
  if (tier === "Body") return "pass";
  return tier === "Fail" ? "fail" : "partial";
}

/** The Lc of a pair, foreground as the text on its background. */
export function pairLc(pair: {
  foreground: string;
  background: string;
}): number {
  return apcaContrast(pair.foreground, pair.background);
}

/**
 * The warnings the report counts, under a standard.
 *
 * WCAG 2 is the count the assessment already holds. For WCAG 3 the text and
 * boundary checks are judged by Lc instead (text short of body grade, a
 * counted boundary under Lc 45); everything else it counts, the focus colour,
 * the semantic pairs and what simulation weakens, is the same under both.
 */
export function assessmentIssueCount(
  assessment: PreviewAssessment,
  standard: ContrastStandard,
): number {
  if (standard === "wcag2") return assessment.issueCount;

  const wcag2Text = assessment.textChecks.filter(
    (check) => check.result.status !== "pass",
  ).length;
  const wcag2Boundaries = assessment.nonTextChecks.filter(
    (check) => check.countsTowardWarnings && !check.result.passes,
  ).length;
  const apcaText = assessment.textChecks.filter(
    (check) => apcaTextStatus(pairLc(check)) !== "pass",
  ).length;
  const apcaBoundaries = assessment.nonTextChecks.filter(
    (check) =>
      check.countsTowardWarnings &&
      Math.abs(pairLc(check)) < APCA_LC.uiComponent,
  ).length;

  return (
    assessment.issueCount -
    wcag2Text -
    wcag2Boundaries +
    apcaText +
    apcaBoundaries
  );
}
