import { Badge } from "@astryxdesign/core/Badge";
import {
  describeSemanticPair,
  readableText,
  type PreviewAssessment,
} from "@blueprint/ui";
import { AccessibilityRow } from "./AccessibilityRow";
import styles from "./palette-workspace.module.css";

interface PreviewAccessibilityProps {
  assessment: PreviewAssessment;
  isSimulating: boolean;
}

/**
 * The WCAG report, always measured on the real palette.
 *
 * The swatches here are deliberately not simulated. Contrast ratios are
 * defined on actual colours, so a number computed on a simulated pair would
 * report a pass the design does not have. The one thing simulation contributes
 * is the semantic-pair warning at the bottom, which is a separate claim and
 * says which deficiency it is about.
 */
export function PreviewAccessibility({
  assessment,
  isSimulating,
}: PreviewAccessibilityProps) {
  const {
    shades,
    textChecks,
    textColourChoices,
    nonTextChecks,
    focusCheck,
    semanticPairs,
    issueCount,
  } = assessment;

  return (
    <article
      className={`${styles.previewPanel} ${styles.accessibilityPanel}`}
      id="preview-accessibility"
    >
      <header className={styles.accessibilityHeader}>
        <span>
          <h2>Accessibility</h2>
          <p>
            WCAG 2.2 contrast checks for important colour pairs.
            {isSimulating &&
              " Measured on the real palette, not the simulated one."}
          </p>
        </span>
        <Badge
          label={issueCount === 0 ? "No warnings" : `${issueCount} warnings`}
          variant={issueCount === 0 ? "success" : "warning"}
        />
      </header>

      <section className={styles.accessibilityGrid}>
        <section aria-labelledby="text-contrast-heading">
          <h3 id="text-contrast-heading">Text contrast</h3>
          <p className={styles.accessibilityNote}>
            Checks each foreground and background pair for normal and large text
            requirements.
          </p>
          <section className={styles.contrastList}>
            {textChecks.map((check) => (
              <AccessibilityRow
                key={check.label}
                background={check.background}
                badge={
                  check.result.normalText.aaa
                    ? "AAA"
                    : check.result.normalText.aa
                      ? "AA"
                      : check.result.largeText.aa
                        ? "Large AA"
                        : "Fail"
                }
                detail={`${check.foreground} on ${check.background}`}
                foreground={check.foreground}
                label={check.label}
                ratioLabel={`${check.result.ratio.toFixed(1)}:1`}
                status={check.result.status}
                summary={check.result.summary}
                simulated={check.simulated}
                weakensUnder={check.weakensUnder}
              />
            ))}
          </section>
        </section>

        <section aria-labelledby="recommendation-heading">
          <h3 id="recommendation-heading">White or dark text</h3>
          <p className={styles.accessibilityNote}>
            Compares white and dark text, then recommends the option with
            stronger contrast.
          </p>
          <section className={styles.contrastList}>
            {textColourChoices.map((check) => {
              const isWhite = check.recommendation.colour === "#ffffff";
              return (
                <AccessibilityRow
                  key={check.label}
                  background={check.background}
                  badge={isWhite ? "Use white" : "Use dark"}
                  detail={`White ${
                    isWhite
                      ? check.recommendation.ratio.toFixed(1)
                      : check.recommendation.alternativeRatio.toFixed(1)
                  }:1 · Dark ${
                    isWhite
                      ? check.recommendation.alternativeRatio.toFixed(1)
                      : check.recommendation.ratio.toFixed(1)
                  }:1`}
                  foreground={check.recommendation.colour}
                  label={check.label}
                  ratioLabel={`${check.recommendation.ratio.toFixed(1)}:1`}
                  status="pass"
                  summary={`${isWhite ? "White" : "Dark"} text gives stronger contrast.`}
                />
              );
            })}
          </section>
        </section>

        <section aria-labelledby="non-text-heading">
          <h3 id="non-text-heading">Controls and focus</h3>
          <p className={styles.accessibilityNote}>
            Checks the 3:1 requirement for visible boundaries and keyboard focus
            colours. Decorative surfaces are advisory only.
          </p>
          <section className={styles.contrastList}>
            {nonTextChecks.map((check) => (
              <AccessibilityRow
                key={check.label}
                background={check.background}
                badge={
                  check.countsTowardWarnings
                    ? check.result.passes
                      ? "Pass"
                      : "Fail"
                    : "Advisory"
                }
                detail={`${check.foreground} against ${check.background}`}
                foreground={check.foreground}
                label={check.label}
                ratioLabel={`${check.result.ratio.toFixed(1)}:1`}
                status={
                  check.countsTowardWarnings ? check.result.status : "partial"
                }
                summary={
                  check.countsTowardWarnings
                    ? check.result.summary
                    : "Optional design check; increase contrast only when this boundary communicates meaning."
                }
                simulated={check.countsTowardWarnings ? check.simulated : null}
                weakensUnder={check.weakensUnder}
                swatchType="border"
              />
            ))}
            <AccessibilityRow
              background={shades["text.primary"]!.hex}
              badge={focusCheck.status === "pass" ? "Pass" : "Fail"}
              detail={`${shades["focus.ring"]!.hex} against ${shades["text.primary"]!.hex}`}
              foreground={shades["focus.ring"]!.hex}
              label="Keyboard focus colour"
              ratioLabel={`${focusCheck.adjacentContrast.toFixed(1)}:1`}
              status={focusCheck.status}
              summary={focusCheck.summary}
              swatchType="focus"
            />
          </section>
        </section>

        <section aria-labelledby="similarity-heading">
          <h3 id="similarity-heading">Semantic colour distinction</h3>
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
                  foreground={readableText(check.first.hex)}
                  label={check.label}
                  ratioLabel={`Distance ${(check.result.difference * 100).toFixed(1)}`}
                  status={
                    check.result.isTooSimilar || collapses ? "partial" : "pass"
                  }
                  summary={describeSemanticPair(check)}
                  swatchLabel="A/B"
                />
              );
            })}
          </section>
        </section>
      </section>
    </article>
  );
}
