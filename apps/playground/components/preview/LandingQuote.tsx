import {
  Inspectable,
  InspectableSlot,
  slot,
  type LandingSectionProps,
} from "./Inspectable";
import styles from "./landing.module.css";

export function LandingQuote({
  landing,
  system,
  onInspect,
}: LandingSectionProps) {
  const quote = slot(landing, "landing-quote");

  return (
    <section className={`${styles.quote} ${styles.section}`}>
      <div className={`${styles.wrap} ${styles.quoteGrid}`}>
        {quote ? (
          <Inspectable
            as="blockquote"
            block={quote}
            className={styles.quoteText}
            system={system}
            onInspect={() => onInspect(quote.id)}
          >
            “{quote.text}”
          </Inspectable>
        ) : null}
        <address className={styles.cite}>
          <InspectableSlot
            as="p"
            document={landing}
            id="landing-cite-name"
            system={system}
            onInspect={onInspect}
          />
          <InspectableSlot
            as="p"
            className={styles.small}
            document={landing}
            id="landing-cite-role"
            system={system}
            onInspect={onInspect}
          />
        </address>
      </div>
    </section>
  );
}
