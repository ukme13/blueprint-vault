"use client";

import type { ReactNode } from "react";
import { Icon } from "@astryxdesign/core/Icon";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Check } from "lucide-react";
import {
  sheetOptionGroups,
  type SheetOption,
  type SheetOptionInput,
} from "@blueprint/ui";
import styles from "./sheet-selector.module.css";

export function renderOptionIcon(icon: unknown): ReactNode {
  if (icon === undefined || icon === null) return null;
  /* Astryx accepts an icon's name as well as an element. */
  if (typeof icon === "string") return <Icon icon={icon as never} />;
  return icon as ReactNode;
}

interface SelectorOptionListProps {
  /** The list's accessible name. */
  label: string;
  options: readonly SheetOptionInput[];
  value: string | undefined;
  onChoose: (option: SheetOption) => void;
  /** Owned by the caller, so it can clear the search when it closes. */
  query: string;
  onQueryChange: (query: string) => void;
  hasSearch?: boolean;
  searchPlaceholder?: string;
  /**
   * `comfortable` rows are 44px, for a thumb in a phone sheet. `compact`
   * rows are a dropdown's, for a popover under a pointer, and the list
   * scrolls inside a fixed height.
   */
  density?: "comfortable" | "compact";
  /** Focus the search when the list appears, so typing filters at once. */
  hasAutoFocus?: boolean;
}

/**
 * A searchable, grouped option list: the body of every phone selector sheet,
 * and of a desktop popover that wants the same list.
 */
export function SelectorOptionList({
  label,
  options,
  value,
  onChoose,
  query,
  onQueryChange,
  hasSearch,
  searchPlaceholder,
  density = "comfortable",
  hasAutoFocus,
}: SelectorOptionListProps) {
  const groups = sheetOptionGroups([...options], query);

  return (
    <>
      {hasSearch && (
        <TextInput
          hasAutoFocus={hasAutoFocus}
          isLabelHidden
          label={`Search ${label.toLowerCase()}`}
          placeholder={searchPlaceholder ?? "Search"}
          size={density === "compact" ? "sm" : undefined}
          value={query}
          width="100%"
          onChange={onQueryChange}
        />
      )}

      <div
        aria-label={label}
        className={styles.list}
        data-density={density}
        role="listbox"
      >
        {groups.length === 0 && (
          <p className={styles.empty}>No results found</p>
        )}
        {groups.map((group, index) => (
          <div
            key={group.title ?? `group-${index}`}
            aria-label={group.title}
            className={styles.group}
            role="group"
          >
            {group.title && (
              <p aria-hidden className={styles.groupTitle}>
                {group.title}
              </p>
            )}
            {group.options.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  aria-selected={isSelected}
                  className={styles.option}
                  disabled={option.disabled}
                  role="option"
                  type="button"
                  onClick={() => onChoose(option)}
                >
                  {renderOptionIcon(option.icon)}
                  <span className={styles.optionLabel}>
                    {option.label ?? option.value}
                  </span>
                  {isSelected && <Check aria-hidden className={styles.check} />}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </>
  );
}
