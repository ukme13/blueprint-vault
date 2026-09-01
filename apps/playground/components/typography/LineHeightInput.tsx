"use client";

import { useState } from "react";
import { NumberInput } from "@astryxdesign/core/NumberInput";
import { parseLineHeightInput, type LineHeightConfig } from "@blueprint/ui";

/**
 * The line-height field.
 *
 * The same control as the size beside it — a number with its unit in the slot
 * on the right — because they are the same kind of value, and reading one row
 * should not mean reading two conventions.
 *
 * `auto` is an empty field showing the pixel height it resolved to as a
 * placeholder. That does three things at once: the number is on screen, where
 * the word "auto" said how the value was chosen and never what it is; the
 * muted text tells a followed default from a pinned number, which two
 * identical-looking numbers could not; and clearing the field becomes the
 * obvious way back, which no keyboard shortcut is.
 *
 * It also removes a trap. While `auto` displayed a real value, typing that
 * same number to pin it was not a change, so nothing committed and the value
 * stayed on auto. Against an empty field it is an edit like any other.
 *
 * The cost is that a resolved value lives in placeholder text, which screen
 * readers do not reliably announce. The label is real and the field is named;
 * it is the number that may go unread.
 */

/** Press this to hand the line height back to the group's default. */
const AUTO_KEY = "a";

interface LineHeightInputProps {
  label: string;
  config: LineHeightConfig;
  /** What `auto` resolves to, shown as the placeholder. */
  computedPx: number;
  onChange: (config: LineHeightConfig) => void;
}

export function LineHeightInput({
  label,
  config,
  computedPx,
  onChange,
}: LineHeightInputProps) {
  /* A ratio is shown as itself and carries no unit, because it has none — it
     is a multiple of the font size rather than a length. */
  const isRatio = config.mode === "ratio";
  const committed = config.mode === "auto" ? null : config.value;

  const [draft, setDraft] = useState<number | null>(committed);
  const [seen, setSeen] = useState<number | null>(committed);
  /* Whether the number in the field is one the user put there.

     Without this, blurring writes whatever is on screen straight back, and
     tabbing out of a field would pin it. Nothing would look different at the
     time; it would surface later, when a size change failed to move it. */
  const [isDirty, setIsDirty] = useState(false);

  /* Follow the model when it moves underneath — a step change, or an import.
     Adjusted during render rather than in an effect: React re-renders before
     painting, so there is no frame showing the stale number, and no cascading
     render either. */
  if (committed !== seen) {
    setSeen(committed);
    setDraft(committed);
    setIsDirty(false);
  }

  /* Only what somebody typed. A blur is not an edit. */
  const commit = () => {
    if (!isDirty) return;
    setIsDirty(false);
    if (draft === null) {
      onChange({ mode: "auto" });
      return;
    }
    const parsed = parseLineHeightInput(String(draft));
    if (parsed) onChange(parsed);
  };

  return (
    <NumberInput
      isLabelHidden
      label={label}
      /* The unit follows the committed value rather than the draft, so it
         does not flicker while a number is being typed. */
      units={isRatio ? null : "px"}
      /* One field, two ranges: a ratio up to 2.5, a pixel height above it.
         The parser tells them apart by size, so there is no unit control to
         find first. */
      min={1}
      max={400}
      step={1}
      value={draft}
      /* The resolved height, muted, whenever the field is empty. */
      placeholder={String(computedPx)}
      hasClear
      onChange={(value) => {
        setDraft(value);
        setIsDirty(true);
      }}
      onEnter={commit}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key.toLowerCase() !== AUTO_KEY) return;
        /* The input is numeric, so the letter would be swallowed. Clearing
           the field is the discoverable way back to auto; this is the one for
           whoever would rather not reach for the mouse. */
        event.preventDefault();
        setIsDirty(false);
        onChange({ mode: "auto" });
      }}
    />
  );
}
