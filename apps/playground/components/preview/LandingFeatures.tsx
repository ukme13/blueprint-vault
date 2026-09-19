import type { ReactNode } from "react";
import { landingCardSlots, type LandingCardComponent } from "@blueprint/ui";
import {
  InspectableButton,
  InspectableSlot,
  slot,
  type LandingSectionProps,
} from "./Inspectable";
import { SplitFitArt, SplitSupportArt } from "./LandingArt";
import styles from "./landing.module.css";

function FeatureCard({
  titleId,
  bodyId,
  heading,
  landing,
  system,
  onInspect,
}: LandingSectionProps & {
  titleId: string;
  bodyId: string;
  heading: "h3" | "h4";
}) {
  if (!slot(landing, titleId) && !slot(landing, bodyId)) return null;
  return (
    <article className={styles.card}>
      <InspectableSlot
        as={heading}
        document={landing}
        id={titleId}
        system={system}
        onInspect={onInspect}
      />
      <InspectableSlot
        as="p"
        document={landing}
        id={bodyId}
        system={system}
        onInspect={onInspect}
      />
    </article>
  );
}

function CardBand({
  titleId,
  leadId,
  component,
  heading,
  columns,
  landing,
  system,
  onInspect,
}: LandingSectionProps & {
  titleId: string;
  leadId: string;
  component: LandingCardComponent;
  heading: "h3" | "h4";
  columns: "cols3" | "cols4";
}) {
  return (
    <section className={`${styles.wrap} ${styles.section}`}>
      <div className={styles.sectionHead}>
        <InspectableSlot
          as="h2"
          document={landing}
          id={titleId}
          system={system}
          onInspect={onInspect}
        />
        <InspectableSlot
          as="p"
          className={styles.lead}
          document={landing}
          id={leadId}
          system={system}
          onInspect={onInspect}
        />
      </div>
      <div className={`${styles.cols} ${styles[columns]}`}>
        {landingCardSlots(component).map((card) => (
          <FeatureCard
            key={card.titleId}
            bodyId={card.bodyId}
            heading={heading}
            landing={landing}
            system={system}
            titleId={card.titleId}
            onInspect={onInspect}
          />
        ))}
      </div>
    </section>
  );
}

function Split({
  prefix,
  reverse,
  art,
  landing,
  system,
  onInspect,
}: LandingSectionProps & {
  prefix: "a" | "b";
  reverse?: boolean;
  art: ReactNode;
}) {
  return (
    <section
      className={`${styles.wrap} ${styles.section} ${styles.split}${
        reverse ? ` ${styles.splitRev}` : ""
      }`}
    >
      <div className={styles.stack}>
        <InspectableSlot
          as="p"
          className={styles.eyebrow}
          document={landing}
          id={`landing-split-${prefix}-eyebrow`}
          system={system}
          onInspect={onInspect}
        />
        <InspectableSlot
          as="h2"
          document={landing}
          id={`landing-split-${prefix}-title`}
          system={system}
          onInspect={onInspect}
        />
        <InspectableSlot
          as="p"
          className={`${styles.muted} ${styles.measure}`}
          document={landing}
          id={`landing-split-${prefix}-body`}
          system={system}
          onInspect={onInspect}
        />
        {slot(landing, `landing-split-${prefix}-cta`) ? (
          <div className={styles.btnRow}>
            <InspectableButton
              document={landing}
              id={`landing-split-${prefix}-cta`}
              onInspect={onInspect}
            />
          </div>
        ) : null}
      </div>
      <div className={styles.media}>{art}</div>
    </section>
  );
}

export function LandingFeatureCards(props: LandingSectionProps) {
  return (
    <CardBand
      {...props}
      columns="cols3"
      component="feature-card"
      heading="h3"
      leadId="landing-features-lead"
      titleId="landing-features-title"
    />
  );
}

export function LandingSplitA(props: LandingSectionProps) {
  return <Split {...props} art={<SplitFitArt />} prefix="a" />;
}

export function LandingSplitB(props: LandingSectionProps) {
  return <Split {...props} art={<SplitSupportArt />} prefix="b" reverse />;
}

export function LandingQuadCards(props: LandingSectionProps) {
  return (
    <CardBand
      {...props}
      columns="cols4"
      component="quad-card"
      heading="h4"
      leadId="landing-quad-lead"
      titleId="landing-quad-title"
    />
  );
}

export function LandingFeatures(props: LandingSectionProps) {
  return (
    <>
      <LandingFeatureCards {...props} />
      <LandingSplitA {...props} />
      <LandingSplitB {...props} />
      <LandingQuadCards {...props} />
    </>
  );
}
