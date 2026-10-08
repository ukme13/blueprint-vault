"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import {
  boundLayoutToken,
  type LayoutBindings,
  type LayoutToken,
  type SpacingScale,
} from "@blueprint/ui";
import {
  measureSpacingZones,
  type LayoutUseId,
  type SpacingZone,
} from "./measure-spacing-zones";
import { SpacingInfoBadge } from "./SpacingInfoBadge";
import { SpacingUseBadge } from "./SpacingUseBadge";
import styles from "./spacing-overlay.module.css";

/**
 * The landing's paddings and gaps, marked as Figma's inspector marks them:
 * padding hatched in blue, gaps in pink, each tagged with its size.
 *
 * Laid inside the site as its last child, absolutely placed over the whole
 * scrolled height, so it scrolls with the page and needs no scroll
 * listener. It takes no pointer events itself, so a click still reaches
 * the text beneath it to inspect; only the tags take clicks.
 *
 * A tag on a space a layout use sizes (Container inset, Section inset,
 * Section gap, Grid gap, Navigation gap, Card inset) is on a slot, and shows
 * the use that slot is bound to. Its picker binds the slot to another use, or
 * sets a step on the bound use for the frame in view. Any other tag opens
 * what step its size is, with the way to the Spacing studio to change that
 * step's size.
 */
export function SpacingOverlay({
  spacing,
  layout,
  bindings,
  deviceId,
  deviceName,
  onBindSlot,
  onRebindStep,
}: {
  spacing: SpacingScale;
  layout: readonly LayoutToken[];
  /** Which use each slot reads, where it is not its own. */
  bindings: LayoutBindings;
  deviceId: string;
  deviceName: string;
  /** Take the size of another use for a slot, leaving that use as it is. */
  onBindSlot: (slot: LayoutUseId, tokenId: string) => void;
  /** Set a use's step on the frame in view. */
  onRebindStep: (tokenId: string, step: string) => void;
}) {
  const layerRef = useRef<HTMLDivElement>(null);
  const [zones, setZones] = useState<SpacingZone[]>([]);
  const [size, setSize] = useState({ width: 0, height: 0 });

  const measure = useCallback(() => {
    const site = layerRef.current?.parentElement;
    if (!site) return;
    setZones(measureSpacingZones(site));
    setSize({ width: site.scrollWidth, height: site.scrollHeight });
  }, []);

  /* Measured again whenever what sizes the page may have moved: the
     scale, the uses, the frame, the page's own size, and its fonts. */
  useLayoutEffect(() => {
    measure();
    const site = layerRef.current?.parentElement;
    if (!site) return;
    const observer = new ResizeObserver(() => measure());
    observer.observe(site);
    for (const child of site.children) {
      if (child !== layerRef.current) observer.observe(child);
    }
    void document.fonts?.ready.then(() => measure());
    return () => observer.disconnect();
  }, [measure, spacing, layout, bindings, deviceId]);

  return (
    <div
      ref={layerRef}
      aria-label="Spacing overlay"
      className={styles.layer}
      data-spacing-overlay=""
      role="group"
      style={{ width: size.width, height: size.height }}
    >
      {zones.map(({ key, kind, band, use, hasBadge }) => {
        /* The layout use this space reads: its own, unless it was bound to
           another. */
        const token = use ? boundLayoutToken(layout, bindings, use) : undefined;
        return (
          <div
            key={key}
            className={styles.zone}
            data-kind={kind}
            style={{
              left: band.x,
              top: band.y,
              width: band.width,
              height: band.height,
            }}
          >
            {hasBadge ? (
              <span className={styles.badgeAnchor}>
                {use && token ? (
                  <SpacingUseBadge
                    deviceId={deviceId}
                    deviceName={deviceName}
                    layout={layout}
                    px={band.px}
                    slotId={use}
                    spacing={spacing}
                    token={token}
                    onBindSlot={onBindSlot}
                    onRebindStep={onRebindStep}
                  />
                ) : (
                  <SpacingInfoBadge px={band.px} spacing={spacing} />
                )}
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
