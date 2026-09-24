"use client";

import { useState, type ComponentProps, type ReactNode } from "react";
import { Icon } from "@astryxdesign/core/Icon";
import { Selector } from "@astryxdesign/core/Selector";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Check, ChevronDown } from "lucide-react";
import {
  findSheetOption,
  sheetOptionGroups,
  type SheetOption,
} from "@blueprint/ui";
import { Sheet } from "./Sheet";
import styles from "./sheet-selector.module.css";
import { useIsPhone } from "./use-is-phone";

/**
 * A selector that opens a bottom sheet on a phone.
 *
 * On a wide screen this is Astryx's `Selector`, props and all. On a phone a
 * dropdown is a short list pinned under a small trigger, scrolled with a
 * thumb that covers half of it; a sheet from the bottom edge gives the same
 * options the width of the screen and rows a thumb can hit. The same options
 * drive both, so the two cannot drift apart.
 *
 * The sheet closes on a choice, and on its backdrop, a swipe or Escape.
 */

type SheetSelectorProps = ComponentProps<typeof Selector>;

function renderIcon(icon: unknown): ReactNode {
  if (icon === undefined || icon === null) return null;
  /* Astryx accepts an icon's name as well as an element. */
  if (typeof icon === "string") return <Icon icon={icon as never} />;
  return icon as ReactNode;
}

export function SheetSelector(props: SheetSelectorProps) {
  const isPhone = useIsPhone();
  if (!isPhone) return <Selector {...props} />;
  return <PhoneSelector {...props} />;
}

function PhoneSelector({
  label,
  options,
  value,
  onChange,
  placeholder = "Select...",
  hasSearch,
  searchPlaceholder,
  startIcon,
  renderValue,
  variant = "input",
  size = "md",
  width = "100%",
}: SheetSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selected = findSheetOption(options, value ?? undefined);

  return (
    <>
      <button
        aria-haspopup="dialog"
        aria-label={`${label}: ${selected?.label ?? selected?.value ?? placeholder}`}
        className={styles.trigger}
        data-size={size}
        data-variant={variant}
        style={{ width: variant === "ghost" ? undefined : width }}
        type="button"
        onClick={() => setIsOpen(true)}
      >
        {renderIcon(startIcon)}
        <span className={styles.triggerValue}>
          {selected
            ? renderValue
              ? renderValue(selected as never)
              : (selected.label ?? selected.value)
            : placeholder}
        </span>
        <ChevronDown aria-hidden className={styles.chevron} />
      </button>

      <SelectorSheet
        hasSearch={hasSearch}
        isOpen={isOpen}
        label={label}
        options={options}
        searchPlaceholder={searchPlaceholder}
        value={value ?? undefined}
        onChange={(next) => onChange?.(next)}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}

interface SelectorSheetProps {
  isOpen: boolean;
  onClose: () => void;
  /** The sheet's title, and its accessible name. */
  label: string;
  options: SheetSelectorProps["options"];
  value: string | undefined;
  onChange: (value: string) => void;
  hasSearch?: boolean;
  searchPlaceholder?: string;
  /** Shown under the title, above the search: a warning about the value. */
  notice?: ReactNode;
}

/**
 * The option sheet on its own, for a trigger that is not a selector.
 *
 * `SheetSelector` opens this from its own button. A control with a trigger
 * of its own, such as the semantic table's colour chip, opens it directly,
 * so every choice on a phone is the same sheet: one searchable list, rows a
 * thumb can hit, closed by a choice, the backdrop, a swipe or Escape. The
 * search resets when it closes, so the next open starts from everything.
 */
export function SelectorSheet({
  isOpen,
  onClose,
  label,
  options,
  value,
  onChange,
  hasSearch,
  searchPlaceholder,
  notice,
}: SelectorSheetProps) {
  const [query, setQuery] = useState("");
  const groups = sheetOptionGroups(options, query);

  const close = () => {
    onClose();
    setQuery("");
  };

  const choose = (option: SheetOption) => {
    onChange(option.value);
    close();
  };

  return (
    <Sheet
      className={styles.sheet}
      isOpen={isOpen}
      label={label}
      onClose={close}
    >
      <h2 className={styles.title}>{label}</h2>
      {notice}
      {hasSearch && (
        <TextInput
          isLabelHidden
          label={`Search ${label.toLowerCase()}`}
          placeholder={searchPlaceholder ?? "Search"}
          value={query}
          width="100%"
          onChange={setQuery}
        />
      )}

      <div aria-label={label} className={styles.list} role="listbox">
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
                  onClick={() => choose(option)}
                >
                  {renderIcon(option.icon)}
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
    </Sheet>
  );
}
