import {
  InspectableButton,
  InspectableSlot,
  slot,
  type LandingSectionProps,
} from "./Inspectable";
import styles from "./landing.module.css";

function Plan({
  n,
  featured,
  landing,
  system,
  onInspect,
}: LandingSectionProps & { n: 1 | 2 | 3; featured?: boolean }) {
  const features = ([1, 2, 3] as const)
    .map((feature) => `landing-plan-${n}-f${feature}`)
    .filter((id) => slot(landing, id));

  return (
    <div
      className={`${styles.plan}${featured ? ` ${styles.planFeatured}` : ""}`}
    >
      <InspectableSlot
        as="h4"
        document={landing}
        id={`landing-plan-${n}-name`}
        system={system}
        onInspect={onInspect}
      />
      <InspectableSlot
        as="p"
        className={styles.small}
        document={landing}
        id={`landing-plan-${n}-blurb`}
        system={system}
        onInspect={onInspect}
      />
      <div className={styles.priceRow}>
        <InspectableSlot
          as="p"
          document={landing}
          id={`landing-plan-${n}-price`}
          system={system}
          onInspect={onInspect}
        />
        <InspectableSlot
          as="p"
          className={styles.muted}
          document={landing}
          id={`landing-plan-${n}-unit`}
          system={system}
          onInspect={onInspect}
        />
      </div>
      {features.length > 0 ? (
        <ul className={styles.features}>
          {features.map((id) => (
            <li key={id}>
              <InspectableSlot
                as="p"
                document={landing}
                id={id}
                system={system}
                onInspect={onInspect}
              />
            </li>
          ))}
        </ul>
      ) : null}
      <InspectableButton
        document={landing}
        system={system}
        id={`landing-plan-${n}-cta`}
        invert={featured}
        variant={featured ? "contained" : "outlined"}
        onInspect={onInspect}
      />
    </div>
  );
}

export function LandingPricing(props: LandingSectionProps) {
  return (
    <section className={`${styles.wrap} ${styles.section}`}>
      <div className={styles.sectionHead}>
        <InspectableSlot
          as="h2"
          document={props.landing}
          id="landing-pricing-title"
          system={props.system}
          onInspect={props.onInspect}
        />
        <InspectableSlot
          as="p"
          className={styles.lead}
          document={props.landing}
          id="landing-pricing-lead"
          system={props.system}
          onInspect={props.onInspect}
        />
      </div>
      <div className={`${styles.cols} ${styles.cols3}`}>
        <Plan {...props} n={1} />
        <Plan {...props} featured n={2} />
        <Plan {...props} n={3} />
      </div>
    </section>
  );
}
