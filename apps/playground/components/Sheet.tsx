"use client";

import type { ComponentProps, ReactNode } from "react";
import { BottomSheet } from "@astryxdesign/core/BottomSheet";
import styles from "./sheet.module.css";

/**
 * A phone's bottom sheet, with the three things every one of them needs.
 *
 * - **Room for the grab handle.** Astryx floats the handle over the first
 *   24px of content with a fade to clear, so content that starts there reads
 *   as washed out, and a control under it loses its taps.
 * - **Its own `white-space`.** A sheet is drawn in the top layer but inherits
 *   from wherever it sits in the DOM, and a sheet opened from the palette
 *   toolbar inherited its `nowrap`.
 * - **Escape for itself only.** Astryx closes a sheet from a React keydown on
 *   its dialog. A sheet opened from inside another sits inside it in the React
 *   tree, so the same Escape bubbled on and closed both. Stopped here. The
 *   wrapper is a div, not a span: Astryx moves menus and popovers out of any
 *   span above them, out of the sheet's modal dialog, where they cannot be
 *   tapped.
 *
 * `padding="content"` pads the sides as well, for a sheet that lays out its
 * own controls. `padding="flush"` only clears the handle, for a sheet holding
 * a panel that brings its own padding.
 */

type BottomSheetHeight = ComponentProps<typeof BottomSheet>["height"];

interface SheetProps {
  isOpen: boolean;
  /** The sheet's accessible name. */
  label: string;
  /** Every way out — the backdrop, a swipe, Escape — lands here. */
  onClose: () => void;
  children: ReactNode;
  /** Defaults to fitting the content. */
  height?: BottomSheetHeight;
  padding?: "content" | "flush";
  /** Layout for what is inside, on the padded element. */
  className?: string;
}

export function Sheet({
  isOpen,
  label,
  onClose,
  children,
  height = "hug",
  padding = "content",
  className,
}: SheetProps) {
  return (
    <div
      className={styles.escapeScope}
      onKeyDown={(event) => {
        if (event.key === "Escape") event.stopPropagation();
      }}
    >
      <BottomSheet
        height={height}
        isOpen={isOpen}
        label={label}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
      >
        <div
          className={[
            styles.body,
            padding === "flush" ? styles.flush : styles.content,
            className,
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {children}
        </div>
      </BottomSheet>
    </div>
  );
}
