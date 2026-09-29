"use client";

import { Text } from "@astryxdesign/core/Text";
import {
  WORKSPACE_PRESETS,
  workspacePresetDetails,
  type WorkspacePreset,
} from "@blueprint/ui";
import styles from "./new-project-dialog.module.css";

/**
 * The presets as cards, two to a row, as a template browser lays them out:
 * a picture of each starting point, then its name. What it is in detail
 * is the panel beside, so a card does not repeat it in a sentence.
 *
 * Each card is a label around a real radio, visually hidden. So the group
 * is one tab stop, the arrow keys move the choice, Space picks, and a
 * screen reader hears "Stripe Vibrant, radio button, 2 of 5". The ring follows the radio's own focus and
 * checked state; nothing is re-implemented.
 */
export function PresetGallery({
  presetId,
  onPresetChange,
}: {
  presetId: string;
  onPresetChange: (presetId: string) => void;
}) {
  return (
    /* A labelled group rather than a fieldset: a legend cannot be the bar
       across the column's top that the details panel has beside it. */
    <div
      aria-labelledby="preset-gallery-title"
      className={styles.gallery}
      role="group"
    >
      <div className={styles.columnHead} id="preset-gallery-title">
        <Text type="supporting" weight="semibold">
          Starting point
        </Text>
      </div>
      <div className={styles.galleryScroll}>
        <div className={styles.galleryGrid}>
          {WORKSPACE_PRESETS.map((preset) => (
            <PresetCard
              key={preset.id}
              isSelected={preset.id === presetId}
              preset={preset}
              onSelect={() => onPresetChange(preset.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function PresetCard({
  preset,
  isSelected,
  onSelect,
}: {
  preset: WorkspacePreset;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const details = workspacePresetDetails(preset);
  const nameId = `preset-${preset.id}-name`;

  return (
    <label
      className={styles.presetCard}
      data-selected={isSelected || undefined}
    >
      <input
        aria-labelledby={nameId}
        checked={isSelected}
        className={styles.presetRadio}
        name="workspace-preset"
        type="radio"
        value={preset.id}
        onChange={onSelect}
      />
      {/* The system at a glance: its brand seeds as a bar, and a sample in
          its lead typeface. Colours are data, so they arrive inline. */}
      <span aria-hidden="true" className={styles.presetThumb}>
        <span className={styles.presetBar}>
          <span style={{ background: details.primaryHex }} />
          <span style={{ background: details.secondaryHex }} />
          <span style={{ background: details.neutralHex }} />
        </span>
        <span
          className={styles.presetSample}
          style={{ fontFamily: preset.typography?.fontFamily }}
        >
          Aa
        </span>
      </span>
      <span className={styles.presetText}>
        <Text id={nameId} type="label" weight="semibold">
          {preset.name}
        </Text>
      </span>
    </label>
  );
}
