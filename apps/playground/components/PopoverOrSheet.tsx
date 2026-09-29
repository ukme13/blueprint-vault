"use client";

import {
  cloneElement,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import { Popover } from "@astryxdesign/core/Popover";
import { Sheet } from "./Sheet";
import styles from "./popover-or-sheet.module.css";
import { useIsPhone } from "./use-is-phone";

interface PopoverOrSheetProps {
  /** The panel's accessible name: its dialog is found by it. */
  label: string;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  /** The button that opens it. */
  trigger: ReactElement<{ onClick?: (event: MouseEvent) => void }>;
  /** The panel. Built only while it is open. */
  children: ReactNode;
  /** The popover's width on a wider screen. */
  width: number;
  className?: string;
  /**
   * No padding on the popover or the sheet (which still clears its handle),
   * and no focus moved into the popover: for a panel whose
   * header and list run to its edges and that focuses its own search.
   */
  isFlush?: boolean;
}

/**
 * A panel of settings beside the inspector, over the canvas, or a sheet on a
 * phone, where there is no beside. What `SheetSelector` is to a selector,
 * this is to a panel.
 *
 * It owns three things every such panel needs, so no caller works around
 * them again:
 *
 * - On a wider screen the Popover wires the trigger's click itself; a click
 *   handler of the caller's as well toggled it straight back shut. On a
 *   phone there is no Popover, so the trigger is given one.
 * - The panel is built only while open. Astryx's Popover keeps closed
 *   content mounted, and these panels hold lists of every shade.
 * - The trigger fills the space it is given, on both paths, rather than the
 *   Popover's own wrapper sizing to its content.
 */
export function PopoverOrSheet({
  label,
  isOpen,
  onOpenChange,
  trigger,
  children,
  width,
  className,
  isFlush,
}: PopoverOrSheetProps) {
  const isPhone = useIsPhone();
  const panel = isOpen ? children : null;
  const wrapper = (...names: (string | undefined)[]) =>
    names.filter(Boolean).join(" ");

  if (isPhone) {
    return (
      <div className={wrapper(styles.fill, className)}>
        {cloneElement(trigger, { onClick: () => onOpenChange(true) })}
        <Sheet
          isOpen={isOpen}
          label={label}
          padding={isFlush ? "flush" : "content"}
          onClose={() => onOpenChange(false)}
        >
          {panel}
        </Sheet>
      </div>
    );
  }

  return (
    <div className={wrapper(styles.fill, styles.popover, className)}>
      <Popover
        alignment="start"
        content={panel}
        hasAutoFocus={!isFlush}
        hasCloseButton={false}
        isOpen={isOpen}
        label={label}
        placement="start"
        style={isFlush ? { padding: 0 } : undefined}
        width={width}
        onOpenChange={onOpenChange}
      >
        {trigger}
      </Popover>
    </div>
  );
}
