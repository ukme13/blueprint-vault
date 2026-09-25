"use client";

import { SheetSelector } from "../SheetSelector";
import {
  elevationPreviewSurfaces,
  parseShadeOptionValue,
  resolveElevationColour,
  setElevationColour,
  shadeOptionSections,
  shadeOptionValue,
  type ColorTrack,
  type ElevationScale,
} from "@blueprint/ui";
import { TransparencySwatch } from "../palette/TransparencySwatch";
import { ElevationLevelSettings } from "./ElevationLevelSettings";
import styles from "./scale-workspace.module.css";

interface ElevationInspectorProps {
  scale: ElevationScale;
  palettes: ColorTrack[];
  selectedLevelId: string;
  onChange: (scale: ElevationScale, editKey?: string) => void;
  onSelectLevel: (id: string) => void;
}

export function ElevationInspector({
  scale,
  palettes,
  selectedLevelId,
  onChange,
  onSelectLevel,
}: ElevationInspectorProps) {
  const selected =
    scale.levels.find((level) => level.id === selectedLevelId) ??
    scale.levels[0];
  const colour = resolveElevationColour(scale, palettes);
  const track =
    palettes.find((item) => item.id === colour.trackId) ?? palettes[0];
  const surfaces = elevationPreviewSurfaces(palettes);

  return (
    <>
      <div className={styles.settingGroup}>
        <h2>Shadow colour</h2>
        <p className={styles.settingHint}>
          One shade in both modes. A shadow is the absence of light — flipping
          it pale on dark draws a halo. Strength is what changes.
        </p>
        {track ? (
          /* One list of every shade, grouped by track and found by typing
             ("primary 900"), rather than a track selector and a weight
             selector. The swatch rides in the trigger. */
          <SheetSelector
            hasSearch
            label="Shadow colour"
            options={shadeOptionSections(palettes, (hex) => (
              <TransparencySwatch alpha={1} colour={hex} />
            ))}
            searchPlaceholder="Search shades"
            size="sm"
            startIcon={<TransparencySwatch alpha={1} colour={colour.hex} />}
            value={shadeOptionValue({
              trackId: track.id,
              weight: track.shades.some(
                (shade) => shade.weight === colour.weight,
              )
                ? colour.weight
                : (track.shades.at(-1)?.weight ?? colour.weight),
            })}
            onChange={(next) => {
              const picked = parseShadeOptionValue(next);
              if (
                picked &&
                palettes.some((item) => item.id === picked.trackId)
              ) {
                onChange(setElevationColour(scale, picked));
              }
            }}
          />
        ) : (
          <p className={styles.settingHint}>
            Build a palette first. Until then the shadows fall back to black.
          </p>
        )}
      </div>
      {/* One level at a time, the one picked on the canvas: every pad for
          every level in one column scrolled forever. */}
      {selected ? (
        <ElevationLevelSettings
          key={selected.id}
          level={selected}
          scale={scale}
          shadowHex={colour.hex}
          surfaces={surfaces}
          onChange={onChange}
          onSelectLevel={onSelectLevel}
        />
      ) : null}
    </>
  );
}
