"use client";

import { useState } from "react";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@astryxdesign/core/SegmentedControl";
import {
  Button,
  elevationPreviewSurfaces,
  isSimpleElevationLevel,
  resolveElevationColour,
  type ColorTrack,
  type ElevationScale,
} from "@blueprint/ui";
import {
  ElevationLevelDetails,
  ElevationLevelStrength,
} from "./ElevationLevelSettings";
import { ElevationColourSetting } from "./ElevationColourSetting";
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

  /* Simple's colour: the shadow colour every level shares, or the level's
     own for one like Glow. In Advanced each layer's Color list starts with
     the shared colour as "Default", so a second control there only
     duplicated it; it shows there only to say why, with no palette, every
     layer falls back to black. */
  const colourSetting = (
    <ElevationColourSetting
      level={selected}
      palettes={palettes}
      scale={scale}
      onChange={onChange}
    />
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
            size="md"
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
      {/* Colour, presets and pads are one group: all three set how this
          level's shadow looks in Simple, so no divider runs between them. */}
      {selected && view === "simple" ? (
        <div
          aria-label={`${selected.name} simple`}
          className={`${styles.settingGroup} ${styles.elevationSimple}`}
          role="group"
        >
          {/* The preset first: it is the quickest way to a whole shadow, and
              the colour and pads tune whatever it sets. */}
          <ElevationPresets
            level={selected}
            palettes={palettes}
            scale={scale}
            onChange={onChange}
          />
          {colourSetting}
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
            <div className={styles.settingSubgroup}>
              <p className={styles.settingHint}>
                {selected.name} has a custom layer stack that the contact and
                cast pads can’t describe.
              </p>
              <Button
                scheme="neutral"
                size="medium"
                variant="outlined"
                onClick={() => setView("advanced")}
              >
                Edit layers in Advanced
              </Button>
            </div>
          )}
        </div>
      ) : null}
      {/* No palette: say why every layer falls back to black. */}
      {selected && view === "advanced" && !track ? (
        <div className={styles.settingGroup}>{colourSetting}</div>
      ) : null}
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
