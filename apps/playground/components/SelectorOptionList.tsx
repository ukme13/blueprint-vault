"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import { Icon } from "@astryxdesign/core/Icon";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Check, Search } from "lucide-react";
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
  /** Focus the search each time the list is shown, so typing filters at once. */
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
  const listRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  /*
   * Open on the chosen option, centred, rather than at the top of a long
   * list. Every time the list is shown, not once: Astryx's Popover and
   * BottomSheet keep their content mounted while closed and only hide it, so
   * a mount effect centred the first open and never the next. A hidden list
   * has no height, so a ResizeObserver sees each open as the height going
   * from zero to something. A search that narrows an open list changes the
   * height but never to zero, so it does not re-centre.
   *
   * A list that scrolls itself (compact) moves its own scrollTop, so the page
   * under a popover never jumps; in a sheet the sheet scrolls.
   */
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const centre = () => {
      const selected = list.querySelector<HTMLElement>(
        '[aria-selected="true"]',
      );
      if (!selected) return;
      if (list.scrollHeight > list.clientHeight) {
        const listBox = list.getBoundingClientRect();
        const optionBox = selected.getBoundingClientRect();
        list.scrollTop +=
          optionBox.top - listBox.top - (listBox.height - optionBox.height) / 2;
      } else {
        selected.scrollIntoView({ block: "center" });
      }
    };
    let wasShown = false;
    const observer = new ResizeObserver(() => {
      const isShown = list.clientHeight > 0;
      if (isShown && !wasShown) {
        centre();
        /* The same for focus: Astryx focuses on mount only. */
        if (hasAutoFocus) searchRef.current?.focus({ preventScroll: true });
      }
      wasShown = isShown;
    });
    observer.observe(list);
    return () => observer.disconnect();
  }, [hasAutoFocus]);

  return (
    <>
      {hasSearch && density === "compact" && (
        /* A dropdown's header: a magnifier and a borderless field over a
           line the width of the panel, as Astryx's own Selector draws it. */
        <label className="flex items-center gap-2 border-b border-border-subtle px-3 py-2">
          <Search aria-hidden className="size-4 shrink-0 text-fg-muted" />
          <input
            ref={searchRef}
            aria-label={`Search ${label.toLowerCase()}`}
            className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm text-fg-primary outline-none placeholder:text-fg-muted"
            placeholder={searchPlaceholder ?? "Search"}
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
          />
        </label>
      )}
      {hasSearch && density === "comfortable" && (
        <TextInput
          ref={searchRef}
          isLabelHidden
          label={`Search ${label.toLowerCase()}`}
          placeholder={searchPlaceholder ?? "Search"}
          value={query}
          width="100%"
          onChange={onQueryChange}
        />
      )}

      <div
        ref={listRef}
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
