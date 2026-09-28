"use client";

import { useState } from "react";
import { TextArea } from "@astryxdesign/core/TextArea";
import { TextInput } from "@astryxdesign/core/TextInput";
import {
  elevationVariableName,
  isSystemElevationLevel,
  renameElevationLevel,
  type ElevationLevel,
  type ElevationScale,
} from "@blueprint/ui";
import styles from "./scale-workspace.module.css";

interface ElevationLevelSettingsProps {
  scale: ElevationScale;
  level: ElevationLevel;
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
