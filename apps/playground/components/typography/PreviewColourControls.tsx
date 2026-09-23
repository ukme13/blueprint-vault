"use client";

import type { CSSProperties, ReactNode } from "react";
import { SheetSelector } from "../SheetSelector";
import { resolveShadeHex, type ColorTrack, type ShadeRef } from "@blueprint/ui";
import { PaintBucket, Type } from "lucide-react";
import styles from "./typography-workspace.module.css";

const NONE = "none";

function refToValue(ref: ShadeRef | null): string {
  return ref ? `${ref.trackId}:${ref.weight}` : NONE;
}

function valueToRef(value: string): ShadeRef | null {
  if (value === NONE) return null;
  const [trackId, weight] = value.split(":");
  if (!trackId || !weight) return null;
  return { trackId, weight: Number(weight) };
}

function ColourSwatch({ hex }: { hex: string | null }) {
  return (
    <i
      aria-hidden
      className={styles.previewColourSwatch}
      data-empty={hex ? undefined : "true"}
      style={hex ? ({ "--preview-swatch": hex } as CSSProperties) : undefined}
    />
  );
}

function shadeOptions(tracks: ColorTrack[]) {
  return [
    {
      label: "Default",
      value: NONE,
      icon: <ColourSwatch hex={null} />,
    },
    ...tracks.map((track) => ({
      type: "section" as const,
      title: track.name,
      options: track.shades.map((shade) => ({
        label: `${track.name} ${shade.weight}`,
        value: `${track.id}:${shade.weight}`,
        icon: <ColourSwatch hex={shade.hex} />,
      })),
    })),
  ];
}

function PaletteColourSelector({
  label,
  icon,
  tracks,
  value,
  onChange,
}: {
  label: string;
  icon: ReactNode;
  tracks: ColorTrack[];
  value: ShadeRef | null;
  onChange: (ref: ShadeRef | null) => void;
}) {
  return (
    <SheetSelector
      hasSearch
      isLabelHidden
      label={label}
      options={shadeOptions(tracks)}
      renderValue={(option) => (
        <ColourSwatch hex={resolveShadeHex(tracks, valueToRef(option.value))} />
      )}
      searchPlaceholder="Search shades"
      size="sm"
      startIcon={icon}
      statusVariant="tooltip"
      value={refToValue(value)}
      variant="ghost"
      onChange={(next) => onChange(valueToRef(next))}
    />
  );
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
      <PaletteColourSelector
        icon={<Type aria-hidden className="size-3.5" />}
        label="Text colour"
        tracks={tracks}
        value={text}
        onChange={onTextChange}
      />
      <PaletteColourSelector
        icon={<PaintBucket aria-hidden className="size-3.5" />}
        label="Background colour"
        tracks={tracks}
        value={background}
        onChange={onBackgroundChange}
      />
    </div>
  );
}
