"use client";

import { Check, Copy, X } from "lucide-react";
import { IconButton } from "@astryxdesign/core/IconButton";
import type { ColourMode } from "@blueprint/ui";
import { useCopyFeedback } from "../useCopyFeedback";
import styles from "./scale-workspace.module.css";

interface ElevationCopyButtonProps {
  levelName: string;
  /** The level's box-shadow value, for the mode below. */
  css: string;
  /** The mode the studio is showing: the value copied is that mode's. */
  mode: ColourMode;
}

const ICON = { idle: Copy, copied: Check, error: X } as const;

/**
 * Copies one level's `box-shadow` value, for the mode the studio is
 * showing, and shows a tick for a moment so the click visibly did
 * something. A copy the browser refuses — no clipboard permission, an
 * insecure page — shows a cross rather than a tick that would be a lie.
 *
 * Its click stops at the button: the row it sits in picks the level on a
 * click, and copying should not also move the inspector.
 */
export function ElevationCopyButton({
  levelName,
  css,
  mode,
}: ElevationCopyButtonProps) {
  const { copyText, status } = useCopyFeedback(1500);
  const Icon = ICON[status];

  return (
    <IconButton
      className={styles.copyButton}
      data-copy-result={status === "idle" ? undefined : status}
      icon={<Icon aria-hidden="true" />}
      label={`Copy CSS for ${levelName}`}
      size="sm"
      tooltip={
        status === "copied"
          ? "Copied"
          : status === "error"
            ? "Could not copy"
            : `Copy ${mode} box-shadow`
      }
      variant="ghost"
      onClick={(event) => {
        event.stopPropagation();
        void copyText(css);
      }}
    />
  );
}
