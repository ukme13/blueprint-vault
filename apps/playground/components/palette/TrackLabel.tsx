import type { KeyboardEvent } from "react";
import { Icon } from "@astryxdesign/core/Icon";
import type { ColorTrack } from "@blueprint/ui";
import { ChevronRight, GripVertical } from "lucide-react";
import { ColourPicker } from "./ColourPicker";
import styles from "./palette-workspace.module.css";

interface TrackLabelProps {
  palette: ColorTrack;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onNameKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onDragEnd: () => void;
  onTrackChange: (
    id: string,
    property: "name" | "seedHex",
    value: string,
  ) => void;
  onTrackOpen: (id: string) => void;
  onTrackMove: (id: string, direction: -1 | 1) => void;
}

/**
 * The sticky name column: drag handle, seed swatch, rename, details.
 *
 * Width is owned by the matrix grid (`MATRIX_TRACK_COLUMN_PX`), sized so
 * the seed name "secondary" fits without ellipsis.
 */
export function TrackLabel({
  palette,
  canMoveUp,
  canMoveDown,
  onNameKeyDown,
  onDragEnd,
  onTrackChange,
  onTrackOpen,
  onTrackMove,
}: TrackLabelProps) {
  return (
    <section className={styles.trackLabel}>
      <button
        aria-label={`Drag ${palette.name} track to reorder`}
        className={styles.trackDragHandle}
        draggable
        title="Drag to reorder"
        type="button"
        onDragEnd={onDragEnd}
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
        <GripVertical aria-hidden />
      </button>
      <div className={styles.trackCard}>
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
          onKeyDown={onNameKeyDown}
        />
        <button
          aria-label={`Open ${palette.name} colour details`}
          className={styles.trackCardOpenButton}
          title="Colour details"
          type="button"
          onClick={() => onTrackOpen(palette.id)}
        >
          <Icon icon={ChevronRight} size="sm" />
        </button>
      </div>
    </section>
  );
}
