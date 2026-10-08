"use client";

import { ArrowLeftRight } from "lucide-react";
import type { ContrastPolarity } from "@blueprint/ui";
import styles from "./palette-workspace.module.css";

interface ContrastPolarityToggleProps {
  polarity: ContrastPolarity;
  onToggle: () => void;
}

/**
 * The word between the shade and what it is measured against: `on`, or
 * `under` when the pair is turned round. Pressing it turns the pair round, in
 * the matrix and in every shade's details together, since they share the one
 * choice. It reads as a word until it is reached for, and then the word gives
 * way to the swap arrow in the same place: the two share one cell, so
 * hovering moves nothing. It is as wide as its word, so `on` sits snug.
 */
export function ContrastPolarityToggle({
  polarity,
  onToggle,
}: ContrastPolarityToggleProps) {
  return (
    <button
      aria-label={`Shade ${polarity} the comparison colour. Swap text and background`}
      aria-pressed={polarity === "under"}
      className={styles.contrastPolarity}
      data-polarity={polarity}
      type="button"
      onClick={onToggle}
    >
      <span className={styles.contrastPolarityWord}>{polarity}</span>
      <ArrowLeftRight
        aria-hidden
        className={`size-3 ${styles.contrastPolarityArrow}`}
      />
    </button>
  );
}
