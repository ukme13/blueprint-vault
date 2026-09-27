"use client";

import type { ReactNode } from "react";
import { Check, ShieldCheck } from "lucide-react";
import { BlueprintWordmark, Button } from "@blueprint/ui";
import styles from "./scale-workspace.module.css";

/**
 * What the spacing preview's two cards say: an onboarding welcome and a
 * profile form, the kind of UI a spacing scale is really for. Each card is
 * a list of blocks; the preview puts the Stack gap between every two.
 *
 * Content only — the tile owns the spacing. Inputs are drawn, not live: the
 * preview is looked at, not filled in.
 */

function Field({ label, value }: { label: string; value: string }) {
  return (
    <span className={styles.sampleField}>
      <span className={styles.sampleFieldLabel}>{label}</span>
      <span className={styles.sampleFieldInput}>{value}</span>
    </span>
  );
}

export const WELCOME_CARD: { title: string; blocks: ReactNode[] } = {
  title: "Welcome",
  blocks: [
    <BlueprintWordmark
      key="brand"
      aria-hidden={false}
      aria-label="Blueprint"
      className={styles.sampleLogo}
      role="img"
    />,
    <p key="greeting" className={styles.sampleGreeting}>
      Hi there,
    </p>,
    <h3 key="headline" className={styles.sampleHeadline}>
      Let’s get you settled in.
    </h3>,
    <p key="one" className={styles.sampleBody}>
      Your workspace is ready. We’ve set up a palette, a type scale and a
      spacing grid, so every screen you build starts on the same rhythm.
    </p>,
    <p key="two" className={styles.sampleBody}>
      Invite your team when you’re ready — they’ll see the same tokens, and a
      change in one place reaches every component.
    </p>,
    <span key="action">
      <Button scheme="primary" size="medium" type="button" variant="contained">
        Verify & Enter Workspace
      </Button>
    </span>,
    <span key="note" className={styles.sampleNote}>
      <ShieldCheck aria-hidden="true" />
      Your data is encrypted and never shared.
    </span>,
  ],
};

export const PROFILE_CARD: { title: string; blocks: ReactNode[] } = {
  title: "Your profile",
  blocks: [
    <h3 key="title" className={styles.sampleCardTitle}>
      Your profile
    </h3>,
    <Field key="name" label="Full name" value="Ada Lovelace" />,
    <Field key="email" label="Work email" value="ada@blueprint.dev" />,
    <ul key="checks" className={styles.sampleChecklist}>
      <li>
        <Check aria-hidden="true" />
        Palette and type scale imported
      </li>
      <li>
        <Check aria-hidden="true" />
        Two teammates invited
      </li>
    </ul>,
    <span key="action">
      <Button scheme="neutral" size="medium" type="button" variant="outlined">
        Save profile
      </Button>
    </span>,
  ],
};
