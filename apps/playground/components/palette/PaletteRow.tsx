import { CheckboxInput } from "@astryxdesign/core/CheckboxInput";
import { MoreMenu } from "@astryxdesign/core/MoreMenu";
import { TextInput } from "@astryxdesign/core/TextInput";
import type { ColorTrack } from "@blueprint/ui";
import { ColourPicker } from "./ColourPicker";
import { PaletteShade } from "./PaletteShade";
import styles from "./palette-workspace.module.css";
import type { ActiveShade, TrackProperty } from "./types";

interface PaletteRowProps {
  palette: ColorTrack;
  activeShade: ActiveShade | null;
  onActiveShadeChange: (selection: ActiveShade | null) => void;
  onTrackChange: (id: string, property: TrackProperty, value: string) => void;
  onTrackMove: (id: string, direction: -1 | 1) => void;
  onTrackRemove: (id: string) => void;
}

export function PaletteRow({
  palette,
  activeShade,
  onActiveShadeChange,
  onTrackChange,
  onTrackMove,
  onTrackRemove,
}: PaletteRowProps) {
  return (
    <article className={styles.paletteRow}>
      <section className={styles.trackLabel}>
        <span className={styles.trackCheckbox}>
          <CheckboxInput
            isLabelHidden
            isReadOnly
            label={`Show ${palette.name} track`}
            size="sm"
            value
          />
        </span>
        <span className={styles.sourceColourPicker}>
          <ColourPicker
            label={`${palette.name} source colour`}
            value={palette.seedHex}
            onChange={(value) => onTrackChange(palette.id, "seedHex", value)}
          />
        </span>
        <span className={styles.trackNameInput}>
          <TextInput
            isLabelHidden
            label={`${palette.name} track name`}
            size="sm"
            value={palette.name}
            onChange={(value) => onTrackChange(palette.id, "name", value)}
          />
        </span>
        <span className={styles.trackActions}>
          <MoreMenu
            label={`${palette.name} track actions`}
            size="sm"
            items={[
              {
                label: "Move up",
                onClick: () => onTrackMove(palette.id, -1),
              },
              {
                label: "Move down",
                onClick: () => onTrackMove(palette.id, 1),
              },
              { type: "divider" },
              {
                label: "Remove",
                onClick: () => onTrackRemove(palette.id),
              },
            ]}
          />
        </span>
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
            onSelect={(shouldSelect) =>
              onActiveShadeChange(
                shouldSelect
                  ? { trackId: palette.id, weight: shade.weight }
                  : null,
              )
            }
          />
        );
      })}
    </article>
  );
}
