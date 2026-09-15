"use client";

import {
  COLOUR_MODES,
  elevationPreviewSurfaces,
  resolveElevation,
  type ColorTrack,
  type ElevationScale,
} from "@blueprint/ui";
import styles from "./scale-workspace.module.css";

interface ElevationCanvasProps {
  scale: ElevationScale;
  palettes: ColorTrack[];
}

export function ElevationCanvas({ scale, palettes }: ElevationCanvasProps) {
  const surfaces = elevationPreviewSurfaces(palettes);

  return (
    <section aria-label="Elevation">
      <ol className={styles.elevationList}>
        {scale.levels.map((level) => (
          <li key={level.id}>
            <div className={styles.elevationHead}>
              <strong>{level.name}</strong>
              <code>--shadow-{level.id}</code>
              <span>{level.description}</span>
            </div>
            <div className={styles.elevationModes}>
              {COLOUR_MODES.map((mode) => {
                const resolved = resolveElevation(scale, palettes, mode).find(
                  (each) => each.id === level.id,
                );
                return (
                  <div key={mode} className={styles.elevationSample}>
                    <div
                      className={styles.elevationGround}
                      style={{ background: surfaces[mode].ground }}
                    >
                      <span
                        aria-label={`${level.name} on ${mode}`}
                        className={styles.elevationCard}
                        style={{
                          background: surfaces[mode].card,
                          boxShadow: resolved?.css,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
