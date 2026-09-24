import type { ReactNode } from "react";

/**
 * The options of a selector, laid out for a phone's bottom sheet.
 *
 * The same shapes Astryx's `Selector` takes — plain strings, options,
 * dividers and titled sections — so one list of options can drive the
 * dropdown on a wide screen and the sheet on a phone.
 */

export interface SheetOption {
  value: string;
  label?: string;
  description?: ReactNode;
  disabled?: boolean;
  icon?: unknown;
}

export type SheetOptionInput =
  | string
  | SheetOption
  | { type: "divider" }
  | { type: "section"; title?: string; options: SheetOption[] };

export interface SheetOptionGroup {
  title?: string;
  options: SheetOption[];
}

function asOption(item: string | SheetOption): SheetOption {
  return typeof item === "string" ? { value: item, label: item } : item;
}

function matches(option: SheetOption, query: string): boolean {
  if (!query) return true;
  const needle = query.trim().toLowerCase();
  return (
    (option.label ?? option.value).toLowerCase().includes(needle) ||
    option.value.toLowerCase().includes(needle)
  );
}

/**
 * Groups of options, each under its section title, narrowed by a search.
 *
 * Loose options between sections are gathered into untitled groups in the
 * order they came; a divider starts a new one. Groups a search empties are
 * left out rather than shown as a title over nothing.
 */
export function sheetOptionGroups(
  items: readonly SheetOptionInput[],
  query = "",
): SheetOptionGroup[] {
  const groups: SheetOptionGroup[] = [];
  let loose: SheetOption[] = [];
  const flush = () => {
    if (loose.length > 0) groups.push({ options: loose });
    loose = [];
  };

  for (const item of items) {
    if (typeof item === "object" && "type" in item) {
      flush();
      if (item.type === "section") {
        groups.push({ title: item.title, options: item.options });
      }
      continue;
    }
    loose.push(asOption(item));
  }
  flush();

  return groups
    .map((group) => ({
      ...group,
      options: group.options.filter((option) => matches(option, query)),
    }))
    .filter((group) => group.options.length > 0);
}

/** The option with this value, wherever it sits. */
export function findSheetOption(
  items: readonly SheetOptionInput[],
  value: string | undefined,
): SheetOption | undefined {
  if (value === undefined) return undefined;
  for (const group of sheetOptionGroups(items)) {
    const found = group.options.find((option) => option.value === value);
    if (found) return found;
  }
  return undefined;
}
