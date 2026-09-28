"use client";

import { Check, Copy, X } from "lucide-react";
import { IconButton } from "@astryxdesign/core/IconButton";
import { useCopyFeedback } from "../useCopyFeedback";
import styles from "./scale-workspace.module.css";

interface CopyValueButtonProps {
  /** The button's accessible name: "Copy CSS for Low". */
  label: string;
  /** What goes on the clipboard. */
  value: string;
  /** The tooltip before a copy: what it will copy. */
  hint: string;
}

const ICON = { idle: Copy, copied: Check, error: X } as const;

/**
 * A quiet copy button for a row of a scale: copies one value, then shows a
 * tick for a moment, or a cross if the browser refuses (no clipboard
 * permission, an insecure page) rather than a tick that would be a lie.
 *
 * Its click stops at the button: the rows it sits in are picked by a click,
 * and copying should not also pick the row.
 */
export function CopyValueButton({ label, value, hint }: CopyValueButtonProps) {
  const { copyText, status } = useCopyFeedback(1500);
  const Icon = ICON[status];

  return (
    <IconButton
      className={styles.copyButton}
      data-copy-result={status === "idle" ? undefined : status}
      icon={<Icon aria-hidden="true" />}
      label={label}
      size="sm"
      tooltip={
        status === "copied"
          ? "Copied"
          : status === "error"
            ? "Could not copy"
            : hint
      }
      variant="ghost"
      onClick={(event) => {
        event.stopPropagation();
        void copyText(value);
      }}
    />
  );
}
