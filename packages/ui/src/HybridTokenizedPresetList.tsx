"use client";

import type { KeyboardEvent } from "react";
import { TextInput } from "@astryxdesign/core/TextInput";
import {
  formatListValue,
  type HybridTokenPreset,
  type HybridTokenizedValue,
} from "./hybrid-tokenized-input";

export interface HybridTokenizedPresetListProps {
  decimals: number;
  filtered: readonly HybridTokenPreset[];
  highlight: number;
  listId: string;
  popoverTitle: string;
  query: string;
  searchPlaceholder: string;
  value: HybridTokenizedValue;
  valueSuffix: string;
  onHighlight: (index: number) => void;
  onQueryChange: (query: string) => void;
  onSearchKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onSelect: (preset: HybridTokenPreset) => void;
}

export function HybridTokenizedPresetList({
  decimals,
  filtered,
  highlight,
  listId,
  popoverTitle,
  query,
  searchPlaceholder,
  value,
  valueSuffix,
  onHighlight,
  onQueryChange,
  onSearchKeyDown,
  onSelect,
}: HybridTokenizedPresetListProps) {
  return (
    <div className="flex w-full flex-col overflow-hidden">
      <div className="border-b border-border-default pb-[var(--spacing-2)]">
        <TextInput
          hasClear
          isLabelHidden
          label="Search presets"
          placeholder={searchPlaceholder}
          size="sm"
          value={query}
          onChange={onQueryChange}
          onKeyDown={onSearchKeyDown}
        />
      </div>
      <p className="px-[var(--spacing-2)] py-[var(--spacing-1)] text-xs font-semibold tracking-wider text-fg-muted uppercase">
        {popoverTitle}
      </p>
      <div
        aria-activedescendant={
          highlight >= 0 ? `${listId}-${highlight}` : undefined
        }
        aria-label={popoverTitle}
        className="max-h-56 overflow-y-auto py-[var(--spacing-1)]"
        id={listId}
        role="listbox"
      >
        {filtered.length === 0 ? (
          <p className="px-[var(--spacing-2)] py-[var(--spacing-3)] text-center text-xs text-fg-muted">
            No presets matching “{query}”
          </p>
        ) : (
          filtered.map((preset, index) => {
            const selected = value.isPreset && value.presetId === preset.id;
            const active = index === highlight;
            const rowTone = selected
              ? "bg-action-primary-surface text-fg-accent"
              : active
                ? "bg-[color-mix(in_srgb,var(--color-fg-primary)_10%,transparent)] text-fg-primary"
                : "text-fg-primary hover:bg-[color-mix(in_srgb,var(--color-fg-primary)_10%,transparent)]";
            return (
              <button
                aria-selected={selected}
                className={`flex w-full cursor-pointer items-center justify-between rounded-[var(--radius-inner)] px-[var(--spacing-2)] py-[var(--spacing-2)] text-left text-xs ${rowTone}`}
                id={`${listId}-${index}`}
                key={preset.id}
                role="option"
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault();
                  onSelect(preset);
                }}
                onMouseEnter={() => onHighlight(index)}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="flex size-4 items-center justify-center rounded border border-border-default bg-surface-subtle font-mono text-xs text-fg-muted"
                  >
                    #
                  </span>
                  <span className="truncate">{preset.name}</span>
                </span>
                <span className="font-mono text-xs text-fg-muted">
                  {formatListValue(preset.value, decimals, valueSuffix)}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
