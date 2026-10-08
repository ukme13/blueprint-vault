import { spacingSpecimen, type SpacingScale } from "@blueprint/ui";
import styles from "./overview.module.css";

/** The spacing scale as bars, each as long as its step is against the largest. */
export function OverviewSpacingSpecimen({ scale }: { scale: SpacingScale }) {
  const steps = spacingSpecimen(scale);
  const longest = Math.max(...steps.map((step) => step.px), 1);
  return (
    <section
      aria-label="Spacing"
      className={styles.card}
      data-specimen="spacing"
    >
      <header className={styles.specimenHeader}>
        <h3 className={styles.specimenTitle}>Spacing</h3>
        <span className={styles.specimenMeta}>
          Base unit: {scale.baseUnitPx}px
        </span>
      </header>
      {steps.length > 0 ? (
        <ul className={styles.spacingList}>
          {steps.map((step) => (
            <li
              key={step.step}
              className={styles.spacingRow}
              data-spacing-step={step.name}
            >
              <span className={styles.spacingName}>{step.name}</span>
              <span className={styles.spacingTrack}>
                <span
                  className={styles.spacingBar}
                  style={{ width: `${(step.px / longest) * 100}%` }}
                />
              </span>
              <span className={styles.spacingSize}>{step.px}px</span>
            </li>
          ))}
        </ul>
      ) : (
        <span className={styles.specimenMeta}>No spacing steps</span>
      )}
    </section>
  );
}
