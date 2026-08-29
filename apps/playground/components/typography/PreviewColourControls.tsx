"use client";

import { Selector } from "@astryxdesign/core/Selector";
import { findShade, type ColorTrack } from "@blueprint/ui";
import styles from "./typography-workspace.module.css";

/**
 * Which shade a preview colour points at.
 *
 * A reference rather than a hex: the palette is the other half of the same
 * workspace and is still being edited, so "primary 500" has to keep meaning
 * primary 500 after someone changes what that is.
 */
export interface ShadeRef {
  trackId: string;
  weight: number;
}

const NONE = "none";

export function refToValue(ref: ShadeRef | null): string {
  return ref ? `${ref.trackId}:${ref.weight}` : NONE;
}

export function valueToRef(value: string): ShadeRef | null {
  if (value === NONE) return null;
  const [trackId, weight] = value.split(":");
  if (!trackId || !weight) return null;
  return { trackId, weight: Number(weight) };
}

/** The hex a reference resolves to now, or null if the palette dropped it. */
export function resolveShadeHex(
  tracks: ColorTrack[],
  ref: ShadeRef | null,
): string | null {
  if (!ref) return null;
  return findShade(tracks, ref.trackId, ref.weight)?.hex ?? null;
}

function shadeOptions(tracks: ColorTrack[], noneLabel: string) {
  return [
    { label: noneLabel, value: NONE },
    ...tracks.flatMap((track) =>
      track.shades.map((shade) => ({
        label: `${track.name} ${shade.weight}`,
        value: `${track.id}:${shade.weight}`,
      })),
    ),
  ];
}

export interface PreviewColourControlsProps {
  tracks: ColorTrack[];
  text: ShadeRef | null;
  background: ShadeRef | null;
  onTextChange: (ref: ShadeRef | null) => void;
  onBackgroundChange: (ref: ShadeRef | null) => void;
}

export function PreviewColourControls({
  tracks,
  text,
  background,
  onTextChange,
  onBackgroundChange,
}: PreviewColourControlsProps) {
  /* Nothing to choose from until the palette half of the workspace exists.
     Saying so beats two empty dropdowns that look broken. */
  if (tracks.length === 0) {
    return (
      <p className={styles.previewColourEmpty}>
        Create a palette to preview this scale on your own colours.
      </p>
    );
  }

  return (
    <div
      className={styles.previewColourControls}
      role="group"
      aria-label="Preview colours"
    >
      <Selector
        label="Text colour"
        options={shadeOptions(tracks, "Default")}
        size="sm"
        value={refToValue(text)}
        onChange={(value) => onTextChange(valueToRef(value))}
      />
      <Selector
        label="Background colour"
        options={shadeOptions(tracks, "Default")}
        size="sm"
        value={refToValue(background)}
        onChange={(value) => onBackgroundChange(valueToRef(value))}
      />
    </div>
  );
}
