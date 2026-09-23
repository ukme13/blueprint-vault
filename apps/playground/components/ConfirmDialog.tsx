"use client";

import { AlertDialog } from "@astryxdesign/core/AlertDialog";
import { BottomSheet } from "@astryxdesign/core/BottomSheet";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { Text } from "@astryxdesign/core/Text";
import { Button } from "@blueprint/ui";
import styles from "./confirm-dialog.module.css";

/**
 * "Are you sure?" in the shape each screen expects.
 *
 * On a desktop, Astryx's `AlertDialog`: centred, Cancel first and focused.
 * On a phone, a sheet from the bottom edge with full-width buttons, the way a
 * phone's own apps ask. The confirming action sits above Cancel, and Cancel
 * sits nearest the thumb.
 *
 * On a phone, tapping the scrim or swiping the sheet down cancels. That is
 * the one thing a stray tap can safely do, and a phone's own sheets do the
 * same. The alert dialog keeps its desktop rule of no dismissal from outside.
 */

interface ConfirmDialogProps {
  isOpen: boolean;
  /** The question. */
  title: string;
  /** What happens if it is confirmed. */
  description: string;
  /** Says what happens — "Reset preset", not "OK". */
  actionLabel: string;
  onAction: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  description,
  actionLabel,
  onAction,
  onCancel,
}: ConfirmDialogProps) {
  const isPhone = useMediaQuery("(max-width: 640px)");

  if (!isPhone) {
    return (
      <AlertDialog
        actionLabel={actionLabel}
        description={description}
        isOpen={isOpen}
        title={title}
        onAction={onAction}
        onOpenChange={(open) => {
          if (!open) onCancel();
        }}
      />
    );
  }

  /* Escape closes this sheet only. Astryx closes a sheet from a React keydown
     on its dialog, and when this one is opened from inside another sheet it
     sits inside that one in the React tree, so the same Escape would bubble on
     and close both. A div, not a span: Astryx moves menus out of a span. */
  return (
    <div
      className={styles.stacked}
      onKeyDown={(event) => {
        if (event.key === "Escape") event.stopPropagation();
      }}
    >
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
          <Text as="h2" type="large" weight="semibold">
            {title}
          </Text>
          <Text as="p" color="secondary">
            {description}
          </Text>
          <span className={styles.actions}>
            <Button scheme="error" size="large" onClick={onAction}>
              {actionLabel}
            </Button>
            <Button
              scheme="neutral"
              size="large"
              variant="outlined"
              onClick={onCancel}
            >
              Cancel
            </Button>
          </span>
        </div>
      </BottomSheet>
    </div>
  );
}
