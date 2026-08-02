import { useState, type DragEvent, type KeyboardEvent } from "react";
import type { ColorTrack } from "@blueprint/ui";
import { ColourPicker } from "./ColourPicker";
import { PaletteShade } from "./PaletteShade";
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
      <section className={styles.trackLabel}>
        <button
          aria-label={`Drag ${palette.name} track to reorder`}
          className={styles.trackDragHandle}
          draggable
          title="Drag to reorder"
          type="button"
          onDragEnd={() => setDropPosition(null)}
          onDragStart={(event) => {
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData("text/plain", palette.id);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowUp" && canMoveUp) {
              event.preventDefault();
              onTrackMove(palette.id, -1);
            }
            if (event.key === "ArrowDown" && canMoveDown) {
              event.preventDefault();
              onTrackMove(palette.id, 1);
            }
          }}
        >
          <svg
            aria-hidden="true"
            fill="currentColor"
            height="16"
            viewBox="0 0 12 16"
            width="12"
          >
            <circle cx="3" cy="3" r="1.2" />
            <circle cx="9" cy="3" r="1.2" />
            <circle cx="3" cy="8" r="1.2" />
            <circle cx="9" cy="8" r="1.2" />
            <circle cx="3" cy="13" r="1.2" />
            <circle cx="9" cy="13" r="1.2" />
          </svg>
        </button>
        <div className={styles.trackCard}>
          <button
            aria-label={`Open ${palette.name} colour details`}
            className={styles.trackCardOpenButton}
            type="button"
            onClick={() => onTrackOpen(palette.id)}
          />
          <span className={styles.trackCardColourPicker}>
            <ColourPicker
              label={`${palette.name} source colour`}
              value={palette.seedHex}
              onChange={(value) => onTrackChange(palette.id, "seedHex", value)}
            />
          </span>
          <input
            key={palette.name}
            aria-label={`Rename ${palette.name} colour`}
            defaultValue={palette.name}
            maxLength={40}
            onBlur={(event) => {
              const nextName = event.currentTarget.value.trim();
              if (nextName && nextName !== palette.name) {
                onTrackChange(palette.id, "name", nextName);
              } else {
                event.currentTarget.value = palette.name;
              }
            }}
            onKeyDown={handleNameKeyDown}
          />
        </div>
      </section>

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
