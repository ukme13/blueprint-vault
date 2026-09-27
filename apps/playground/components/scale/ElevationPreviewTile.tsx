"use client";

import { X } from "lucide-react";
import type { ColourMode } from "@blueprint/ui";
import styles from "./scale-workspace.module.css";

export type ElevationPreviewContext = "card" | "button" | "dialog";

export const ELEVATION_PREVIEW_CONTEXTS: readonly {
  value: ElevationPreviewContext;
  label: string;
}[] = [
  { value: "card", label: "Card" },
  { value: "button", label: "Button" },
  { value: "dialog", label: "Dialog" },
];

interface ElevationPreviewTileProps {
  context: ElevationPreviewContext;
  /** "Low on light": the sample is found by it. */
  label: string;
  mode: ColourMode;
  /** The mode's card fill. */
  surface: string;
  /** The level's resolved box-shadow for the mode. */
  shadow: string;
}

/**
 * One level's shadow on something it would really sit under: a card with a
 * header and a line of text, a button — where Inset reads as pressed and
 * Glow as an aura — or a dialog, the place the higher levels are for.
 *
 * The element that carries the name also carries the shadow and the fill,
 * whichever shape it is, so the sample reads the same to a test and to a
 * screen reader. The details inside are drawn in the tile's own ink, set
 * per mode, never in the studio's colours: this is the workspace's light or
 * dark mode, whatever the studio is showing.
 */
export function ElevationPreviewTile({
  context,
  label,
  mode,
  surface,
  shadow,
}: ElevationPreviewTileProps) {
  const style = { background: surface, boxShadow: shadow };

  if (context === "button") {
    return (
      /* A real button, so it presses as one; out of the tab order, as the
         row it sits in is already the way to pick the level. */
      <button
        aria-label={label}
        className={styles.previewButton}
        data-mode={mode}
        data-preview="button"
        style={style}
        tabIndex={-1}
        type="button"
      >
        Button
      </button>
    );
  }

  if (context === "dialog") {
    return (
      <span
        aria-label={label}
        className={styles.previewDialog}
        data-mode={mode}
        data-preview="dialog"
        role="img"
        style={style}
      >
        <span className={styles.previewDialogHeader}>
          <span className={styles.previewLine} />
          <X aria-hidden="true" className={styles.previewClose} />
        </span>
        <span className={styles.previewFrame} />
      </span>
    );
  }

  return (
    <span
      aria-label={label}
      className={styles.elevationCard}
      data-mode={mode}
      data-preview="card"
      role="img"
      style={style}
    >
      <span className={styles.previewCardHeader}>
        <span className={styles.previewDot} />
      </span>
      <span className={styles.previewLine} />
      <span className={`${styles.previewLine} ${styles.previewLineShort}`} />
    </span>
  );
}
