"use client";

import { useId, useState, type ComponentProps, type ReactNode } from "react";
import { Selector } from "@astryxdesign/core/Selector";
import { ChevronDown } from "lucide-react";
import { findSheetOption, type SheetOption } from "@blueprint/ui";
import { SelectorOptionList, renderOptionIcon } from "./SelectorOptionList";
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

type SheetSelectorProps = ComponentProps<typeof Selector> & {
  /** Whether the trigger shows its chevron. A swatch trigger reads as a
      control without one. */
  hasChevron?: boolean;
};

export function SheetSelector({
  hasChevron = true,
  ...props
}: SheetSelectorProps) {
  const isPhone = useIsPhone();
  if (isPhone) return <PhoneSelector {...props} hasChevron={hasChevron} />;
  if (hasChevron) return <Selector {...props} />;
  /* Astryx has no prop for it; its chevron carries a stable theme class,
     hidden from this wrapper, which lays out nothing. */
  return (
    <span className={styles.noChevron}>
      <Selector {...props} />
    </span>
  );
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
  hasChevron,
  isDisabled = false,
  disabledMessage,
}: SheetSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selected = findSheetOption(options, value ?? undefined);
  const messageId = useId();

  return (
    <>
      {/* aria-disabled rather than disabled, as Astryx's Selector does, so the
          trigger stays focusable and the reason it is off can still be read. */}
      <button
        aria-describedby={isDisabled && disabledMessage ? messageId : undefined}
        aria-disabled={isDisabled || undefined}
        aria-haspopup="dialog"
        aria-label={`${label}: ${selected?.label ?? selected?.value ?? placeholder}`}
        className={styles.trigger}
        data-size={size}
        data-variant={variant}
        style={{ width: variant === "ghost" ? undefined : width }}
        title={isDisabled ? disabledMessage : undefined}
        type="button"
        onClick={() => {
          if (!isDisabled) setIsOpen(true);
        }}
      >
        {renderOptionIcon(startIcon)}
        <span className={styles.triggerValue}>
          {selected
            ? renderValue
              ? renderValue(selected as never)
              : (selected.label ?? selected.value)
            : placeholder}
        </span>
        {hasChevron ? (
          <ChevronDown aria-hidden className={styles.chevron} />
        ) : null}
      </button>
      {isDisabled && disabledMessage && (
        <span hidden id={messageId}>
          {disabledMessage}
        </span>
      )}

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
      <SelectorOptionList
        hasSearch={hasSearch}
        header={
          <>
            <h2 className={styles.title}>{label}</h2>
            {notice}
          </>
        }
        label={label}
        options={options}
        query={query}
        searchPlaceholder={searchPlaceholder}
        value={value}
        onChoose={choose}
        onQueryChange={setQuery}
      />
    </Sheet>
  );
}
