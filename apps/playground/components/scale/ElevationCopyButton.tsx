"use client";

import { useEffect, useState } from "react";
import { Check, Copy, X } from "lucide-react";
import { IconButton } from "@astryxdesign/core/IconButton";
import type { ColourMode } from "@blueprint/ui";
import styles from "./scale-workspace.module.css";

/** How long the tick stays after a copy. */
const FEEDBACK_MS = 1500;

interface ElevationCopyButtonProps {
  levelName: string;
  /** The level's box-shadow value, for the mode below. */
  css: string;
  /** The mode the studio is showing: the value copied is that mode's. */
  mode: ColourMode;
}

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
  const [result, setResult] = useState<"copied" | "failed" | null>(null);

  useEffect(() => {
    if (!result) return;
    const timer = window.setTimeout(() => setResult(null), FEEDBACK_MS);
    return () => window.clearTimeout(timer);
  }, [result]);

  const Icon = result === "copied" ? Check : result === "failed" ? X : Copy;

  return (
    <IconButton
      className={styles.copyButton}
      data-copy-result={result ?? undefined}
      icon={<Icon aria-hidden="true" />}
      label={`Copy CSS for ${levelName}`}
      size="sm"
      tooltip={
        result === "copied"
          ? "Copied"
          : result === "failed"
            ? "Could not copy"
            : `Copy ${mode} box-shadow`
      }
      variant="ghost"
      onClick={(event) => {
        event.stopPropagation();
        if (!navigator.clipboard) {
          setResult("failed");
          return;
        }
        navigator.clipboard
          .writeText(css)
          .then(() => setResult("copied"))
          .catch(() => setResult("failed"));
      }}
    />
  );
}
