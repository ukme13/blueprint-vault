"use client";

import { useState, type CSSProperties } from "react";
import { Slider } from "@astryxdesign/core/Slider";
import { TextArea } from "@astryxdesign/core/TextArea";
import { TextInput } from "@astryxdesign/core/TextInput";
import {
  COLOUR_MODES,
  ELEVATION_OPACITY_MAX,
  ELEVATION_OPACITY_STEP,
  elevationLayerName,
  elevationVariableName,
  isSystemElevationLevel,
  renameElevationLevel,
  setLayerOpacity,
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
        size="sm"
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
      size="sm"
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
      <div className="grid gap-1">
        {isSystem ? (
          <h2>{level.name}</h2>
        ) : (
          <CommitField
            label="Level name"
            value={level.name}
            onCommit={(name) => rename(name)}
          />
        )}
        <code className="font-mono text-xs text-fg-muted">
          {elevationVariableName(level.id)}
        </code>
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
 * How strong a level's shadow is in each mode. A two-layer level gets the
 * contact/cast pad; any other shape gets a slider per layer and mode.
 */
export function ElevationLevelStrength({
  scale,
  level,
  shadowHex,
  surfaces,
  onChange,
}: Omit<ElevationLevelSettingsProps, "onSelectLevel">) {
  return (
    <div
      aria-label={`${level.name} strength`}
      className={styles.settingGroup}
      role="group"
    >
      {level.layers.length === 2 ? (
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
                cast={level.layers[1]!.opacity[mode]}
                contact={level.layers[0]!.opacity[mode]}
                label={`${level.name} ${mode} contact and cast`}
                shadow={shadowHex}
                surface={surfaces[mode].card}
                onChange={(contact, cast) =>
                  onChange(
                    setLevelModeOpacities(scale, level.id, mode, contact, cast),
                    `elevation:opacity:${level.id}:${mode}`,
                  )
                }
              />
              <span className={styles.elevationPadReadout}>
                Contact {Math.round(level.layers[0]!.opacity[mode] * 100)}%
                {" · "}
                Cast {Math.round(level.layers[1]!.opacity[mode] * 100)}%
              </span>
            </div>
          ))}
        </div>
      ) : (
        level.layers.map((layer, layerIndex) => {
          const layerName = elevationLayerName(layerIndex, level.layers.length);
          return (
            <div key={layerIndex} className={styles.elevationLayer}>
              <span className={styles.elevationLayerName}>{layerName}</span>
              {COLOUR_MODES.map((mode) => (
                <div
                  key={mode}
                  className={styles.elevationOpacity}
                  data-elevation-opacity=""
                  data-layer={layerName.toLowerCase()}
                  data-mode={mode}
                  style={
                    {
                      "--elevation-surface": surfaces[mode].card,
                      "--elevation-shadow": shadowHex,
                      "--elevation-opacity": String(layer.opacity[mode]),
                      "--elevation-mix": String(
                        Math.round(ELEVATION_OPACITY_MAX * 100),
                      ),
                    } as CSSProperties
                  }
                >
                  <span className={styles.elevationMode} aria-hidden="true">
                    {mode === "light" ? "Light" : "Dark"}
                  </span>
                  <span className={styles.elevationSlider}>
                    <Slider
                      formatValue={(value) => `${Math.round(value * 100)}%`}
                      isLabelHidden
                      label={`${level.name} ${layerName.toLowerCase()} ${mode}`}
                      max={ELEVATION_OPACITY_MAX}
                      min={0}
                      step={ELEVATION_OPACITY_STEP}
                      value={layer.opacity[mode]}
                      width="100%"
                      onChange={(value: number) =>
                        onChange(
                          setLayerOpacity(
                            scale,
                            level.id,
                            layerIndex,
                            mode,
                            value,
                          ),
                          `elevation:opacity:${level.id}:${layerIndex}:${mode}`,
                        )
                      }
                    />
                  </span>
                </div>
              ))}
            </div>
          );
        })
      )}
    </div>
  );
}
