"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import { Icon } from "@astryxdesign/core/Icon";
import { Check } from "lucide-react";
import {
  sheetOptionGroups,
  type SheetOption,
  type SheetOptionInput,
} from "@blueprint/ui";
import { SelectorSearch } from "./SelectorSearch";
import { useIsPhone } from "./use-is-phone";
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
  /**
   * What sits above the search in a phone sheet: its title, and a notice if
   * it has one. Held at the top with the search while the options scroll.
   */
  header?: ReactNode;
  /** Focus the search each time the list is shown, so typing filters at once. */
  hasAutoFocus?: boolean;
  /**
   * Show each option's text description beside its label, and let the search
   * read it: a size next to a name, found by typing the size.
   */
  hasDescriptions?: boolean;
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
  density: requestedDensity = "comfortable",
  hasAutoFocus,
  hasDescriptions = false,
  header,
}: SelectorOptionListProps) {
  /* On a phone every selector is a sheet, so a list asked for as a
     dropdown's is drawn as a sheet's: 44px rows, 16px, and the search held
     at the top with its divider run to the sheet's edges. */
  const isPhone = useIsPhone();
  const density = isPhone ? "comfortable" : requestedDensity;
  const groups = sheetOptionGroups([...options], query, {
    searchDescriptions: hasDescriptions,
  });
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

  const searchProps = {
    ref: searchRef,
    "aria-label": `Search ${label.toLowerCase()}`,
    placeholder: searchPlaceholder ?? "Search",
    value: query,
    onValueChange: onQueryChange,
  };

  return (
    <>
      {hasSearch && density === "compact" && (
        <SelectorSearch {...searchProps} density="compact" type="search" />
      )}
      {density === "comfortable" && (header || hasSearch) && (
        /* Held at the top of the sheet while the options scroll under it:
           a long list of shades used to carry the search off the screen,
           and with it the way to narrow the list. */
        <div className={styles.stickyHead}>
          {header}
          {hasSearch && (
            <SelectorSearch {...searchProps} density="comfortable" />
          )}
        </div>
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
                  {hasDescriptions &&
                    typeof option.description === "string" && (
                      <span className={styles.optionDescription}>
                        {option.description}
                      </span>
                    )}
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
