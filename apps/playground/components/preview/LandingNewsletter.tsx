import {
  InspectableButton,
  InspectableSlot,
  type LandingSectionProps,
} from "./Inspectable";
import styles from "./landing.module.css";

/**
 * A newsletter sign-up under the CTA.
 *
 * The one input on the page, so Input radius has something to show: the
 * field takes --radius-input, the Subscribe button inside it takes Button
 * radius, and the two can be told apart. The form does nothing on submit;
 * this is a preview of a page, not a working list.
 */
export function LandingNewsletter({
  landing,
  system,
  onInspect,
}: LandingSectionProps) {
  return (
    <section
      className={`${styles.wrap} ${styles.section} ${styles.newsletter}`}
    >
      <div className={styles.stack}>
        <InspectableSlot
          as="p"
          className={styles.eyebrow}
          document={landing}
          id="landing-newsletter-eyebrow"
          system={system}
          onInspect={onInspect}
        />
        <InspectableSlot
          as="h2"
          document={landing}
          id="landing-newsletter-title"
          system={system}
          onInspect={onInspect}
        />
      </div>
      <div className={styles.stack}>
        <InspectableSlot
          as="p"
          className={styles.lead}
          document={landing}
          id="landing-newsletter-lead"
          system={system}
          onInspect={onInspect}
        />
        <form
          aria-label="Newsletter sign-up"
          className={styles.newsletterForm}
          onSubmit={(event) => event.preventDefault()}
        >
          <input
            aria-label="Email address"
            autoComplete="off"
            className={styles.newsletterInput}
            placeholder="Enter your email"
            type="email"
          />
          <InspectableButton
            document={landing}
            id="landing-newsletter-cta"
            system={system}
            onInspect={onInspect}
          />
        </form>
        <InspectableSlot
          as="p"
          className={styles.small}
          document={landing}
          id="landing-newsletter-note"
          system={system}
          onInspect={onInspect}
        />
      </div>
    </section>
  );
}
