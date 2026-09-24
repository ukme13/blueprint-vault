"use client";

import type { ReactNode } from "react";
import { Dialog } from "@astryxdesign/core/Dialog";
import { Icon } from "@astryxdesign/core/Icon";
import { IconButton } from "@astryxdesign/core/IconButton";
import { Sheet } from "./Sheet";
import styles from "./adaptive-dialog.module.css";
import { useIsPhone } from "./use-is-phone";

/**
 * A short form, in the shape each screen expects.
 *
 * A centred dialog on a desktop, with a close button in its header; a sheet
 * from the bottom edge on a phone, which closes from its backdrop, a swipe or
 * Escape and so carries no close button of its own. The same title, body and
 * footer in both.
 */
interface AdaptiveDialogProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** The buttons at the bottom: the confirming one last. */
  footer: ReactNode;
}

export function AdaptiveDialog({
  isOpen,
  title,
  onClose,
  children,
  footer,
}: AdaptiveDialogProps) {
  const isPhone = useIsPhone();

  if (isPhone) {
    return (
      <Sheet
        className={styles.sheet}
        isOpen={isOpen}
        label={title}
        onClose={onClose}
      >
        <h2 className={styles.title}>{title}</h2>
        <div className={styles.body}>{children}</div>
        <footer className={styles.footer}>{footer}</footer>
      </Sheet>
    );
  }

  return (
    <Dialog
      aria-label={title}
      isOpen={isOpen}
      padding={0}
      purpose="form"
      width={460}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <header className={styles.header}>
        <h2 className={styles.title}>{title}</h2>
        <IconButton
          icon={<Icon icon="close" size="sm" />}
          label="Close"
          size="sm"
          variant="ghost"
          onClick={onClose}
        />
      </header>
      <div className={`${styles.body} ${styles.dialogBody}`}>{children}</div>
      <footer className={`${styles.footer} ${styles.dialogFooter}`}>
        {footer}
      </footer>
    </Dialog>
  );
}
