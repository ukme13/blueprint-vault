"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import {
  spacingTokenForPx,
  type LayoutToken,
  type SpacingScale,
} from "@blueprint/ui";
import {
  measureSpacingZones,
  type LayoutUseId,
  type SpacingZone,
} from "./measure-spacing-zones";
import { SpacingUseBadge } from "./SpacingUseBadge";
import styles from "./spacing-overlay.module.css";

/**
 * The landing's paddings and gaps, marked as Figma's inspector marks them:
 * padding hatched in blue, gaps in pink, each tagged with its size.
 *
 * Laid inside the site as its last child, absolutely placed over the whole
 * scrolled height, so it scrolls with the page and needs no scroll
 * listener. It takes no pointer events itself, so a click still reaches
 * the text beneath it to inspect; only the tags take clicks. A tag on
 * Container inset or Section gap opens the spacing steps and rebinds that
 * use on the frame in view; any other tag says its size and step.
 */
export function SpacingOverlay({
  spacing,
  layout,
  deviceId,
  deviceName,
  onRebind,
}: {
  spacing: SpacingScale;
  layout: readonly LayoutToken[];
  deviceId: string;
  deviceName: string;
  onRebind: (use: LayoutUseId, step: string) => void;
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
  }, [measure, spacing, layout, deviceId]);

  const boundStep = (use: LayoutUseId) =>
    layout.find((token) => token.id === use)?.byDevice[deviceId];

  return (
    <div
      ref={layerRef}
      aria-label="Spacing overlay"
      className={styles.layer}
      data-spacing-overlay=""
      role="group"
      style={{ width: size.width, height: size.height }}
    >
      {zones.map(({ key, kind, band, use, hasBadge }) => (
        <div
          key={key}
          className={styles.zone}
          data-kind={kind}
          style={
            {
              left: band.x,
              top: band.y,
              width: band.width,
              height: band.height,
            } as CSSProperties
          }
        >
          {hasBadge ? (
            <span className={styles.badgeAnchor}>
              {use ? (
                <SpacingUseBadge
                  deviceName={deviceName}
                  px={band.px}
                  spacing={spacing}
                  step={boundStep(use)}
                  use={use}
                  onRebind={onRebind}
                />
              ) : (
                <span
                  className={styles.badge}
                  title={stepTitle(spacing, band.px)}
                >
                  {Math.round(band.px)}px
                </span>
              )}
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}

/** A read-only tag's hover: the step it lands on, when it lands on one. */
function stepTitle(spacing: SpacingScale, px: number): string {
  const token = spacingTokenForPx(spacing, px);
  return token ? token.variable : `${Math.round(px)}px, between steps`;
}
