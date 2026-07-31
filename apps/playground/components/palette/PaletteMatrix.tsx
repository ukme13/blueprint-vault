import { BLUEPRINT_20_PRESET, type ColorTrack } from "@blueprint/ui";
import { PaletteRow } from "./PaletteRow";
import styles from "./palette-workspace.module.css";
import type { ActiveShade, TrackProperty } from "./types";

interface PaletteMatrixProps {
  palettes: ColorTrack[];
  activeShade: ActiveShade | null;
  onActiveShadeChange: (selection: ActiveShade | null) => void;
  onTrackChange: (id: string, property: TrackProperty, value: string) => void;
  onTrackMove: (id: string, direction: -1 | 1) => void;
  onTrackRemove: (id: string) => void;
}

export function PaletteMatrix({
  palettes,
  activeShade,
  onActiveShadeChange,
  onTrackChange,
  onTrackMove,
  onTrackRemove,
}: PaletteMatrixProps) {
  return (
    <section className={styles.matrixScroller}>
      <section className={styles.matrix}>
        <header className={styles.weightHeader}>
          <span>Colour</span>
          {BLUEPRINT_20_PRESET.weights.map((weight) => (
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
