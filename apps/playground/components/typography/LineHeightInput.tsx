"use client";

import { useState } from "react";
import { NumberInput } from "@astryxdesign/core/NumberInput";
import { parseLineHeightInput, type LineHeightConfig } from "@blueprint/ui";

/**
 * The line-height field.
 *
 * The same control as the size beside it — a number, with its unit in the
 * slot on the right — because they are the same kind of value, and reading
 * one row should not mean reading two conventions.
 *
 * `auto` shows the pixel height it resolved to rather than the word "auto".
 * The word says how the value was chosen and not what it is, which leaves the
 * one number the row exists to communicate off the screen.
 *
 * Its own component because a field with a draft, a commit point and two
 * possible units is more than the three inputs beside it put together.
 */

/** Press this to hand the line height back to the group's default. */
const AUTO_KEY = "a";

interface LineHeightInputProps {
  label: string;
  config: LineHeightConfig;
  /** What `auto` and `px` resolve to, which is what the field shows. */
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
     is a multiple of the font size rather than a length. Everything else is a
     pixel height. */
  const isRatio = config.mode === "ratio";
  const committed = isRatio ? config.value : computedPx;

  const [draft, setDraft] = useState<number>(committed);
  const [seen, setSeen] = useState<number>(committed);
  /* Whether the number in the field is one the user typed.

     Without this, blurring writes whatever is on screen straight back — and
     what is on screen for `auto` is the pixel height it resolved to. Tabbing
     out of an `auto` field pinned it to that number, so `auto` could not
     survive being clicked away from. It looked like nothing happened until a
     size change failed to move it. */
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

  /* Committed on blur and Enter rather than per keystroke. On the way to 24
     the field passes through 2, which is a valid ratio, so committing every
     keystroke would swap the unit out from under someone mid-number.

     Through the same parser the engine uses, so the one rule that tells a
     ratio from a pixel height lives in a single place. */
  /*
   * Enter commits whatever is shown; a blur only commits an edit.
   *
   * The difference matters for `auto`, which displays the pixel height it
   * resolved to. Committing on every blur pinned that number the moment
   * somebody tabbed away, so `auto` could not survive being clicked off.
   * Committing on no blur at all left the opposite gap: the value `auto`
   * already shows could never be pinned, because typing the number that is
   * on screen is not a change.
   *
   * Enter is somebody saying "this one". A blur is somebody leaving.
   */
  const commit = (isExplicit: boolean) => {
    if (!isExplicit && !isDirty) return;
    setIsDirty(false);
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
      placeholder="auto"
      onChange={(value) => {
        setDraft(value);
        setIsDirty(true);
      }}
      onEnter={() => commit(true)}
      onBlur={() => commit(false)}
      onKeyDown={(event) => {
        if (event.key.toLowerCase() !== AUTO_KEY) return;
        /* The input is numeric, so the letter would be swallowed. Taking the
           key here is what keeps `auto` reachable without adding a control to
           a row with no room for one. */
        event.preventDefault();
        setIsDirty(false);
        onChange({ mode: "auto" });
      }}
    />
  );
}
