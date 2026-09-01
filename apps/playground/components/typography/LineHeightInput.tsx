"use client";

import { useState } from "react";
import { TextInput } from "@astryxdesign/core/TextInput";
import {
  formatLineHeightInput,
  parseLineHeightInput,
  type LineHeightConfig,
} from "@blueprint/ui";

/**
 * The line-height field, which accepts all three ways of saying it.
 *
 * A text input rather than a number one, because the value is not always a
 * number: `auto` is a mode, and `24px` carries its unit. The parser decides
 * which was meant; this component only owns the draft and when to commit it.
 *
 * Its own component because the editor row is already long, and because a
 * field with a draft, a commit point and an error state is more than the
 * other three inputs in that row put together.
 */

interface LineHeightInputProps {
  label: string;
  config: LineHeightConfig;
  /** Shown beside the field, so the value that ships is never hidden. */
  computedPx: number;
  computedRatio: number;
  onChange: (config: LineHeightConfig) => void;
}

export function LineHeightInput({
  label,
  config,
  computedPx,
  computedRatio,
  onChange,
}: LineHeightInputProps) {
  const committed = formatLineHeightInput(config);
  const [draft, setDraft] = useState(committed);
  const [seen, setSeen] = useState(committed);
  const [isInvalid, setIsInvalid] = useState(false);

  /* Follow the model when it moves underneath — a step change, or an import.
     Adjusted during render rather than in an effect: React re-renders this
     component before touching the DOM, so there is no intermediate paint
     showing the stale value, and no cascading render either.

     Compared on the formatted string, not the config, which is a new object
     every render and would reset the draft on every keystroke. */
  if (committed !== seen) {
    setSeen(committed);
    setDraft(committed);
    setIsInvalid(false);
  }

  /* Commit on blur and on Enter, not on every keystroke: "1" is on the way to
     "1.5" and is a valid ratio of its own, so committing per character would
     rewrite the value the user is still typing. */
  const commit = () => {
    const parsed = parseLineHeightInput(draft);
    if (!parsed) {
      setIsInvalid(true);
      return;
    }
    setIsInvalid(false);
    onChange(parsed);
  };

  return (
    <TextInput
      isLabelHidden
      label={label}
      size="sm"
      value={draft}
      placeholder="auto"
      status={
        isInvalid
          ? {
              type: "error",
              message: "Type a ratio like 1.5, a height like 24px, or auto.",
            }
          : undefined
      }
      statusVariant="tooltip"
      description={
        /* Both numbers, always. The pixel value is what lands on the grid and
           the ratio is what the export emits, and hiding either one makes the
           other look arbitrary. */
        config.mode === "auto"
          ? `auto · ${computedPx}px · ${computedRatio}`
          : `${computedPx}px · ${computedRatio}`
      }
      onChange={(value) => {
        setDraft(value);
        if (isInvalid) setIsInvalid(false);
      }}
      onEnter={commit}
      onBlur={commit}
    />
  );
}
