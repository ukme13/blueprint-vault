"use client";

import { useState } from "react";
import {
  resolveSpacing,
  spacingStepName,
  type SpacingScale,
} from "@blueprint/ui";
import { PopoverOrSheet } from "../PopoverOrSheet";
import { SelectorOptionList } from "../SelectorOptionList";
import type { LayoutUseId } from "./measure-spacing-zones";
import styles from "./spacing-overlay.module.css";

/**
 * A size tag on a space a layout use sizes: Container inset, Section gap,
 * Grid gap, Navigation gap or Card inset. A click opens the spacing steps, as a popover or, on a phone, a
 * sheet, and the pick rebinds that use on the frame being previewed.
 */
export function SpacingUseBadge({
  use,
  name,
  px,
  step,
  spacing,
  deviceName,
  onRebind,
}: {
  use: LayoutUseId;
  /** The use's own name, as the Uses table shows it. */
  name: string;
  px: number;
  /** The step the use is bound to on this frame, when it is a step. */
  step: string | undefined;
  spacing: SpacingScale;
  deviceName: string;
  onRebind: (use: LayoutUseId, step: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const label = `${name} on ${deviceName}`;
  const options = resolveSpacing(spacing).map((token) => ({
    value: spacingStepName(token.step),
    label: token.variable,
    description: `${token.px}px`,
  }));

  return (
    <PopoverOrSheet
      isOpen={isOpen}
      label={label}
      trigger={
        <button
          aria-label={`${label}: ${Math.round(px)}px. Change step`}
          className={styles.badge}
          data-editable=""
          data-spacing-badge={use}
          type="button"
        >
          {Math.round(px)}px
        </button>
      }
      width={240}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) setQuery("");
      }}
    >
      <SelectorOptionList
        density="compact"
        hasAutoFocus
        hasSearch
        label={label}
        options={options}
        query={query}
        searchPlaceholder="Search steps"
        value={step}
        onChoose={(option) => {
          onRebind(use, option.value);
          setIsOpen(false);
          setQuery("");
        }}
        onQueryChange={setQuery}
      />
    </PopoverOrSheet>
  );
}
