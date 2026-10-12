"use client";

import {
  SegmentedControl,
  SegmentedControlItem,
} from "@astryxdesign/core/SegmentedControl";
import { isSquishRatio, SQUISH_RATIOS, type SquishRatio } from "@blueprint/ui";
import styles from "./scale-workspace.module.css";

interface SpacingSquishSettingProps {
  squish: SquishRatio;
  /** One step in history per choice. */
  onChange: (squish: SquishRatio) => void;
}

/**
 * Squish: how tall a control's padding is against how wide, for the whole
 * system. Every block inset with an inline partner (`…-y` beside `…-x`)
 * follows it in the Uses table, on every frame not typed by hand.
 *
 * The segments say the share; the line above says what 50% and 100% are, so
 * four short labels fit an inspector the width of a phone.
 */
export function SpacingSquishSetting({
  squish,
  onChange,
}: SpacingSquishSettingProps) {
  return (
    <div className={styles.settingGroup}>
      <h2>Squish</h2>
      <p className={styles.settingHint}>
        Block insets as a share of their inline partner: 50% is 1:2, 100% is
        symmetric.
      </p>
      <SegmentedControl
        label="Squish"
        size="md"
        value={String(squish)}
        onChange={(value) => {
          const ratio = Number(value);
          if (isSquishRatio(ratio)) onChange(ratio);
        }}
      >
        {SQUISH_RATIOS.map((ratio) => (
          <SegmentedControlItem
            key={ratio}
            label={`${Math.round(ratio * 100)}%`}
            value={String(ratio)}
          />
        ))}
      </SegmentedControl>
    </div>
  );
}
