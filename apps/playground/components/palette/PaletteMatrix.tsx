import type { CSSProperties } from "react";
import type { ColorTrack } from "@blueprint/ui";
import { PaletteRow } from "./PaletteRow";
import styles from "./palette-workspace.module.css";
import type { ActiveShade } from "./types";

/** Track label column — room for rename + seed without eating the ramp. */
const MATRIX_TRACK_COLUMN_PX = 168;
/**
 * Narrowest shade column before the matrix scrolls.
 * Sized so Blueprint 20 fits beside a ~350px inspector at 1280.
 */
const MATRIX_SHADE_MIN_PX = 36;

interface PaletteMatrixProps {
  palettes: ColorTrack[];
  weights: number[];
  activeShade: ActiveShade | null;
  contrastReferenceHex?: string;
  wcagComparisonHex: string;
  wcagComparisonLabel: "white" | "black" | "custom";
  onActiveShadeChange: (selection: ActiveShade | null) => void;
  onAnchorChange: (trackId: string, weight: number, hex: string | null) => void;
  onManualChange: (trackId: string, weight: number, hex: string | null) => void;
  onTrackChange: (
    id: string,
    property: "name" | "seedHex",
    value: string,
  ) => void;
  onTrackOpen: (id: string) => void;
  onTrackMove: (id: string, direction: -1 | 1) => void;
  onTrackReorder: (
    sourceId: string,
    targetId: string,
    position: "before" | "after",
  ) => void;
}

export function PaletteMatrix({
  palettes,
  weights,
  activeShade,
  contrastReferenceHex,
  wcagComparisonHex,
  wcagComparisonLabel,
  onActiveShadeChange,
  onAnchorChange,
  onManualChange,
  onTrackChange,
  onTrackOpen,
  onTrackMove,
  onTrackReorder,
}: PaletteMatrixProps) {
  return (
    <section
      className={styles.matrixScroller}
      data-testid="palette-matrix-scroller"
    >
      <section
        className={styles.matrix}
        style={
          {
            "--shade-count": weights.length,
            "--matrix-track-column": `${MATRIX_TRACK_COLUMN_PX}px`,
            "--matrix-shade-min": `${MATRIX_SHADE_MIN_PX}px`,
            "--matrix-min-width": `${MATRIX_TRACK_COLUMN_PX + weights.length * MATRIX_SHADE_MIN_PX}px`,
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
          {palettes.map((palette, index) => (
            <PaletteRow
              key={palette.id}
              palette={palette}
              canMoveUp={index > 0}
              canMoveDown={index < palettes.length - 1}
              activeShade={activeShade}
              contrastReferenceHex={contrastReferenceHex}
              wcagComparisonHex={wcagComparisonHex}
              wcagComparisonLabel={wcagComparisonLabel}
              onActiveShadeChange={onActiveShadeChange}
              onAnchorChange={onAnchorChange}
              onManualChange={onManualChange}
              onTrackChange={onTrackChange}
              onTrackOpen={onTrackOpen}
              onTrackMove={onTrackMove}
              onTrackReorder={onTrackReorder}
            />
          ))}
        </section>
      </section>
    </section>
  );
}
