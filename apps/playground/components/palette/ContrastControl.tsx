"use client";

import { Tooltip } from "@astryxdesign/core/Tooltip";
import {
  Button,
  CONTRAST_STANDARD_LABELS,
  CONTRAST_STANDARDS,
  ContrastIcon,
  type ContrastStandard,
} from "@blueprint/ui";
import styles from "./palette-workspace.module.css";

interface ContrastControlProps {
  isOn: boolean;
  /** The standard in use, or the one last used while the tool is off. */
  standard: ContrastStandard;
  onTurnOn: () => void;
  onTurnOff: () => void;
  onStandardChange: (standard: ContrastStandard) => void;
}

const TIPS: Record<ContrastStandard, string> = {
  wcag2: "Below 3:1 fails. Normal text needs 4.5:1 for AA and 7:1 for AAA.",
  wcag3:
    "APCA Lc: 75 for body text, 60 for large text and headings, 45 for UI components.",
};

/**
 * Contrast, and once it is on WCAG 2 and WCAG 3, as one group.
 *
 * Off, only Contrast shows. Contrast is the group's name, not a mode: it is
 * never the one that is lit. Pressing it switches contrast on in the standard
 * that was in use last, and reveals the two standards; pressing it again
 * switches off and hides them. A standard lights when it is the one
 * measuring, and pressing the one that is lit turns the tool off. There is no
 * Off button because pressing either of those already is one.
 *
 * Each is the toolbar's own outlined button, so the fill, the hover and the
 * focus ring are the ones Add colour and Vision have; only the corners are
 * squared where two meet.
 */
export function ContrastControl({
  isOn,
  standard,
  onTurnOn,
  onTurnOff,
  onStandardChange,
}: ContrastControlProps) {
  const standards = isOn ? CONTRAST_STANDARDS : [];
  /* Where each sits in the row, so the joins are squared by position and not
     by a sibling selector that a tooltip's wrapper would break. */
  const place = (index: number) =>
    index === 0 ? (standards.length === 0 ? "only" : "first") : "after";
  return (
    <span aria-label="Contrast" className={styles.contrastGroup} role="group">
      <Tooltip
        content={TIPS[standard]}
        hasHoverIndication={false}
        placement="below"
      >
        <Button
          className={styles.contrastSegment}
          data-place={place(0)}
          leftIcon={<ContrastIcon className="size-3.5" />}
          scheme="neutral"
          size="small"
          variant="outlined"
          onClick={isOn ? onTurnOff : onTurnOn}
        >
          Contrast
        </Button>
      </Tooltip>
      {standards.map((each, index) => {
        const isLit = standard === each;
        const isLast = index === standards.length - 1;
        return (
          <Button
            key={each}
            aria-pressed={isLit}
            className={styles.contrastSegment}
            data-active={isLit}
            data-place={isLast ? "last" : "between"}
            scheme="neutral"
            size="small"
            variant="outlined"
            onClick={() => (isLit ? onTurnOff() : onStandardChange(each))}
          >
            {CONTRAST_STANDARD_LABELS[each]}
          </Button>
        );
      })}
    </span>
  );
}
