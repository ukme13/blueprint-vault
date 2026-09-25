"use client";

import { Plus, Trash2 } from "lucide-react";
import {
  addElevationLevel,
  Button,
  COLOUR_MODES,
  elevationPreviewSurfaces,
  elevationVariableName,
  isSystemElevationLevel,
  removeElevationLevel,
  resolveElevation,
  type ColorTrack,
  type ElevationScale,
} from "@blueprint/ui";
import styles from "./scale-workspace.module.css";

interface ElevationCanvasProps {
  scale: ElevationScale;
  palettes: ColorTrack[];
  selectedLevelId: string;
  onChange: (scale: ElevationScale) => void;
  onSelectLevel: (id: string) => void;
}

/**
 * Every level on a light and a dark ground, and the way to pick one.
 *
 * The inspector edits one level at a time, the one picked here. A click
 * anywhere on a row picks it; the name is a button too, so the keyboard and
 * a screen reader reach it. Levels an author added can be removed from
 * their row; Low, Medium and High cannot.
 */
export function ElevationCanvas({
  scale,
  palettes,
  selectedLevelId,
  onChange,
  onSelectLevel,
}: ElevationCanvasProps) {
  const surfaces = elevationPreviewSurfaces(palettes);

  const addLevel = () => {
    const next = addElevationLevel(scale);
    onChange(next);
    const added = next.levels.at(-1);
    if (added) onSelectLevel(added.id);
  };

  return (
    <section aria-label="Elevation" className="grid gap-4">
      <div className="flex justify-start">
        <Button
          leftIcon={<Plus aria-hidden />}
          scheme="neutral"
          size="small"
          type="button"
          variant="outlined"
          onClick={addLevel}
        >
          Add level
        </Button>
      </div>
      <ol className={styles.elevationList}>
        {scale.levels.map((level) => {
          const isSelected = level.id === selectedLevelId;
          return (
            <li
              key={level.id}
              className={`grid cursor-pointer gap-2 rounded-container p-3 transition-colors ${
                isSelected
                  ? "bg-action-primary/5 ring-2 ring-focus-ring"
                  : "hover:bg-action-primary/5"
              }`}
              data-elevation-level={level.id}
              data-selected={isSelected || undefined}
              onClick={() => onSelectLevel(level.id)}
            >
              <div className={styles.elevationHead}>
                <button
                  aria-pressed={isSelected}
                  className="cursor-pointer border-0 bg-transparent p-0 text-left font-semibold text-fg-primary"
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelectLevel(level.id);
                  }}
                >
                  {level.name}
                </button>
                <code>{elevationVariableName(level.id)}</code>
                <span>{level.description}</span>
                {isSystemElevationLevel(level.id) ? null : (
                  <button
                    aria-label={`Delete ${level.name}`}
                    className="ml-auto inline-flex cursor-pointer items-center rounded-inner border-0 bg-transparent p-1 text-fg-muted hover:bg-surface-raised hover:text-fg-primary"
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onChange(removeElevationLevel(scale, level.id));
                    }}
                  >
                    <Trash2 aria-hidden className="size-4" />
                  </button>
                )}
              </div>
              <div className={styles.elevationModes}>
                {COLOUR_MODES.map((mode) => {
                  const resolved = resolveElevation(scale, palettes, mode).find(
                    (each) => each.id === level.id,
                  );
                  return (
                    <div key={mode} className={styles.elevationSample}>
                      <div
                        className={styles.elevationGround}
                        style={{ background: surfaces[mode].ground }}
                      >
                        <span
                          aria-label={`${level.name} on ${mode}`}
                          className={styles.elevationCard}
                          data-mode={mode}
                          style={{
                            background: surfaces[mode].card,
                            boxShadow: resolved?.css,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
