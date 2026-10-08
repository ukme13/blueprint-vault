"use client";

import { Tooltip } from "@astryxdesign/core/Tooltip";
import {
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
 * Contrast, WCAG 2 and WCAG 3 as one group.
 *
 * Contrast is the group's name, not a mode: it is never the one that is lit.
 * Pressing it switches contrast on in the standard that was in use last, or
 * off if it is on. A standard lights when it is the one measuring, and
 * pressing the one that is lit turns the tool off. With none lit, it is off:
 * there is no Off button because pressing either of those already is one.
 */
export function ContrastControl({
  isOn,
  standard,
  onTurnOn,
  onTurnOff,
  onStandardChange,
}: ContrastControlProps) {
  return (
    <span aria-label="Contrast" className={styles.contrastGroup} role="group">
      <Tooltip
        content={TIPS[standard]}
        hasHoverIndication={false}
        placement="below"
      >
        <button
          className={styles.contrastGroupLabel}
          type="button"
          onClick={isOn ? onTurnOff : onTurnOn}
        >
          <ContrastIcon className="size-3.5" />
          Contrast
        </button>
      </Tooltip>
      {CONTRAST_STANDARDS.map((each) => {
        const isLit = isOn && standard === each;
        return (
          <button
            key={each}
            aria-pressed={isLit}
            type="button"
            onClick={() => (isLit ? onTurnOff() : onStandardChange(each))}
          >
            {CONTRAST_STANDARD_LABELS[each]}
          </button>
        );
      })}
    </span>
  );
}
