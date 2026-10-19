"use client";

import { useToast } from "@astryxdesign/core/Toast";
import { useCopyFeedback } from "../useCopyFeedback";
import styles from "./palette-workspace.module.css";

/**
 * Copies a colour's text and says so in a toast that fades on its own.
 *
 * One toast id for every colour copied, so pressing two in a row replaces the
 * first rather than stacking a second under it.
 */
export function useCopyColour() {
  const { copyText } = useCopyFeedback(1200);
  const toast = useToast();

  return async (value: string) => {
    const didCopy = await copyText(value);
    toast({
      autoHideDuration: 1800,
      body: didCopy ? (
        <span className={styles.copyToastMessage}>
          <svg aria-hidden="true" height="16" viewBox="0 0 16 16" width="16">
            <path
              d="m3.5 8.2 2.8 2.8 6.2-6.2"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
            />
          </svg>
          Color copied
        </span>
      ) : (
        "Could not copy color"
      ),
      type: didCopy ? "info" : "error",
      uniqueID: "shade-color-copy",
    });
    return didCopy;
  };
}
