"use client";

import type { CSSProperties } from "react";
import { generatePalettes, type PaletteProjectData } from "@blueprint/ui";
import styles from "./home.module.css";

/**
 * A dense shade grid for a project card.
 *
 * One row per colour family, shades filling that row. The cells are the
 * generated ramp, not chrome tokens: this is a picture of the palette, so
 * each swatch has to be the colour it stands for.
 */
export function ProjectMosaic({
  palette,
}: {
  palette: PaletteProjectData | null | undefined;
}) {
  const tracks = palette ? generatePalettes(palette) : [];

  if (tracks.length === 0) {
    return <div aria-hidden className={styles.mosaicEmpty} data-mosaic-empty />;
  }

  return (
    <div
      aria-hidden
      className={styles.mosaic}
      style={
        {
          "--mosaic-tracks": tracks.length,
        } as CSSProperties
      }
    >
      {tracks.map((track) => (
        <div
          key={track.id}
          className={styles.mosaicTrack}
          data-mosaic-track={track.id}
          style={
            {
              "--mosaic-shades": track.shades.length,
            } as CSSProperties
          }
        >
          {track.shades.map((shade) => (
            <span
              key={`${track.id}-${shade.weight}`}
              className={styles.mosaicCell}
              style={{
                backgroundColor: `oklch(${shade.L} ${shade.C} ${shade.H})`,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
