import type { ColorTrack } from "@blueprint/ui";
import { PaletteShade } from "./PaletteShade";
import styles from "./palette-workspace.module.css";
import type { ActiveShade, TrackProperty } from "./types";

interface PaletteRowProps {
  palette: ColorTrack;
  activeShade: ActiveShade | null;
  onActiveShadeChange: (selection: ActiveShade | null) => void;
  onTrackChange: (id: string, property: TrackProperty, value: string) => void;
}

export function PaletteRow({
  palette,
  activeShade,
  onActiveShadeChange,
  onTrackChange,
}: PaletteRowProps) {
  return (
    <article className={styles.paletteRow}>
      <label className={styles.trackLabel}>
        <input defaultChecked type="checkbox" />
        <i style={{ backgroundColor: palette.seedHex }} />
        <input
          aria-label={`${palette.name} track name`}
          value={palette.name}
          onChange={(event) =>
            onTrackChange(palette.id, "name", event.target.value)
          }
        />
      </label>

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
            onSelect={() =>
              onActiveShadeChange(
                isSelected
                  ? null
                  : { trackId: palette.id, weight: shade.weight },
              )
            }
          />
        );
      })}
    </article>
  );
}
