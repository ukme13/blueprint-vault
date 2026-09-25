"use client";

import { NumberInput } from "@astryxdesign/core/NumberInput";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@astryxdesign/core/SegmentedControl";
import { Slider } from "@astryxdesign/core/Slider";
import {
  COLOUR_MODES,
  parseShadeOptionValue,
  shadeOptionSections,
  shadeOptionValue,
  updateShadowLayer,
  type ColorTrack,
  type ElevationScale,
  type ShadowLayer,
  type ShadowLayerPatch,
  type ShadowLayerType,
} from "@blueprint/ui";
import { SheetSelector } from "../SheetSelector";
import { TransparencySwatch } from "../palette/TransparencySwatch";
import styles from "./scale-workspace.module.css";

/** The value the colour list uses for "the scale's own colour". */
const SCALE_COLOUR = "scale";

interface ElevationLayerEditorProps {
  scale: ElevationScale;
  levelId: string;
  layer: ShadowLayer;
  layerIndex: number;
  /** "Layer 2", as the list names it; every field's label starts with it. */
  layerName: string;
  palettes: ColorTrack[];
  /** The scale's shadow colour, for the "scale colour" choice's swatch. */
  scaleHex: string;
  onChange: (scale: ElevationScale, editKey?: string) => void;
}

/**
 * One layer's settings: its type, its geometry, its colour, and how strong it
 * is in each mode.
 *
 * Opacity here runs to 100%, past the 60% the pads stop at: a neumorphic
 * highlight or a glow is meant to be stronger than a shadow.
 */
export function ElevationLayerEditor({
  scale,
  levelId,
  layer,
  layerIndex,
  layerName,
  palettes,
  scaleHex,
  onChange,
}: ElevationLayerEditorProps) {
  /* One history step per field being dragged or typed in, not per value it
     passes through. */
  const update = (patch: ShadowLayerPatch, field: string) =>
    onChange(
      updateShadowLayer(scale, levelId, layerIndex, patch),
      `elevation:layer:${levelId}:${layerIndex}:${field}`,
    );

  const geometry = [
    ["offsetXPx", "X"],
    ["offsetYPx", "Y"],
    ["blurPx", "Blur"],
    ["spreadPx", "Spread"],
  ] as const;

  return (
    <div
      aria-label={`${layerName} settings`}
      className={styles.elevationLayerEditor}
      role="group"
    >
      <SegmentedControl
        label={`${layerName} type`}
        layout="fill"
        size="sm"
        value={layer.type ?? "drop"}
        onChange={(value) => update({ type: value as ShadowLayerType }, "type")}
      >
        <SegmentedControlItem label="Drop shadow" value="drop" />
        <SegmentedControlItem label="Inner shadow" value="inner" />
      </SegmentedControl>

      <div className={styles.elevationLayerGeometry}>
        {geometry.map(([field, label]) => (
          <NumberInput
            key={field}
            formatValue={(value) => `${value}px`}
            label={label}
            min={field === "blurPx" ? 0 : null}
            size="sm"
            value={layer[field]}
            onChange={(value) => update({ [field]: value }, field)}
          />
        ))}
      </div>

      {/* The scale's colour first, since it is what almost every layer
          wants; then every shade, found by typing ("primary 300"). */}
      <SheetSelector
        hasSearch
        label={`${layerName} colour`}
        options={[
          {
            value: SCALE_COLOUR,
            label: "Shadow colour",
            icon: <TransparencySwatch alpha={1} colour={scaleHex} />,
          },
          ...shadeOptionSections(palettes, (hex) => (
            <TransparencySwatch alpha={1} colour={hex} />
          )),
        ]}
        searchPlaceholder="Search shades"
        size="md"
        value={layer.colour ? shadeOptionValue(layer.colour) : SCALE_COLOUR}
        onChange={(next) => {
          if (next === SCALE_COLOUR) {
            update({ colour: null }, "colour");
            return;
          }
          const picked = parseShadeOptionValue(next);
          if (picked) update({ colour: picked }, "colour");
        }}
      />

      {COLOUR_MODES.map((mode) => (
        <div key={mode} className={styles.elevationOpacity}>
          <span className={styles.elevationMode} aria-hidden="true">
            {mode === "light" ? "Light" : "Dark"}
          </span>
          <Slider
            formatValue={(value) => `${Math.round(value * 100)}%`}
            isLabelHidden
            label={`${layerName} ${mode} opacity`}
            max={1}
            min={0}
            step={0.01}
            value={layer.opacity[mode]}
            width="100%"
            onChange={(value: number) =>
              update({ opacity: { [mode]: value } }, `opacity:${mode}`)
            }
          />
        </div>
      ))}
    </div>
  );
}
