"use client";

import type { CSSProperties, KeyboardEvent, PointerEvent } from "react";
import {
  ELEVATION_OPACITY_MAX,
  ELEVATION_OPACITY_STEP,
  snapElevationOpacity,
} from "@blueprint/ui";
import styles from "./scale-workspace.module.css";

const PAD_INSET_RATIO = 0.12;

/**
 * Contact on X, cast on Y. A shadow has those two layers; the pad is how
 * they are set together instead of as four unrelated sliders.
 */
export function ElevationPad({
  label,
  contact,
  cast,
  surface,
  shadow,
  onChange,
}: {
  label: string;
  contact: number;
  cast: number;
  surface: string;
  shadow: string;
  onChange: (contact: number, cast: number) => void;
}) {
  const contactMix = Math.round((contact / ELEVATION_OPACITY_MAX) * 100);
  const castMix = Math.round((cast / ELEVATION_OPACITY_MAX) * 100);

  const readPoint = (event: PointerEvent<HTMLButtonElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const rawX =
      bounds.width === 0 ? 0 : (event.clientX - bounds.left) / bounds.width;
    const rawY =
      bounds.height === 0
        ? 0
        : 1 - (event.clientY - bounds.top) / bounds.height;
    const normalizedX = (rawX - PAD_INSET_RATIO) / (1 - 2 * PAD_INSET_RATIO);
    const normalizedY = (rawY - PAD_INSET_RATIO) / (1 - 2 * PAD_INSET_RATIO);
    const clampedX = Math.min(Math.max(normalizedX, 0), 1);
    const clampedY = Math.min(Math.max(normalizedY, 0), 1);
    onChange(
      snapElevationOpacity(clampedX * ELEVATION_OPACITY_MAX),
      snapElevationOpacity(clampedY * ELEVATION_OPACITY_MAX),
    );
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const step = event.shiftKey
      ? ELEVATION_OPACITY_STEP * 2
      : ELEVATION_OPACITY_STEP;
    let nextContact = contact;
    let nextCast = cast;
    if (event.key === "ArrowRight")
      nextContact = snapElevationOpacity(contact + step);
    else if (event.key === "ArrowLeft")
      nextContact = snapElevationOpacity(contact - step);
    else if (event.key === "ArrowUp")
      nextCast = snapElevationOpacity(cast + step);
    else if (event.key === "ArrowDown")
      nextCast = snapElevationOpacity(cast - step);
    else if (event.key === "Home") nextContact = 0;
    else if (event.key === "End") nextContact = ELEVATION_OPACITY_MAX;
    else if (event.key === "PageUp") nextCast = ELEVATION_OPACITY_MAX;
    else if (event.key === "PageDown") nextCast = 0;
    else return;
    event.preventDefault();
    onChange(nextContact, nextCast);
  };

  const thumbLeft =
    (PAD_INSET_RATIO +
      (1 - 2 * PAD_INSET_RATIO) * (contact / ELEVATION_OPACITY_MAX)) *
    100;
  const thumbTop =
    (PAD_INSET_RATIO +
      (1 - 2 * PAD_INSET_RATIO) * (1 - cast / ELEVATION_OPACITY_MAX)) *
    100;

  return (
    <button
      aria-label={label}
      aria-valuetext={`contact ${Math.round(contact * 100)} percent, cast ${Math.round(cast * 100)} percent`}
      className={styles.elevationPad}
      style={
        {
          "--elevation-surface": surface,
          "--elevation-shadow": shadow,
          "--elevation-contact": String(contactMix),
          "--elevation-cast": String(castMix),
        } as CSSProperties
      }
      type="button"
      onKeyDown={onKeyDown}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        readPoint(event);
      }}
      onPointerMove={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          readPoint(event);
        }
      }}
    >
      <span aria-hidden className={styles.elevationPadDots} />
      <span aria-hidden className={styles.elevationPadOrigin} />
      <span
        aria-hidden
        className={styles.elevationPadThumb}
        style={{
          left: `${thumbLeft}%`,
          top: `${thumbTop}%`,
        }}
      />
    </button>
  );
}
