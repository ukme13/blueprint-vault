"use client";

import { useState } from "react";
import { Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { IconButton } from "@astryxdesign/core/IconButton";
import {
  Button,
  addShadowLayer,
  removeShadowLayer,
  ShadowLayerIcon,
  shadowLayerSummary,
  shadowLayerTypeLabel,
  toggleShadowLayerVisibility,
  type ColorTrack,
  type ElevationLevel,
  type ElevationScale,
} from "@blueprint/ui";
import { PopoverOrSheet } from "../PopoverOrSheet";
import { ElevationLayerEditor } from "./ElevationLayerEditor";
import styles from "./scale-workspace.module.css";

interface ElevationLayerStackProps {
  scale: ElevationScale;
  level: ElevationLevel;
  palettes: ColorTrack[];
  scaleHex: string;
  /** The default shade's name, "primary 200", for the layers' Color lists. */
  scaleColourName: string;
  onChange: (scale: ElevationScale, editKey?: string) => void;
}

/**
 * Advanced mode: a level as a stack of layers, the way Figma's effects panel
 * shows one. Each row names its type and geometry, and can be hidden or
 * deleted. Clicking a row opens its settings beside the panel, to the left,
 * over the canvas — where Figma puts them, and where the shadow being edited
 * stays in view. A phone has no room beside the panel, so there they come up
 * as a sheet.
 *
 * Listed in the order CSS paints them, first on top — the same order the
 * value is written in, so "Layer 1" is the first entry of `--shadow-…`.
 */
export function ElevationLayerStack({
  scale,
  level,
  palettes,
  scaleHex,
  scaleColourName,
  onChange,
}: ElevationLayerStackProps) {
  const [open, setOpen] = useState<number | null>(null);

  const editor = (index: number) => {
    const layer = level.layers[index];
    return layer ? (
      <ElevationLayerEditor
        layer={layer}
        layerIndex={index}
        layerName={`Layer ${index + 1}`}
        levelId={level.id}
        palettes={palettes}
        scale={scale}
        scaleColourName={scaleColourName}
        scaleHex={scaleHex}
        onChange={onChange}
        onClose={() => setOpen(null)}
      />
    ) : null;
  };

  return (
    <div
      aria-label={`${level.name} layers`}
      className={styles.settingGroup}
      role="group"
    >
      <h2>Layers</h2>
      {level.layers.length === 0 ? (
        <p className={styles.settingHint}>
          No layers: this level draws no shadow.
        </p>
      ) : (
        <ul className={styles.elevationLayerList}>
          {level.layers.map((each, index) => {
            const name = `Layer ${index + 1}`;
            const row = (
              <button
                aria-expanded={open === index}
                aria-label={`${name}: ${shadowLayerTypeLabel(each)}, ${shadowLayerSummary(each)}${each.hidden ? ", hidden" : ""}`}
                className={styles.elevationLayerSelect}
                type="button"
              >
                {/* Marked on the side its shadow falls, as in Figma. */}
                <ShadowLayerIcon
                  className={styles.elevationLayerIcon}
                  layer={each}
                />
                <span className={styles.elevationLayerText}>
                  <span>{shadowLayerTypeLabel(each)}</span>
                  <span className={styles.elevationLayerSummary}>
                    {shadowLayerSummary(each)}
                  </span>
                </span>
              </button>
            );
            return (
              <li
                key={index}
                className={styles.elevationLayerRow}
                data-hidden={each.hidden || undefined}
                data-selected={open === index || undefined}
              >
                <PopoverOrSheet
                  isOpen={open === index}
                  label={`${name} settings`}
                  trigger={row}
                  width={264}
                  onOpenChange={(isOpen) => setOpen(isOpen ? index : null)}
                >
                  {editor(index)}
                </PopoverOrSheet>
                <IconButton
                  icon={
                    each.hidden ? (
                      <EyeOff aria-hidden="true" />
                    ) : (
                      <Eye aria-hidden="true" />
                    )
                  }
                  label={each.hidden ? `Show ${name}` : `Hide ${name}`}
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    onChange(
                      toggleShadowLayerVisibility(scale, level.id, index),
                    )
                  }
                />
                <IconButton
                  icon={<Trash2 aria-hidden="true" />}
                  label={`Delete ${name}`}
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    onChange(removeShadowLayer(scale, level.id, index));
                    if (open !== null && open >= index) setOpen(null);
                  }}
                />
              </li>
            );
          })}
        </ul>
      )}
      <Button
        className="w-full"
        leftIcon={<Plus aria-hidden="true" />}
        scheme="neutral"
        size="medium"
        variant="outlined"
        onClick={() => onChange(addShadowLayer(scale, level.id))}
      >
        Add layer
      </Button>
    </div>
  );
}
