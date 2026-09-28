"use client";

import type { HybridTokenizedSheetProps } from "@blueprint/ui";
import { Sheet } from "./Sheet";
import { useIsPhone } from "./use-is-phone";

/**
 * The phone sheet for a `HybridTokenizedInput`'s step list.
 *
 * Pass it as the field's `sheet` on a phone and leave it out on a wide
 * screen. The list brings its own title, search and inset; the sheet is
 * flush, so the search row's hairline runs the screen's full width.
 */
export function renderPickerSheet({
  isOpen,
  onClose,
  label,
  children,
}: HybridTokenizedSheetProps) {
  return (
    <Sheet isOpen={isOpen} label={label} padding="flush" onClose={onClose}>
      {children}
    </Sheet>
  );
}

/**
 * `renderPickerSheet` on a phone, nothing on a wider screen: what a
 * `HybridTokenizedInput`'s `sheet` prop takes, so a picker needs one line.
 */
export function usePickerSheet() {
  return useIsPhone() ? renderPickerSheet : undefined;
}
