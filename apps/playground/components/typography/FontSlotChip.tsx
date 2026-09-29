"use client";

import { ChevronDown } from "lucide-react";
import type { GoogleFont } from "@blueprint/ui";
import { PopoverOrSheet } from "../PopoverOrSheet";
import { GoogleFontPicker } from "./GoogleFontPicker";
import styles from "./typography-workspace.module.css";

/**
 * One family of a font stack, as a chip that opens its slot's picker: the
 * Google Fonts search with the upload row pinned above it, in a popover on
 * a wider screen and a sheet on a phone.
 *
 * The chip's name carries the slot and the family ("Base fallback 1:
 * Sarabun"); the popover is named for the choice ("Choose a family for …"),
 * so the picker's own field keeps the slot's name to itself.
 */
export function FontSlotChip({
  name,
  family,
  isPrimary,
  isOpen,
  onOpenChange,
  labelTooltip,
  uploadLabel,
  onPick,
  onUpload,
}: {
  /** The slot, e.g. "Base font" or "Base fallback 1". */
  name: string;
  family: string;
  isPrimary: boolean;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  /** A standing note about the family, from the picker label's info icon. */
  labelTooltip?: string;
  /** This slot's upload verb and noun, e.g. "Replace font". */
  uploadLabel: string;
  onPick: (font: GoogleFont) => void;
  onUpload: () => void;
}) {
  return (
    <PopoverOrSheet
      className={styles.fontChipAnchor}
      isFlush
      isOpen={isOpen}
      label={`Choose a family for ${name}`}
      trigger={
        <button
          aria-label={`${name}: ${family || "choose a family"}`}
          className={styles.fontChip}
          data-empty={!family || undefined}
          data-primary={isPrimary || undefined}
          type="button"
        >
          <span className={styles.fontChipLabel}>
            {family || "Choose a family"}
          </span>
          {isPrimary ? <ChevronDown aria-hidden /> : null}
        </button>
      }
      width={300}
      onOpenChange={onOpenChange}
    >
      <GoogleFontPicker
        family={family}
        label={name}
        labelTooltip={labelTooltip}
        uploadLabel={uploadLabel}
        onPick={(picked) => {
          onPick(picked);
          onOpenChange(false);
        }}
        onUpload={() => {
          /* Closed first: the file dialog opens as the popover goes. */
          onOpenChange(false);
          onUpload();
        }}
      />
    </PopoverOrSheet>
  );
}
