"use client";

import { useEffect, useRef, useState } from "react";

export type CopyStatus = "idle" | "copied" | "error";

export function useCopyFeedback(resetDelay = 1600) {
  const [status, setStatus] = useState<CopyStatus>("idle");
  const resetTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (resetTimer.current !== null) {
        window.clearTimeout(resetTimer.current);
      }
    },
    [],
  );

  const copyText = async (value: string) => {
    if (resetTimer.current !== null) {
      window.clearTimeout(resetTimer.current);
    }

    let didCopy = false;

    try {
      if (!navigator.clipboard) {
        throw new Error("Clipboard access is unavailable.");
      }

      await navigator.clipboard.writeText(value);
      setStatus("copied");
      didCopy = true;
    } catch {
      setStatus("error");
    }

    resetTimer.current = window.setTimeout(() => {
      setStatus("idle");
      resetTimer.current = null;
    }, resetDelay);

    return didCopy;
  };

  return { copyText, status };
}
