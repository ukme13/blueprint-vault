import {
  describeSemanticPair,
  readBoundary,
  readFocus,
  readTextCheck,
  readTextChoice,
  type ContrastStandard,
  type PreviewAssessment,
} from "@blueprint/ui";
import { AccessibilityRow } from "./AccessibilityRow";
import styles from "./palette-workspace.module.css";

interface PreviewAccessibilityProps {
  assessment: PreviewAssessment;
  /** Whose figures and tiers the rows are worded in. */
  standard: ContrastStandard;
}

/**
 * The WCAG report, always measured on the real palette.
 *
 * The swatches here are deliberately not simulated. Contrast ratios are
 * defined on actual colours, so a number computed on a simulated pair would
 * report a pass the design does not have. The one thing simulation contributes
 * is the semantic-pair warning at the bottom, which is a separate claim and
 * says which deficiency it is about.
 *
 * The page owns the title and the warning total, so this is the grid only.
 */
export function PreviewAccessibility({
  assessment,
  standard,
}: PreviewAccessibilityProps) {
  const {
    shades,
    textChecks,
    textColourChoices,
    nonTextChecks,
    focusCheck,
    semanticPairs,
  } = assessment;

  const focus = readFocus(
    standard,
    shades["focus.ring"]!.hex,
    shades["fg.primary"]!.hex,
    focusCheck,
  );

  return (
    <div className={styles.previewPanel}>
      <section className={styles.accessibilityGrid}>
        <section aria-labelledby="text-contrast-heading">
          <h2 id="text-contrast-heading">Text contrast</h2>
          <p className={styles.accessibilityNote}>
            {standard === "wcag3"
              ? "Reads each foreground and background pair as an APCA Lc: 75 for body text, 60 for large text, 45 for UI."
              : "Checks each foreground and background pair for normal and large text requirements."}
          </p>
          <section className={styles.contrastList}>
            {textChecks.map((check) => {
              const reading = readTextCheck(standard, check);
              return (
                <AccessibilityRow
                  key={check.label}
                  background={check.background}
                  badge={reading.badge}
                  detail={`${check.foreground} on ${check.background}`}
                  foreground={check.foreground}
                  label={check.label}
                  ratioLabel={reading.figure}
                  status={reading.status}
                  summary={reading.summary}
                  simulated={check.simulated}
                  weakensUnder={check.weakensUnder}
                />
              );
            })}
          </section>
        </section>

        <section aria-labelledby="recommendation-heading">
          <h2 id="recommendation-heading">White or dark text</h2>
          <p className={styles.accessibilityNote}>
            Compares white and dark text, then recommends the option with
            stronger contrast.
          </p>
          <section className={styles.contrastList}>
            {textColourChoices.map((check) => {
              const choice = readTextChoice(standard, check);
              return (
                <AccessibilityRow
                  key={check.label}
                  background={check.background}
                  badge={choice.isWhite ? "Use white" : "Use dark"}
                  detail={choice.detail}
                  foreground={choice.colour}
                  label={check.label}
                  ratioLabel={choice.figure}
                  status="pass"
                  summary={`${choice.isWhite ? "White" : "Dark"} text gives stronger contrast.`}
                />
              );
            })}
          </section>
        </section>

        <section aria-labelledby="non-text-heading">
          <h2 id="non-text-heading">Controls and focus</h2>
          <p className={styles.accessibilityNote}>
            {standard === "wcag3"
              ? "Checks Lc 45 for visible boundaries and keyboard focus colours. Decorative surfaces are advisory only."
              : "Checks the 3:1 requirement for visible boundaries and keyboard focus colours. Decorative surfaces are advisory only."}
          </p>
          <section className={styles.contrastList}>
            {nonTextChecks.map((check) => {
              const reading = readBoundary(standard, check);
              return (
                <AccessibilityRow
                  key={check.label}
                  background={check.background}
                  badge={reading.badge}
                  detail={`${check.foreground} against ${check.background}`}
                  foreground={check.foreground}
                  label={check.label}
                  ratioLabel={reading.figure}
                  status={reading.status}
                  summary={reading.summary}
                  simulated={
                    check.countsTowardWarnings ? check.simulated : null
                  }
                  weakensUnder={check.weakensUnder}
                  swatchType="border"
                />
              );
            })}
            <AccessibilityRow
              background={shades["fg.primary"]!.hex}
              badge={focus.badge}
              detail={`${shades["focus.ring"]!.hex} against ${shades["fg.primary"]!.hex}`}
              foreground={shades["focus.ring"]!.hex}
              label="Keyboard focus colour"
              ratioLabel={focus.figure}
              status={focus.status}
              summary={focus.summary}
              swatchType="focus"
            />
          </section>
        </section>

        <section aria-labelledby="similarity-heading">
          <h2 id="similarity-heading">Semantic colour distinction</h2>
          <p className={styles.accessibilityNote}>
            This is perceptual design guidance, not a WCAG pass or fail. Always
            pair status colour with text, an icon, or another cue.
          </p>
          <section className={styles.contrastList}>
            {semanticPairs.map((check) => {
              const collapses = check.collapsesUnder.length > 0;
              return (
                <AccessibilityRow
                  key={check.label}
                  background={check.first.hex}
                  badge={
                    check.result.isTooSimilar
                      ? "Review"
                      : collapses
                        ? "Colour vision"
                        : "Distinct"
                  }
                  detail={`${check.first.hex} and ${check.second.hex}`}
                  foreground={check.second.hex}
                  label={check.label}
                  ratioLabel={`Distance ${(check.result.difference * 100).toFixed(1)}`}
                  status={
                    check.result.isTooSimilar || collapses ? "partial" : "pass"
                  }
                  summary={describeSemanticPair(check)}
                  swatchType="pair"
                />
              );
            })}
          </section>
        </section>
      </section>
    </div>
  );
}
