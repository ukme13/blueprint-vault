"use client";

import type { InputHTMLAttributes, ReactNode, Ref } from "react";
import { Search } from "lucide-react";
import styles from "./sheet-selector.module.css";

interface SelectorSearchProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "className" | "onChange" | "size" | "value"
> {
  ref?: Ref<HTMLInputElement>;
  /**
   * `compact` is a dropdown's header, under a pointer. `comfortable` is a
   * phone sheet's: 16px, below which iOS zooms the page as the field takes
   * focus.
   */
  density: "compact" | "comfortable";
  value: string;
  onValueChange: (value: string) => void;
  /** After the field, such as a button that clears it. */
  trailing?: ReactNode;
}

/**
 * The search at the top of a selector: a magnifier and a borderless field
 * over a line the width of the panel, as Astryx's own Selector draws it.
 */
export function SelectorSearch({
  ref,
  density,
  value,
  onValueChange,
  trailing,
  type = "text",
  ...inputProps
}: SelectorSearchProps) {
  const isCompact = density === "compact";
  return (
    <label className={styles.search} data-density={density}>
      <Search
        aria-hidden
        className={`shrink-0 text-fg-muted ${isCompact ? "size-4" : "size-5"}`}
      />
      <input
        ref={ref}
        {...inputProps}
        className={`min-w-0 flex-1 border-0 bg-transparent p-0 text-fg-primary outline-none placeholder:text-fg-muted ${isCompact ? "text-sm" : "text-base"}`}
        type={type}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
      />
      {trailing}
    </label>
  );
}
