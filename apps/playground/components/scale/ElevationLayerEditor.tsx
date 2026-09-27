"use client";

import type { ReactNode } from "react";
import { Grip, SunDim, X } from "lucide-react";
import { IconButton } from "@astryxdesign/core/IconButton";
import { InputGroup, InputGroupText } from "@astryxdesign/core/InputGroup";
import { NumberInput } from "@astryxdesign/core/NumberInput";
import {
  COLOUR_MODES,
  ShadowLayerIcon,
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
  /** The default shade's name, shown beside "Default". */
  scaleColourName: string;
  onChange: (scale: ElevationScale, editKey?: string) => void;
  onClose: () => void;
}

/**
 * One layer's settings, laid out the way Figma's shadow popover is: the type
 * as the title, then Position, Blur, Spread and Color as labelled rows, each
 * value with a small tag in front of it.
 *
 * Opacity is two fields rather than Figma's one, because a shadow here is
 * held per mode: the same black needs more of itself on a dark page. It runs
 * to 100%, past the pads' 60%, since a highlight or a glow is meant to be
 * stronger than a shadow.
 */
export function ElevationLayerEditor({
  scale,
  levelId,
  layer,
  layerIndex,
  layerName,
  palettes,
  scaleHex,
  scaleColourName,
  onChange,
  onClose,
}: ElevationLayerEditorProps) {
  /* One history step per field being typed in, not per value it passes. */
  const update = (patch: ShadowLayerPatch, field: string) =>
    onChange(
      updateShadowLayer(scale, levelId, layerIndex, patch),
      `elevation:layer:${levelId}:${layerIndex}:${field}`,
    );

  /** A number with a tag in front, the way Figma marks X, Y, blur, spread. */
  const tagged = (
    field: "offsetXPx" | "offsetYPx" | "blurPx" | "spreadPx",
    name: string,
    tag: ReactNode,
  ) => (
    <InputGroup isLabelHidden label={layerName} size="sm">
      <InputGroupText>
        <span className={styles.layerPopoverTag}>{tag}</span>
      </InputGroupText>
      <NumberInput
        isLabelHidden
        label={name}
        min={field === "blurPx" ? 0 : null}
        size="sm"
        value={layer[field]}
        onChange={(value) => update({ [field]: value }, field)}
      />
    </InputGroup>
  );

  return (
    <div className={styles.layerPopover}>
      <div className={styles.layerPopoverHeader}>
        <ShadowLayerIcon className={styles.layerPopoverIcon} layer={layer} />
        <SheetSelector
          isLabelHidden
          label={`${layerName} type`}
          options={[
            { value: "drop", label: "Drop shadow" },
            { value: "inner", label: "Inner shadow" },
          ]}
          size="sm"
          value={layer.type ?? "drop"}
          variant="ghost"
          onChange={(value) =>
            update({ type: value as ShadowLayerType }, "type")
          }
        />
        <IconButton
          icon={<X aria-hidden="true" />}
          label={`Close ${layerName} settings`}
          size="sm"
          variant="ghost"
          onClick={onClose}
        />
      </div>

      <div className={styles.layerPopoverRows}>
        <span className={styles.layerPopoverLabel}>Position</span>
        <div className={styles.layerPopoverFields}>
          {tagged("offsetXPx", "X", "X")}
          {tagged("offsetYPx", "Y", "Y")}
        </div>

        <span className={styles.layerPopoverLabel}>Blur</span>
        {tagged("blurPx", "Blur", <Grip aria-hidden="true" />)}

        <span className={styles.layerPopoverLabel}>Spread</span>
        {tagged("spreadPx", "Spread", <SunDim aria-hidden="true" />)}

        <span className={styles.layerPopoverLabel}>Color</span>
        {/* Default first: the scale's shadow colour, set in Simple, which is
            what almost every layer wants. Then every shade, found by typing
            ("primary 300"). */}
        <SheetSelector
          hasSearch
          isLabelHidden
          label={`${layerName} colour`}
          options={[
            {
              value: SCALE_COLOUR,
              label: "Default",
              description: scaleColourName,
              icon: <TransparencySwatch alpha={1} colour={scaleHex} />,
            },
            ...shadeOptionSections(palettes, (hex) => (
              <TransparencySwatch alpha={1} colour={hex} />
            )),
          ]}
          searchPlaceholder="Search shades"
          size="sm"
          width="100%"
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

        <span className={styles.layerPopoverLabel}>Opacity</span>
        <div className={styles.layerPopoverFields}>
          {COLOUR_MODES.map((mode) => (
            <InputGroup key={mode} isLabelHidden label={layerName} size="sm">
              <InputGroupText>
                <span className={styles.layerPopoverModeTag}>
                  {mode === "light" ? "Light" : "Dark"}
                </span>
              </InputGroupText>
              <NumberInput
                isLabelHidden
                label={`${mode} opacity`}
                max={100}
                min={0}
                size="sm"
                value={Math.round(layer.opacity[mode] * 100)}
                onChange={(value) =>
                  update(
                    { opacity: { [mode]: value / 100 } },
                    `opacity:${mode}`,
                  )
                }
              />
              <InputGroupText>%</InputGroupText>
            </InputGroup>
          ))}
        </div>
      </div>
    </div>
  );
}
