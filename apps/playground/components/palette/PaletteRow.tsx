import { useState, type DragEvent, type KeyboardEvent } from "react";
import type { ColorTrack } from "@blueprint/ui";
import { PaletteShade } from "./PaletteShade";
import { TrackLabel } from "./TrackLabel";
import styles from "./palette-workspace.module.css";
import type { ActiveShade } from "./types";

interface PaletteRowProps {
  palette: ColorTrack;
  canMoveUp: boolean;
  canMoveDown: boolean;
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
  /** False on a phone, where shade details open in a sheet. */
  hasShadePopovers?: boolean;
}

export function PaletteRow({
  palette,
  canMoveUp,
  canMoveDown,
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
  hasShadePopovers = true,
}: PaletteRowProps) {
  const [dropPosition, setDropPosition] = useState<"before" | "after" | null>(
    null,
  );

  const handleDragOver = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    const bounds = event.currentTarget.getBoundingClientRect();
    setDropPosition(
      event.clientY < bounds.top + bounds.height / 2 ? "before" : "after",
    );
  };

  const handleDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    const sourceId = event.dataTransfer.getData("text/plain");
    if (sourceId && sourceId !== palette.id && dropPosition) {
      onTrackReorder(sourceId, palette.id, dropPosition);
    }
    setDropPosition(null);
  };

  const handleNameKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      event.currentTarget.blur();
    }
    if (event.key === "Escape") {
      event.currentTarget.value = palette.name;
      event.currentTarget.blur();
    }
  };

  return (
    <article
      className={styles.paletteRow}
      data-drop-position={dropPosition ?? undefined}
      data-track-id={palette.id}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setDropPosition(null);
        }
      }}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <TrackLabel
        canMoveDown={canMoveDown}
        canMoveUp={canMoveUp}
        palette={palette}
        onDragEnd={() => setDropPosition(null)}
        onNameKeyDown={handleNameKeyDown}
        onTrackChange={onTrackChange}
        onTrackMove={onTrackMove}
        onTrackOpen={onTrackOpen}
      />

      {palette.shades.map((shade) => {
        const isSelected =
          activeShade?.trackId === palette.id &&
          activeShade.weight === shade.weight;

        return (
          <PaletteShade
            key={shade.weight}
            paletteName={palette.name}
            shade={shade}
            isSelected={isSelected}
            hasPopover={hasShadePopovers}
            contrastReferenceHex={contrastReferenceHex}
            wcagComparisonHex={wcagComparisonHex}
            wcagComparisonLabel={wcagComparisonLabel}
            onSelect={(shouldSelect) =>
              onActiveShadeChange(
                shouldSelect
                  ? { trackId: palette.id, weight: shade.weight }
                  : null,
              )
            }
            onAnchorChange={(hex) =>
              onAnchorChange(palette.id, shade.weight, hex)
            }
            onManualChange={(hex) =>
              onManualChange(palette.id, shade.weight, hex)
            }
            onSourceChange={(hex) => onTrackChange(palette.id, "seedHex", hex)}
          />
        );
      })}
    </article>
  );
}
