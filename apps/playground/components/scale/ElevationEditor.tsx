"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@astryxdesign/core/SegmentedControl";
import {
  addElevationLevel,
  Button,
  COLOUR_MODES,
  elevationPreviewSurfaces,
  elevationVariableName,
  isSystemElevationLevel,
  removeElevationLevel,
  resolveElevationLevel,
  type ColorTrack,
  type ElevationLevel,
  type ElevationScale,
} from "@blueprint/ui";
import { useThemeMode } from "../../app/theme-provider";
import { ConfirmDialog } from "../ConfirmDialog";
import { ElevationCopyButton } from "./ElevationCopyButton";
import {
  ELEVATION_PREVIEW_CONTEXTS,
  ElevationPreviewTile,
  type ElevationPreviewContext,
} from "./ElevationPreviewTile";
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
  const { resolved: studioMode } = useThemeMode();
  /* What the shadows are shown on. A view setting, not part of the scale. */
  const [context, setContext] = useState<ElevationPreviewContext>("card");
  /* A custom level asks before it goes: its variable may already be in
     somebody's stylesheet. */
  const [pendingDelete, setPendingDelete] = useState<ElevationLevel | null>(
    null,
  );

  const addLevel = () => {
    const next = addElevationLevel(scale);
    onChange(next);
    const added = next.levels.at(-1);
    if (added) onSelectLevel(added.id);
  };

  return (
    <section aria-label="Elevation" className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedControl
          label="Preview on"
          size="md"
          value={context}
          onChange={(value) => setContext(value as ElevationPreviewContext)}
        >
          {ELEVATION_PREVIEW_CONTEXTS.map((each) => (
            <SegmentedControlItem
              key={each.value}
              label={each.label}
              value={each.value}
            />
          ))}
        </SegmentedControl>
        <Button
          leftIcon={<Plus aria-hidden />}
          scheme="neutral"
          size="medium"
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
          /* Each mode resolved once: the samples draw both, the copy button
             copies the studio's. */
          const css = {
            light: resolveElevationLevel(level, scale, palettes, "light").css,
            dark: resolveElevationLevel(level, scale, palettes, "dark").css,
          };
          return (
            <li
              key={level.id}
              className={`grid cursor-pointer grid-cols-1 items-start gap-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-6 rounded-container p-3 transition-colors ${
                isSelected
                  ? "bg-action-primary/5 ring-2 ring-focus-ring"
                  : "hover:bg-action-primary/5"
              }`}
              data-elevation-level={level.id}
              data-selected={isSelected || undefined}
              onClick={() => onSelectLevel(level.id)}
            >
              {/* Left: the shadow on a light and a dark ground. */}
              <div className={styles.elevationModes}>
                {COLOUR_MODES.map((mode) => (
                  <div key={mode} className={styles.elevationSample}>
                    <div
                      className={styles.elevationGround}
                      style={{ background: surfaces[mode].ground }}
                    >
                      <ElevationPreviewTile
                        context={context}
                        label={`${level.name} on ${mode}`}
                        mode={mode}
                        shadow={css[mode]}
                        surface={surfaces[mode].card}
                      />
                    </div>
                  </div>
                ))}
              </div>
              {/* Right: who the level is. Above the samples on a phone, where
                  the two squares take the width. */}
              <div className="flex min-w-0 items-start justify-between gap-2 max-sm:order-first">
                <div className="grid min-w-0 gap-1">
                  <button
                    aria-pressed={isSelected}
                    className="cursor-pointer border-0 bg-transparent p-0 text-left text-sm font-semibold text-fg-primary"
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelectLevel(level.id);
                    }}
                  >
                    {level.name}
                  </button>
                  <span className="flex items-center gap-1">
                    <code className="font-mono text-xs text-fg-muted">
                      {elevationVariableName(level.id)}
                    </code>
                    <ElevationCopyButton
                      css={css[studioMode]}
                      levelName={level.name}
                      mode={studioMode}
                    />
                  </span>
                  {level.description ? (
                    <p className="m-0 text-xs text-fg-secondary">
                      {level.description}
                    </p>
                  ) : null}
                </div>
                {isSystemElevationLevel(level.id) ? null : (
                  <button
                    aria-label={`Delete ${level.name}`}
                    className="inline-flex shrink-0 cursor-pointer items-center rounded-inner border-0 bg-transparent p-1 text-fg-muted hover:bg-surface-raised hover:text-fg-primary"
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setPendingDelete(level);
                    }}
                  >
                    <Trash2 aria-hidden className="size-4" />
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      <ConfirmDialog
        actionLabel="Delete level"
        description={
          pendingDelete
            ? `This removes the level and its ${elevationVariableName(pendingDelete.id)} CSS variable.`
            : ""
        }
        isOpen={pendingDelete !== null}
        title={`Delete elevation level "${pendingDelete?.name ?? ""}"?`}
        onAction={() => {
          if (pendingDelete) {
            onChange(removeElevationLevel(scale, pendingDelete.id));
          }
          setPendingDelete(null);
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </section>
  );
}
