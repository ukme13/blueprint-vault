"use client";

import { useState } from "react";
import {
  resolveSpacing,
  spacingStepName,
  spacingUses,
  type LayoutToken,
  type SpacingScale,
} from "@blueprint/ui";
import { PopoverOrSheet } from "../PopoverOrSheet";
import { SelectorOptionList } from "../SelectorOptionList";
import { useIsPhone } from "../use-is-phone";
import type { LayoutUseId } from "./measure-spacing-zones";
import styles from "./spacing-overlay.module.css";

type PickerTab = "uses" | "steps";

const TABS: readonly { id: PickerTab; label: string }[] = [
  { id: "uses", label: "Uses" },
  { id: "steps", label: "Steps" },
];

/**
 * A size tag on a space a layout use sizes: Container inset, Section gap,
 * Grid gap, Navigation gap or Card inset. A click opens a popover or, on a
 * phone, a sheet, with two ways to pick: Uses, to take the size another use
 * has on this frame, and Steps, the spacing steps themselves. Either pick
 * rebinds that use on the frame being previewed.
 */
export function SpacingUseBadge({
  token,
  px,
  spacing,
  layout,
  deviceId,
  deviceName,
  onRebind,
}: {
  /** The use, named as the Uses table names it, bound per frame. */
  token: LayoutToken;
  px: number;
  spacing: SpacingScale;
  /** Every layout use, for the Uses tab. */
  layout: readonly LayoutToken[];
  deviceId: string;
  deviceName: string;
  onRebind: (use: LayoutUseId, step: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<PickerTab>("uses");
  const isPhone = useIsPhone();
  const label = `${token.name} on ${deviceName}`;
  const uses = spacingUses(spacing, layout, deviceId);
  const chips = (
    <>
      <span className={`${styles.tabHeader} ${isPhone ? styles.inSheet : ""}`}>
        <span
          aria-label="Pick from"
          className={styles.chipGroup}
          role="tablist"
        >
          {TABS.map((each) => (
            <button
              key={each.id}
              aria-selected={tab === each.id}
              className={styles.chip}
              role="tab"
              type="button"
              onClick={() => {
                setTab(each.id);
                setQuery("");
              }}
            >
              {each.label}
            </button>
          ))}
        </span>
      </span>
      <hr className={`${styles.tabDivider} ${isPhone ? styles.inSheet : ""}`} />
    </>
  );
  const options =
    tab === "uses"
      ? uses.map((use) => ({
          value: use.id,
          label: use.name,
          description: `${Math.round(use.px)}px`,
        }))
      : resolveSpacing(spacing).map((each) => ({
          value: spacingStepName(each.step),
          label: each.variable,
          description: `${each.px}px`,
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
        if (!open) {
          setQuery("");
          setTab("uses");
        }
      }}
    >
      <span className={styles.picker}>
        {!isPhone && chips}
        <SelectorOptionList
          key={tab}
          header={isPhone ? chips : undefined}
          density="compact"
          hasAutoFocus
          hasDescriptions
          hasSearch
          label={label}
          options={options}
          query={query}
          searchPlaceholder={tab === "uses" ? "Search uses" : "Search steps"}
          /* Own entry on Uses: another use may sit on the same step, and one
           check is clearer than several. */
          value={tab === "uses" ? token.id : token.byDevice[deviceId]}
          onChoose={(option) => {
            const chosen =
              tab === "uses"
                ? uses.find((use) => use.id === option.value)?.value
                : option.value;
            if (chosen !== undefined) onRebind(token.id as LayoutUseId, chosen);
            setIsOpen(false);
            setQuery("");
          }}
          onQueryChange={setQuery}
        />
      </span>
    </PopoverOrSheet>
  );
}
