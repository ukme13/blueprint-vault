"use client";

import { Children, type ReactNode } from "react";
import { Text } from "@astryxdesign/core/Text";
import { Button } from "@blueprint/ui";
import { Sheet } from "./Sheet";
import styles from "./settings-sheet.module.css";

/**
 * A phone's settings panel: a title, the controls, Reset / Apply.
 *
 * On a narrow screen a toolbar toggle that grew its options inline had two bad
 * choices — push them off the edge of a scrolling strip, or wrap the strip onto
 * three lines. A sheet rising from the bottom is the phone's own answer, and
 * the controls get the whole width.
 *
 * Astryx's `BottomSheet` does the parts that are easy to get wrong: the slide
 * up from the edge, the dark scrim, the focus trap, the scroll lock, Escape,
 * swipe-down and tap-the-scrim. What it has no opinion on is a header or a
 * footer, so those are here.
 *
 * The sheet edits a draft. Only Apply commits it; Escape, a swipe and a tap
 * on the scrim all discard it. That makes every way out except one mean the
 * same thing, which is what lets `purpose="info"` — dismiss on the scrim — be
 * safe here: dismissing loses nothing that had been committed.
 *
 * No Cancel and no close button. Those are the ways out a phone's sheet
 * already has, and a third and fourth way to say the same thing crowded the
 * footer.
 */

interface SettingsSheetProps {
  isOpen: boolean;
  /** The sheet's heading, and its accessible name. */
  title: string;
  /** Put the draft back to how a fresh studio starts. Does not close. */
  onReset: () => void;
  /** Discard the draft and close: the scrim, a swipe or Escape. */
  onCancel: () => void;
  /** Commit the draft and close. */
  onApply: () => void;
  children: ReactNode;
}

export function SettingsSheet({
  isOpen,
  title,
  onReset,
  onCancel,
  onApply,
  children,
}: SettingsSheetProps) {
  return (
    <Sheet
      className={styles.sheet}
      isOpen={isOpen}
      label={title}
      onClose={onCancel}
    >
      <header className={styles.header}>
        <Text as="h2" type="large" weight="semibold">
          {title}
        </Text>
      </header>

      {/* Each setting in a wrapper of its own, which carries the divider.
            Put on the controls themselves, the divider's padding went inside
            any control that paints its own background — the segmented
            control's track grew 16px at the top and none at the bottom. */}
      <div className={styles.body}>
        {Children.map(children, (child) =>
          child == null || typeof child === "boolean" ? null : (
            <div className={styles.setting}>{child}</div>
          ),
        )}
      </div>

      <footer className={styles.footer}>
        {/* Reset on its own at the start, away from Apply: it changes the
              draft and a stray tap on it should not look like confirming. */}
        <Button scheme="neutral" size="small" variant="text" onClick={onReset}>
          Reset
        </Button>
        <Button scheme="primary" size="small" onClick={onApply}>
          Apply
        </Button>
      </footer>
    </Sheet>
  );
}
