"use client";

import {
  elevationLevelColour,
  parseShadeOptionValue,
  resolveElevationColour,
  setElevationColour,
  setElevationLevelColour,
  shadeOptionSections,
  shadeOptionValue,
  type ColorTrack,
  type ElevationLevel,
  type ElevationScale,
} from "@blueprint/ui";
import { SheetSelector } from "../SheetSelector";
import { TransparencySwatch } from "../palette/TransparencySwatch";
import styles from "./scale-workspace.module.css";

/** The value the level's list uses for "back to the shadow colour". */
const SHADOW_COLOUR = "shadow";

interface ElevationColourSettingProps {
  scale: ElevationScale;
  palettes: ColorTrack[];
  /** The level being edited; its own colour, if it has one, is shown. */
  level: ElevationLevel | undefined;
  onChange: (scale: ElevationScale, editKey?: string) => void;
}

/**
 * Simple's colour: whichever colour the selected level is actually drawn in.
 *
 * Most levels are drawn in the scale's shadow colour, shared by every level,
 * so the control is that: change it and every such level follows. A level
 * with a colour of its own — Glow is one — shows that colour instead, named
 * for the level, and changing it recolours this level only. Showing the
 * shared colour there would put black beside a pink glow, and following it
 * would turn every level's shadow pink.
 */
export function ElevationColourSetting({
  scale,
  palettes,
  level,
  onChange,
}: ElevationColourSettingProps) {
  const colour = resolveElevationColour(scale, palettes);
  const track =
    palettes.find((item) => item.id === colour.trackId) ?? palettes[0];
  const own = level ? elevationLevelColour(level) : null;
  const shades = shadeOptionSections(palettes, (hex) => (
    <TransparencySwatch alpha={1} colour={hex} />
  ));

  if (!track) {
    return (
      <div className={styles.settingSubgroup}>
        <p className={styles.settingHint}>
          Build a palette first. Until then the shadows fall back to black.
        </p>
      </div>
    );
  }

  if (level && own) {
    const ownHex =
      palettes
        .find((item) => item.id === own.trackId)
        ?.shades.find((shade) => shade.weight === own.weight)?.hex ??
      colour.hex;
    return (
      <div className={styles.settingSubgroup}>
        <SheetSelector
          hasSearch
          label={`${level.name} colour`}
          options={[
            {
              value: SHADOW_COLOUR,
              label: "Shadow colour",
              description: `${colour.trackName} ${colour.weight}, shared by every level`,
              icon: <TransparencySwatch alpha={1} colour={colour.hex} />,
            },
            ...shades,
          ]}
          searchPlaceholder="Search shades"
          size="md"
          startIcon={<TransparencySwatch alpha={1} colour={ownHex} />}
          value={shadeOptionValue(own)}
          onChange={(next) => {
            if (next === SHADOW_COLOUR) {
              onChange(setElevationLevelColour(scale, level.id, null));
              return;
            }
            const picked = parseShadeOptionValue(next);
            if (picked) {
              onChange(setElevationLevelColour(scale, level.id, picked));
            }
          }}
        />
        <p className={styles.settingHint}>
          This level’s own colour. The others keep the shadow colour.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.settingSubgroup}>
      {/* One list of every shade, grouped by track and found by typing
          ("primary 900"), rather than a track selector and a weight
          selector. The swatch rides in the trigger. */}
      <SheetSelector
        hasSearch
        label="Shadow colour"
        options={shades}
        searchPlaceholder="Search shades"
        size="md"
        startIcon={<TransparencySwatch alpha={1} colour={colour.hex} />}
        value={shadeOptionValue({
          trackId: track.id,
          weight: track.shades.some((shade) => shade.weight === colour.weight)
            ? colour.weight
            : (track.shades.at(-1)?.weight ?? colour.weight),
        })}
        onChange={(next) => {
          const picked = parseShadeOptionValue(next);
          if (picked && palettes.some((item) => item.id === picked.trackId)) {
            onChange(setElevationColour(scale, picked));
          }
        }}
      />
    </div>
  );
}
