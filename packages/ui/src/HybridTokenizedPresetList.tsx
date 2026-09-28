"use client";

import type { KeyboardEvent } from "react";
import { Search } from "lucide-react";
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
      {/* Figma's variable search: a borderless row over a hairline. */}
      <label className="flex items-center gap-[var(--spacing-2)] border-b border-border-default px-[var(--spacing-2)] pb-[var(--spacing-2)]">
        <Search aria-hidden className="size-4 shrink-0 text-fg-muted" />
        <input
          aria-label="Search presets"
          autoComplete="off"
          className="min-w-0 flex-1 border-0 bg-transparent text-sm text-fg-primary outline-none placeholder:text-fg-muted"
          placeholder={searchPlaceholder}
          type="text"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          onKeyDown={onSearchKeyDown}
        />
      </label>
      <p className="px-[var(--spacing-2)] pt-[var(--spacing-3)] pb-[var(--spacing-1)] text-xs font-medium text-fg-muted">
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
            /* Neutral, as Figma's variable list: the picked preset a quiet
               tint and a heavier weight, the highlighted one a touch more. */
            const rowTone = active
              ? "bg-[color-mix(in_srgb,var(--color-fg-primary)_10%,transparent)]"
              : selected
                ? "bg-[color-mix(in_srgb,var(--color-fg-primary)_6%,transparent)]"
                : "hover:bg-[color-mix(in_srgb,var(--color-fg-primary)_10%,transparent)]";
            return (
              <button
                aria-selected={selected}
                className={`flex w-full cursor-pointer items-center justify-between rounded-[var(--radius-inner)] px-[var(--spacing-2)] py-[var(--spacing-2)] text-left text-xs text-fg-primary ${rowTone}`}
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
                  <span className={`truncate ${selected ? "font-medium" : ""}`}>
                    {preset.name}
                  </span>
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
