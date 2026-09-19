"use client";

import type { ReactNode } from "react";
import type { ColourMode, PreviewDevice } from "@blueprint/ui";
import { VisionControl } from "./VisionControl";
import { PreviewDeviceBar } from "./typography/PreviewDeviceBar";
import styles from "./preview-chrome.module.css";

/**
 * The tool around the preview, which is not part of what is being previewed.
 *
 * It lives outside `components/preview/` on purpose. That directory is checked
 * for primitives and hardcoded measurements, and the check is what makes the
 * canvas worth looking at; chrome has to reach for the studio's own colours,
 * which would either fail that check or force an exemption that hollows it out.
 * The directory boundary says which is which.
 *
 * One mode control, and it is the same one every other page has. This page
 * used to carry a switch of its own — two states, "Colour mode" — beside the
 * studio's three-state theme, which made a page with two things called a
 * theme each flipping a different half of it, and later a page whose only
 * switch could not say "system" when every other page could. The theme is one
 * choice for the whole application now.
 *
 * `colorScheme` on the root is still declared rather than inherited, because
 * this element is where the two halves have to agree: the canvas below draws
 * from semantic variables computed for a resolved mode, and the bar around it
 * draws from `light-dark()` chrome tokens, which resolve against whatever
 * `color-scheme` is in force. Naming the resolved mode here is what keeps a
 * `system` page from resolving those two against different answers.
 *
 * The workspace name does not belong here. The bar is for switching the
 * preview frame; phone and tablet draw a device edge so the canvas is not
 * just a narrower column.
 */

interface PreviewChromeProps {
  /** The resolved mode — what is being drawn, never `system`. */
  mode: ColourMode;
  device: PreviewDevice;
  devices: readonly PreviewDevice[];
  canvas: ReactNode;
  children?: ReactNode;
  onDeviceChange: (id: string) => void;
}

export function PreviewChrome({
  mode,
  device,
  devices,
  canvas,
  children,
  onDeviceChange,
}: PreviewChromeProps) {
  const framed = device.kind === "phone" || device.kind === "tablet";

  return (
    <div className="flex h-full min-h-0 flex-col" style={{ colorScheme: mode }}>
      <header
        aria-label="Preview"
        className="flex flex-wrap items-center gap-3 border-b border-border-default bg-surface-subtle px-6 py-3 text-fg-primary"
      >
        <PreviewDeviceBar
          activeId={device.id}
          className="mr-auto"
          devices={devices}
          onChange={onDeviceChange}
        />
        <VisionControl />
      </header>

      <div className={framed ? styles.stage : styles.desktopStage}>
        <div
          className={framed ? `${styles.device} shadow-lg` : styles.desktop}
          data-device-chrome={framed ? "true" : undefined}
          data-kind={device.kind}
          data-preview-device={device.id}
          style={
            framed ? { width: `min(100%, ${device.widthPx}px)` } : undefined
          }
        >
          {framed ? (
            <div className={styles.deviceScroll}>{canvas}</div>
          ) : (
            canvas
          )}
        </div>
      </div>

      {children}
    </div>
  );
}
