"use client";

import { useState } from "react";
import { TextArea } from "@astryxdesign/core/TextArea";
import { TextInput } from "@astryxdesign/core/TextInput";
import {
  COLOUR_MODES,
  elevationVariableName,
  isSystemElevationLevel,
  renameElevationLevel,
  setLevelModeOpacities,
  type ColourMode,
  type ElevationLevel,
  type ElevationScale,
} from "@blueprint/ui";
import { ElevationPad } from "./ElevationPad";
import styles from "./scale-workspace.module.css";

interface ElevationLevelSettingsProps {
  scale: ElevationScale;
  level: ElevationLevel;
  shadowHex: string;
  surfaces: Record<ColourMode, { card: string }>;
  onChange: (scale: ElevationScale, editKey?: string) => void;
  /** A rename moves the id; the selection follows it. */
  onSelectLevel: (id: string) => void;
}

/**
 * A field that saves when it is left, or on Enter in a single line, not per
 * key: a level's name is its variable, and renaming on every keystroke would
 * move `--shadow-…` through every partial word typed. Multi-line takes Enter
 * as a new line and saves on leaving only.
 */
function CommitField({
  label,
  value,
  multiline = false,
  onCommit,
}: {
  label: string;
  value: string;
  multiline?: boolean;
  onCommit: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  const [seen, setSeen] = useState(value);
  if (seen !== value) {
    setSeen(value);
    setDraft(value);
  }
  const commit = () => {
    if (draft !== value) onCommit(draft);
  };
  if (multiline) {
    return (
      <TextArea
        label={label}
        rows={5}
        size="md"
        value={draft}
        width="100%"
        onBlur={commit}
        onChange={(next: string) => setDraft(next)}
      />
    );
  }
  return (
    <TextInput
      label={label}
      size="md"
      value={draft}
      width="100%"
      onBlur={commit}
      onChange={setDraft}
      onEnter={commit}
    />
  );
}

/**
 * Who a level is: its name, the variable it exports, and a description. A
 * system level's name is fixed, so it is a heading rather than a field.
 */
export function ElevationLevelDetails({
  scale,
  level,
  onChange,
  onSelectLevel,
}: Pick<
  ElevationLevelSettingsProps,
  "scale" | "level" | "onChange" | "onSelectLevel"
>) {
  const isSystem = isSystemElevationLevel(level.id);
  const index = scale.levels.findIndex((each) => each.id === level.id);

  const rename = (name: string, description?: string) => {
    const next = renameElevationLevel(scale, level.id, name, description);
    if (next === scale) return;
    onChange(next, `elevation:rename:${level.id}`);
    const moved = next.levels[index]?.id;
    if (moved && moved !== level.id) onSelectLevel(moved);
  };

  return (
    <div
      aria-label={`${level.name} level`}
      className={styles.settingGroup}
      role="group"
    >
      <div className="grid gap-2">
        {isSystem ? (
          <h2>{level.name}</h2>
        ) : (
          <CommitField
            label="Level name"
            value={level.name}
            onCommit={(name) => rename(name)}
          />
        )}
        {/* The variable, as a field that cannot be typed in: it follows the
            name, so it is shown where the name is edited. */}
        <TextInput
          isDisabled
          isLabelHidden
          label="CSS variable"
          size="md"
          value={elevationVariableName(level.id)}
          width="100%"
        />
      </div>
      <CommitField
        label="Description"
        multiline
        value={level.description}
        onCommit={(description) => rename(level.name, description)}
      />
    </div>
  );
}

/**
 * How strong a level's shadow is in each mode: the contact/cast pad, one per
 * mode. Simple mode shows it only for a level of that shape; any other stack
 * is edited layer by layer in Advanced.
 */
export function ElevationLevelStrength({
  scale,
  level,
  shadowHex,
  surfaces,
  onChange,
}: Omit<ElevationLevelSettingsProps, "onSelectLevel">) {
  const [contact, cast] = level.layers;
  if (!contact || !cast) return null;
  return (
    <div
      aria-label={`${level.name} strength`}
      className={styles.settingGroup}
      role="group"
    >
      <div className={styles.elevationPads}>
        {COLOUR_MODES.map((mode) => (
          <div
            key={mode}
            className={styles.elevationPadBlock}
            data-elevation-pad=""
            data-mode={mode}
          >
            <span className={styles.elevationPadLabel}>
              {mode === "light" ? "Light" : "Dark"}
            </span>
            <ElevationPad
              cast={cast.opacity[mode]}
              contact={contact.opacity[mode]}
              label={`${level.name} ${mode} contact and cast`}
              shadow={shadowHex}
              surface={surfaces[mode].card}
              onChange={(nextContact, nextCast) =>
                onChange(
                  setLevelModeOpacities(
                    scale,
                    level.id,
                    mode,
                    nextContact,
                    nextCast,
                  ),
                  `elevation:opacity:${level.id}:${mode}`,
                )
              }
            />
            <span className={styles.elevationPadReadout}>
              Contact {Math.round(contact.opacity[mode] * 100)}%{" · "}
              Cast {Math.round(cast.opacity[mode] * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
