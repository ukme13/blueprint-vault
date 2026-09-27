"use client";

import { useState } from "react";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@astryxdesign/core/SegmentedControl";
import { SheetSelector } from "../SheetSelector";
import {
  Button,
  elevationPreviewSurfaces,
  isSimpleElevationLevel,
  parseShadeOptionValue,
  resolveElevationColour,
  setElevationColour,
  shadeOptionSections,
  shadeOptionValue,
  type ColorTrack,
  type ElevationScale,
} from "@blueprint/ui";
import { TransparencySwatch } from "../palette/TransparencySwatch";
import {
  ElevationLevelDetails,
  ElevationLevelStrength,
} from "./ElevationLevelSettings";
import { ElevationLayerStack } from "./ElevationLayerStack";
import { ElevationPresets } from "./ElevationPresets";
import styles from "./scale-workspace.module.css";

type ElevationView = "simple" | "advanced";

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
  /* Simple by default: presets and the two pads cover what most levels
     need. Advanced is the whole stack. The choice is how the level is
     edited, not part of it, so it is not saved with the scale. */
  const [view, setView] = useState<ElevationView>("simple");

  /* The default every layer is drawn in, unless it picks its own. One shade
     for every level, in both modes: a shadow is the absence of light, and
     flipping it pale on dark would draw a halo. Shown in Simple, where it is
     the only colour; in Advanced each layer's Color list starts with it as
     "Default", so a second control for it there only duplicated that. */
  const colourSetting = (
    <div className={styles.settingGroup}>
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
      ) : (
        <p className={styles.settingHint}>
          Build a palette first. Until then the shadows fall back to black.
        </p>
      )}
    </div>
  );

  return (
    <>
      {selected ? (
        <ElevationLevelDetails
          key={`details-${selected.id}`}
          level={selected}
          scale={scale}
          onChange={onChange}
          onSelectLevel={onSelectLevel}
        />
      ) : null}
      {selected ? (
        <div className={styles.settingGroup}>
          <SegmentedControl
            label="Elevation editor"
            layout="fill"
            size="sm"
            value={view}
            onChange={(value) => setView(value as ElevationView)}
          >
            <SegmentedControlItem label="Simple" value="simple" />
            <SegmentedControlItem label="Advanced" value="advanced" />
          </SegmentedControl>
        </div>
      ) : null}
      {/* One level at a time, the one picked on the canvas: every pad for
          every level in one column scrolled forever. */}
      {selected && view === "simple" ? (
        <>
          {colourSetting}
          <ElevationPresets
            level={selected}
            palettes={palettes}
            scale={scale}
            onChange={onChange}
          />
          {isSimpleElevationLevel(selected) ? (
            <ElevationLevelStrength
              key={`strength-${selected.id}`}
              level={selected}
              scale={scale}
              shadowHex={colour.hex}
              surfaces={surfaces}
              onChange={onChange}
            />
          ) : (
            /* The pads set a contact and a cast layer. On any other stack
               they would set half of what is drawn, so they step aside. */
            <div className={styles.settingGroup}>
              <p className={styles.settingHint}>
                {selected.name} has a custom layer stack that the contact and
                cast pads can’t describe.
              </p>
              <Button
                scheme="neutral"
                size="small"
                variant="outlined"
                onClick={() => setView("advanced")}
              >
                Edit layers in Advanced
              </Button>
            </div>
          )}
        </>
      ) : null}
      {/* No palette: say why every layer falls back to black. */}
      {selected && view === "advanced" && !track ? colourSetting : null}
      {selected && view === "advanced" ? (
        <ElevationLayerStack
          key={`layers-${selected.id}`}
          level={selected}
          palettes={palettes}
          scale={scale}
          scaleColourName={`${colour.trackName} ${colour.weight}`}
          scaleHex={colour.hex}
          onChange={onChange}
        />
      ) : null}
    </>
  );
}
