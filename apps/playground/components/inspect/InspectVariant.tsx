"use client";

import {
  SegmentedControl,
  SegmentedControlItem,
} from "@astryxdesign/core/SegmentedControl";
import {
  previewButtonAppearance,
  withButtonVariant,
  type PreviewButtonVariant,
  type PreviewSlotStyle,
} from "@blueprint/ui";
import { InspectSection } from "./InspectPrimitives";
import styles from "./inspect-panel.module.css";

/**
 * How a button is dressed: filled with a light shadow, or outlined with an edge.
 *
 * Choosing one gives the button that pattern's fill, label, edge and shadow, as
 * the system's tokens, in one edit that one undo takes back. Choosing the way
 * the page already draws it hands the button back to the page.
 */
export function VariantSection({
  id,
  style,
  onStyleChange,
}: {
  id: string;
  style: PreviewSlotStyle;
  onStyleChange: (next: PreviewSlotStyle) => void;
}) {
  const current = style.variant ?? previewButtonAppearance(id);
  return (
    <InspectSection title="Variant">
      <div className={styles.item}>
        <SegmentedControl
          label="Button variant"
          layout="fill"
          size="sm"
          value={current}
          onChange={(next) => {
            if (next === current) return;
            onStyleChange(
              withButtonVariant(style, id, next as PreviewButtonVariant),
            );
          }}
        >
          <SegmentedControlItem label="Contained" value="contained" />
          <SegmentedControlItem label="Outlined" value="outlined" />
        </SegmentedControl>
      </div>
    </InspectSection>
  );
}
