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
          /* 8px between the title row and its examples, which sat flush. */
          <li key={level.id} className="grid gap-2">
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
                        data-mode={mode}
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
