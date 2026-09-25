"use client";

import { useState } from "react";
import { Eye, EyeOff, Plus, Square, SquareSquare, Trash2 } from "lucide-react";
import { IconButton } from "@astryxdesign/core/IconButton";
import {
  Button,
  addShadowLayer,
  isInnerShadow,
  removeShadowLayer,
  shadowLayerSummary,
  shadowLayerTypeLabel,
  toggleShadowLayerVisibility,
  type ColorTrack,
  type ElevationLevel,
  type ElevationScale,
} from "@blueprint/ui";
import { ElevationLayerEditor } from "./ElevationLayerEditor";
import styles from "./scale-workspace.module.css";

interface ElevationLayerStackProps {
  scale: ElevationScale;
  level: ElevationLevel;
  palettes: ColorTrack[];
  scaleHex: string;
  onChange: (scale: ElevationScale, editKey?: string) => void;
}

/**
 * Advanced mode: a level as a stack of layers, the way Figma's effects panel
 * shows one. Each row names its type and geometry, and can be hidden or
 * deleted; the selected one is edited underneath.
 *
 * Listed in the order CSS paints them, first on top — the same order the
 * value is written in, so "Layer 1" is the first entry of `--shadow-…`.
 */
export function ElevationLayerStack({
  scale,
  level,
  palettes,
  scaleHex,
  onChange,
}: ElevationLayerStackProps) {
  const [selected, setSelected] = useState(0);
  /* Held to the list: deleting the last layer, or switching to a level with
     fewer, leaves the selection on a layer that is still there. */
  const current = Math.min(selected, level.layers.length - 1);
  const layer = level.layers[current];

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
            const TypeIcon = isInnerShadow(each) ? SquareSquare : Square;
            return (
              <li
                key={index}
                className={styles.elevationLayerRow}
                data-hidden={each.hidden || undefined}
                data-selected={index === current || undefined}
              >
                <button
                  aria-label={`${name}: ${shadowLayerTypeLabel(each)}, ${shadowLayerSummary(each)}${each.hidden ? ", hidden" : ""}`}
                  aria-pressed={index === current}
                  className={styles.elevationLayerSelect}
                  type="button"
                  onClick={() => setSelected(index)}
                >
                  <TypeIcon aria-hidden="true" />
                  <span className={styles.elevationLayerText}>
                    <span>{shadowLayerTypeLabel(each)}</span>
                    <span className={styles.elevationLayerSummary}>
                      {shadowLayerSummary(each)}
                    </span>
                  </span>
                </button>
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
                  onClick={() =>
                    onChange(removeShadowLayer(scale, level.id, index))
                  }
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
        size="small"
        variant="outlined"
        onClick={() => {
          onChange(addShadowLayer(scale, level.id));
          setSelected(level.layers.length);
        }}
      >
        Add layer
      </Button>
      {layer ? (
        <ElevationLayerEditor
          layer={layer}
          layerIndex={current}
          layerName={`Layer ${current + 1}`}
          levelId={level.id}
          palettes={palettes}
          scale={scale}
          scaleHex={scaleHex}
          onChange={onChange}
        />
      ) : null}
    </div>
  );
}
