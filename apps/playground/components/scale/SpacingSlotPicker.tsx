"use client";

import type { SpacingToken } from "@blueprint/ui";
import { SheetSelector } from "../SheetSelector";
import { SPACING_SLOTS, type SpacingSlot } from "./SpacingPreviewTile";
import styles from "./scale-workspace.module.css";

interface SpacingSlotPickerProps {
  /** Every step the scale has, to pick from. */
  tokens: readonly SpacingToken[];
  /** The step each slot is set to. */
  steps: Record<SpacingSlot, SpacingToken>;
  /** The slot a click on the step list sets. */
  active: SpacingSlot;
  onActivate: (slot: SpacingSlot) => void;
  onChange: (slot: SpacingSlot, step: number) => void;
}

/**
 * One selector per spacing slot — Inset, Stack, Columns — each reading as
 * "Inset: 24px". Touching one makes it the active slot, which a click on
 * the step list below then sets; the active one is marked. On a phone each
 * opens as a sheet, as every selector here does.
 */
export function SpacingSlotPicker({
  tokens,
  steps,
  active,
  onActivate,
  onChange,
}: SpacingSlotPickerProps) {
  const options = tokens.map((token) => ({
    value: String(token.step),
    label: `${token.px}px`,
    description: token.variable,
  }));

  return (
    <div
      aria-label="Spacing slots"
      className={styles.spacingSlots}
      role="group"
    >
      {SPACING_SLOTS.map(({ slot, label, icon: Icon }) => (
        /* Pointer and focus both count as touching the slot, so it is the
           active one before its list even opens. */
        <div
          key={slot}
          className={styles.spacingSlot}
          data-active={slot === active || undefined}
          data-spacing-slot={slot}
          onFocusCapture={() => onActivate(slot)}
          onPointerDownCapture={() => onActivate(slot)}
        >
          <SheetSelector
            isLabelHidden
            label={`${label} spacing`}
            options={options}
            renderValue={(option) => `${label}: ${option.label}`}
            size="md"
            startIcon={
              <Icon aria-hidden="true" className={styles.spacingSlotIcon} />
            }
            value={String(steps[slot].step)}
            onChange={(next) => {
              if (next) onChange(slot, Number(next));
            }}
          />
        </div>
      ))}
    </div>
  );
}
