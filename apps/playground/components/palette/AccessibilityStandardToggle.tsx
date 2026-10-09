"use client";

import {
  Button,
  CONTRAST_STANDARD_LABELS,
  CONTRAST_STANDARDS,
} from "@blueprint/ui";
import { usePaletteView } from "./PaletteViewContext";
import styles from "./palette-workspace.module.css";

/**
 * `WCAG 2 | WCAG 3`: which standard the Accessibility tab measures by.
 *
 * One of the two is always on, so it is a choice and not a switch: pressing the
 * lit one does nothing. The segments are the Contrast group's, so the fill, the
 * joins and the 28px height are the ones the rest of the toolbar has. It sets
 * the same preference the Contrast tool reads, so the tab and the Colour
 * Studio never disagree about the standard.
 */
export function AccessibilityStandardToggle() {
  const { contrastStandard, setContrastStandard } = usePaletteView();
  return (
    <span
      aria-label="Accessibility standard"
      className={styles.standardGroup}
      role="group"
    >
      {CONTRAST_STANDARDS.map((standard, index) => {
        const isLit = contrastStandard === standard;
        return (
          <Button
            key={standard}
            aria-pressed={isLit}
            className={styles.contrastSegment}
            data-active={isLit}
            data-place={index === 0 ? "first" : "last"}
            scheme="neutral"
            size="small"
            variant="outlined"
            onClick={() => setContrastStandard(standard)}
          >
            {CONTRAST_STANDARD_LABELS[standard]}
          </Button>
        );
      })}
    </span>
  );
}
