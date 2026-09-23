import {
  InspectableSlot,
  InspectableButton,
  type LandingSectionProps,
} from "./Inspectable";
import styles from "./landing.module.css";

export function LandingCta({
  landing,
  system,
  onInspect,
}: LandingSectionProps) {
  return (
    <section className={`${styles.wrap} ${styles.section} ${styles.cta}`}>
      <div className={styles.stack}>
        <InspectableSlot
          as="h2"
          document={landing}
          id="landing-cta-title"
          system={system}
          onInspect={onInspect}
        />
        <InspectableSlot
          as="p"
          className={`${styles.lead} ${styles.measure}`}
          document={landing}
          id="landing-cta-lead"
          system={system}
          onInspect={onInspect}
        />
        <div className={styles.btnRow}>
          <InspectableButton
            document={landing}
            system={system}
            id="landing-cta-primary"
            onInspect={onInspect}
          />
          <InspectableButton
            document={landing}
            system={system}
            id="landing-cta-ghost"
            variant="outlined"
            onInspect={onInspect}
          />
        </div>
        <InspectableSlot
          as="p"
          className={styles.small}
          document={landing}
          id="landing-cta-note"
          system={system}
          onInspect={onInspect}
        />
      </div>
    </section>
  );
}
