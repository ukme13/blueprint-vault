"use client";

import { useEffect, useRef, useState } from "react";
import { NumberInput } from "@astryxdesign/core/NumberInput";
import {
  clearLineHeightEdit,
  commitLineHeightEdit,
  resetLineHeightEdit,
  settleLineHeightEdit,
  typeLineHeight,
  type LineHeightConfig,
  type LineHeightEdit,
} from "@blueprint/ui";

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
 *
 * The edit itself — what counts as one, and what a blur is allowed to write —
 * is `line-height-edit` in @blueprint/ui. This binds it to React.
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

  const [edit, setEdit] = useState<LineHeightEdit>(() =>
    resetLineHeightEdit(committed),
  );
  const [seen, setSeen] = useState<number | null>(committed);

  /* The same edit, readable from an event rather than from a render.
     `commit` runs on blur, and the last keystroke can arrive in that same
     blur: NumberInput holds the text as a draft and calls onChange when it
     commits it, so onChange and onBlur are two callbacks inside one event.
     State set in the first is not readable in the second, and `commit`
     reading `edit` there saw the render before it — writing the edit before
     last, one blur behind, with the field showing the right number the whole
     time because the field shows the draft rather than the model. */
  const editRef = useRef(edit);

  /* An edit made in an event writes both at once, because the blur that reads
     the ref can be the same event that made it. */
  const applyEdit = (next: LineHeightEdit) => {
    editRef.current = next;
    setEdit(next);
  };

  /* The reset below cannot do that — a ref written during render belongs to a
     render React is still free to throw away — so it sets state and this
     carries it across. Effects flush before the next event, so no blur reads
     past it. */
  useEffect(() => {
    editRef.current = edit;
  }, [edit]);

  /* Follow the model when it moves underneath — a step change, or an import.
     Adjusted during render rather than in an effect: React re-renders before
     painting, so there is no frame showing the stale number, and no cascading
     render either. */
  if (committed !== seen) {
    setSeen(committed);
    setEdit(resetLineHeightEdit(committed));
  }

  /* Only what somebody typed. A blur is not an edit. */
  const commit = () => {
    const { edit: next, config: committedConfig } = commitLineHeightEdit(
      editRef.current,
    );
    applyEdit(next);
    if (committedConfig) onChange(committedConfig);
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
      value={edit.draft}
      /* The resolved height, muted, whenever the field is empty. */
      placeholder={String(computedPx)}
      hasClear
      onChange={(value: number | null) => {
        /* Emptying the field is an answer, not a step towards one, so it
           commits here rather than waiting for a blur.

           Deferring it left the model on the last number while the field
           looked empty — and since the placeholder is computed from the
           model, it showed the height that number resolved to rather than
           the one `auto` was about to give. Clearing 1.53 offered 24.48 until
           focus left, then corrected itself to 24. */
        if (value === null || Number.isNaN(value)) {
          applyEdit(clearLineHeightEdit());
          onChange({ mode: "auto" });
          return;
        }
        applyEdit(typeLineHeight(value));
      }}
      onEnter={commit}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key.toLowerCase() !== AUTO_KEY) return;
        /* Select-all carries the same key. Swallowing it emptied the field
           instead of selecting its text, so the shortcut has to be the
           unmodified letter and nothing else. */
        if (event.metaKey || event.ctrlKey || event.altKey) return;
        /* The input is numeric, so the letter would be swallowed. Clearing
           the field is the discoverable way back to auto; this is the one for
           whoever would rather not reach for the mouse. */
        event.preventDefault();
        applyEdit(settleLineHeightEdit(editRef.current));
        onChange({ mode: "auto" });
      }}
    />
  );
}
