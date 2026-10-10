"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import type { SheetOption, SheetOptionInput } from "@blueprint/ui";
import { PopoverOrSheet } from "../PopoverOrSheet";
import { SelectorOptionList } from "../SelectorOptionList";
import styles from "./inspect-panel.module.css";

const CLEAR = "__clear__";

interface TokenSelectProps {
  /** Its accessible name, and the name of the list it opens. */
  label: string;
  options: readonly SheetOptionInput[];
  value: string | undefined;
  /** What the trigger shows: its mark, and its words. Nothing set, the placeholder. */
  display?: { icon?: ReactNode; text: ReactNode } | null;
  /** Said when nothing is set: what the page does on its own. */
  placeholder?: string;
  /** The value is several, which disagree. */
  isMixed?: boolean;
  /** A mark ahead of the words, whatever the value. */
  leading?: ReactNode;
  /** Adds a first choice that puts the value back to nothing. */
  clearLabel?: string;
  hasSearch?: boolean;
  /** `undefined` is the clear choice. */
  onChange: (value: string | undefined) => void;
}

/**
 * One 24px control that picks a token from a list.
 *
 * The list is the studio's own: a popover on a wide screen and a sheet on a
 * phone, searchable where it is long. Built only while it is open, since a
 * panel holds a dozen of these and a closed popover would otherwise keep its
 * list mounted.
 */
export function TokenSelect({
  label,
  options,
  value,
  display,
  placeholder = "Default",
  isMixed = false,
  leading,
  clearLabel,
  hasSearch = false,
  onChange,
}: TokenSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");

  const close = () => {
    setIsOpen(false);
    setQuery("");
  };
  const list: SheetOptionInput[] = clearLabel
    ? [{ value: CLEAR, label: clearLabel }, ...options]
    : [...options];
  const choose = (option: SheetOption) => {
    onChange(option.value === CLEAR ? undefined : option.value);
    close();
  };

  const shown = isMixed ? (
    <span className={styles.value}>Mixed</span>
  ) : display ? (
    <>
      {display.icon ? (
        <span className={styles.lead}>{display.icon}</span>
      ) : null}
      <span className={styles.value}>{display.text}</span>
    </>
  ) : (
    <span className={`${styles.value} ${styles.placeholder}`}>
      {placeholder}
    </span>
  );

  return (
    <PopoverOrSheet
      isOpen={isOpen}
      isPopoverFlush
      label={label}
      trigger={
        <button
          aria-label={label}
          className={styles.control}
          type="button"
          style={{ paddingInlineStart: leading || display?.icon ? 0 : 8 }}
        >
          {leading ? <span className={styles.lead}>{leading}</span> : null}
          {shown}
          <span aria-hidden className={styles.chevron}>
            <ChevronDown className="size-3" />
          </span>
        </button>
      }
      width={240}
      onOpenChange={(open) => (open ? setIsOpen(true) : close())}
    >
      <SelectorOptionList
        density="compact"
        hasAutoFocus={hasSearch}
        hasDescriptions
        hasSearch={hasSearch}
        label={label}
        options={list}
        query={query}
        searchPlaceholder="Search"
        value={value ?? (clearLabel && !isMixed ? CLEAR : undefined)}
        onChoose={choose}
        onQueryChange={setQuery}
      />
    </PopoverOrSheet>
  );
}
