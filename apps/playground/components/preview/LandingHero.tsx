import {
  InspectableSlot,
  InspectableButton,
  type LandingSectionProps,
} from "./Inspectable";
import { HeroArt } from "./LandingArt";
import styles from "./landing.module.css";

export function LandingHero({
  landing,
  system,
  onInspect,
}: LandingSectionProps) {
  return (
    <section className={`${styles.wrap} ${styles.hero}`}>
      <div className={styles.stack}>
        <InspectableSlot
          as="p"
          className={styles.eyebrow}
          document={landing}
          id="landing-hero-eyebrow"
          system={system}
          onInspect={onInspect}
        />
        <InspectableSlot
          as="h1"
          document={landing}
          id="landing-hero-title"
          system={system}
          onInspect={onInspect}
        />
        <InspectableSlot
          as="p"
          className={`${styles.lead} ${styles.measure}`}
          document={landing}
          id="landing-hero-lead"
          system={system}
          onInspect={onInspect}
        />
        <div className={styles.btnRow}>
          <InspectableButton
            document={landing}
            id="landing-hero-cta"
            onInspect={onInspect}
          />
          <InspectableButton
            document={landing}
            id="landing-hero-ghost"
            variant="outlined"
            onInspect={onInspect}
          />
        </div>
        <InspectableSlot
          as="p"
          className={styles.small}
          document={landing}
          id="landing-hero-note"
          system={system}
          onInspect={onInspect}
        />
      </div>
      <div className={styles.media}>
        <HeroArt />
      </div>
    </section>
  );
}
