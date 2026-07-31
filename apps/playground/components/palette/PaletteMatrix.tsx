import type { CSSProperties } from "react";
import type { ColorTrack } from "@blueprint/ui";
import { PaletteRow } from "./PaletteRow";
import styles from "./palette-workspace.module.css";
import type { ActiveShade, TrackProperty } from "./types";

interface PaletteMatrixProps {
  palettes: ColorTrack[];
  weights: number[];
  activeShade: ActiveShade | null;
  onActiveShadeChange: (selection: ActiveShade | null) => void;
  onTrackChange: (id: string, property: TrackProperty, value: string) => void;
  onTrackMove: (id: string, direction: -1 | 1) => void;
  onTrackRemove: (id: string) => void;
}

export function PaletteMatrix({
  palettes,
  weights,
  activeShade,
  onActiveShadeChange,
  onTrackChange,
  onTrackMove,
  onTrackRemove,
}: PaletteMatrixProps) {
  return (
    <section className={styles.matrixScroller}>
      <section
        className={styles.matrix}
        style={
          {
            "--shade-count": weights.length,
            "--matrix-min-width": `${190 + weights.length * 56}px`,
          } as CSSProperties
        }
      >
        <header className={styles.weightHeader}>
          <span>Colour</span>
          {weights.map((weight) => (
            <code key={weight}>{weight}</code>
          ))}
        </header>

        <section className={styles.paletteRows}>
          {palettes.map((palette) => (
            <PaletteRow
              key={palette.id}
              palette={palette}
              activeShade={activeShade}
              onActiveShadeChange={onActiveShadeChange}
              onTrackChange={onTrackChange}
              onTrackMove={onTrackMove}
              onTrackRemove={onTrackRemove}
            />
          ))}
        </section>
      </section>
    </section>
  );
}
