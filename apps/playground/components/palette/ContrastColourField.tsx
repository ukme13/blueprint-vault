"use client";

import { useState } from "react";
import { TextInput } from "@astryxdesign/core/TextInput";
import { formatColour, isWholeColourDraft, parseColour } from "@blueprint/ui";
import { ColourPicker } from "./ColourPicker";
import styles from "./palette-workspace.module.css";

interface ContrastColourFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

/**
 * The colour a contrast check is measured against, as a field: its swatch,
 * and its HEX to read or type. Tapping the swatch opens the full picker.
 *
 * A small swatch alone said a colour was chosen and nothing of which, and
 * gave no way to type one in. A HEX applies at six digits, as in the picker,
 * and shorthand on Enter or leaving the field; what cannot be read goes back
 * to the colour held.
 */
export function ContrastColourField({
  label,
  value,
  onChange,
}: ContrastColourFieldProps) {
  const [draft, setDraft] = useState(() => formatColour(value, "hex"));
  const [seen, setSeen] = useState(value);
  /* The picker changes the colour from outside the field: show it. */
  if (seen !== value) {
    setSeen(value);
    setDraft(formatColour(value, "hex"));
  }

  const update = (next: string) => {
    setDraft(next);
    /* `#111` on the way to `#111000` is not a colour yet. */
    if (!isWholeColourDraft(next, "hex")) return;
    onChange(parseColour(next, "hex"));
  };

  const commit = () => {
    try {
      onChange(parseColour(draft, "hex"));
    } catch {
      setDraft(formatColour(value, "hex"));
    }
  };

  return (
    <span className={styles.contrastColourField}>
      <TextInput
        isLabelHidden
        label={`${label} HEX value`}
        size="lg"
        startIcon={
          <ColourPicker
            label={label}
            trigger={
              <i
                className={styles.colourHexSwatch}
                style={{ backgroundColor: value }}
              />
            }
            triggerLabel={`Choose ${label}`}
            value={value}
            onChange={onChange}
          />
        }
        value={draft}
        width="100%"
        onBlur={commit}
        onChange={update}
        onEnter={commit}
      />
    </span>
  );
}
