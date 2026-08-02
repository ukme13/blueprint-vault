import type { CSSProperties } from "react";
import type { ColorTrack } from "@blueprint/ui";
import { PaletteRow } from "./PaletteRow";
import styles from "./palette-workspace.module.css";
import type { ActiveShade } from "./types";

interface PaletteMatrixProps {
  palettes: ColorTrack[];
  weights: number[];
  activeShade: ActiveShade | null;
  contrastReferenceHex?: string;
  wcagComparisonHex: string;
  wcagComparisonLabel: "white" | "black" | "custom";
  onActiveShadeChange: (selection: ActiveShade | null) => void;
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
            "--matrix-min-width": `${190 + weights.length * 54}px`,
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
