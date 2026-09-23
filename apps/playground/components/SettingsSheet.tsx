"use client";

import type { ReactNode } from "react";
import { BottomSheet } from "@astryxdesign/core/BottomSheet";
import { Icon } from "@astryxdesign/core/Icon";
import { IconButton } from "@astryxdesign/core/IconButton";
import { Text } from "@astryxdesign/core/Text";
import { Button } from "@blueprint/ui";
import styles from "./settings-sheet.module.css";

/**
 * A phone's settings panel: a title, the controls, Reset / Cancel / Apply.
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
 * The sheet edits a draft. Only Apply commits it; Cancel, the close button,
 * Escape, a swipe and a tap on the scrim all discard it. That makes every way
 * out except one mean the same thing, which is what lets `purpose="info"` —
 * dismiss on the scrim — be safe here: dismissing loses nothing that had been
 * committed.
 */

interface SettingsSheetProps {
  isOpen: boolean;
  /** The sheet's heading, and its accessible name. */
  title: string;
  /** Put the draft back to how a fresh studio starts. Does not close. */
  onReset: () => void;
  /** Discard the draft and close — every way out but Apply lands here. */
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
    <BottomSheet
      height="hug"
      isOpen={isOpen}
      label={title}
      purpose="info"
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <div className={styles.sheet}>
        <header className={styles.header}>
          <Text as="h2" type="large" weight="semibold">
            {title}
          </Text>
          <IconButton
            icon={<Icon icon="close" />}
            label="Close"
            size="sm"
            variant="ghost"
            onClick={onCancel}
          />
        </header>

        <div className={styles.body}>{children}</div>

        <footer className={styles.footer}>
          {/* Reset on its own at the start, away from Apply: it changes the
              draft and a stray tap on it should not look like confirming. */}
          <Button
            scheme="neutral"
            size="small"
            variant="text"
            onClick={onReset}
          >
            Reset
          </Button>
          <span className={styles.footerEnd}>
            <Button
              scheme="neutral"
              size="small"
              variant="outlined"
              onClick={onCancel}
            >
              Cancel
            </Button>
            <Button scheme="primary" size="small" onClick={onApply}>
              Apply
            </Button>
          </span>
        </footer>
      </div>
    </BottomSheet>
  );
}
