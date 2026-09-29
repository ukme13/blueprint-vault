"use client";

import { useState } from "react";
import {
  resolveSpacing,
  spacingStepName,
  type LayoutToken,
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
  token,
  px,
  spacing,
  deviceId,
  deviceName,
  onRebind,
}: {
  /** The use, named as the Uses table names it, bound per frame. */
  token: LayoutToken;
  px: number;
  spacing: SpacingScale;
  deviceId: string;
  deviceName: string;
  onRebind: (use: LayoutUseId, step: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const label = `${token.name} on ${deviceName}`;
  const options = resolveSpacing(spacing).map((token) => ({
    value: spacingStepName(token.step),
    label: token.variable,
    description: `${token.px}px`,
  }));

  return (
    <PopoverOrSheet
      isPopoverFlush
      isOpen={isOpen}
      label={label}
      trigger={
        <button
          aria-label={`${label}: ${Math.round(px)}px. Change step`}
          className={styles.badge}
          data-editable=""
          data-spacing-badge={token.id}
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
        value={token.byDevice[deviceId]}
        onChoose={(option) => {
          onRebind(token.id as LayoutUseId, option.value);
          setIsOpen(false);
          setQuery("");
        }}
        onQueryChange={setQuery}
      />
    </PopoverOrSheet>
  );
}
