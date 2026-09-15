"use client";

import type { CSSProperties } from "react";
import { Selector } from "@astryxdesign/core/Selector";
import { Slider } from "@astryxdesign/core/Slider";
import {
  COLOUR_MODES,
  elevationColourOnTrack,
  elevationLayerName,
  elevationPreviewSurfaces,
  resolveElevationColour,
  setElevationColour,
  setLayerOpacity,
  type ColorTrack,
  type ElevationScale,
} from "@blueprint/ui";
import styles from "./scale-workspace.module.css";

interface ElevationInspectorProps {
  scale: ElevationScale;
  palettes: ColorTrack[];
  onChange: (scale: ElevationScale, editKey?: string) => void;
}

const OPACITY_MAX = 0.6;
const OPACITY_STEP = 0.05;

export function ElevationInspector({
  scale,
  palettes,
  onChange,
}: ElevationInspectorProps) {
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
          <div className={styles.elevationColour}>
            <span
              aria-hidden="true"
              className={styles.elevationSwatch}
              style={{ background: colour.hex }}
            />
            <div className={styles.elevationColourFields}>
              <Selector
                label="Shadow colour track"
                options={palettes.map((item) => ({
                  label: item.name,
                  value: item.id,
                }))}
                size="sm"
                value={track.id}
                onChange={(trackId) => {
                  const next = palettes.find((item) => item.id === trackId);
                  if (!next) return;
                  onChange(
                    setElevationColour(
                      scale,
                      elevationColourOnTrack(scale.colour, next),
                    ),
                  );
                }}
              />
              <Selector
                hasSearch={track.shades.length > 8}
                label="Shadow colour weight"
                options={track.shades.map((shade) => ({
                  label: String(shade.weight),
                  value: String(shade.weight),
                }))}
                searchPlaceholder="Search weights..."
                size="sm"
                value={String(
                  track.shades.some((shade) => shade.weight === colour.weight)
                    ? colour.weight
                    : track.shades.at(-1)?.weight,
                )}
                onChange={(weight) =>
                  onChange(
                    setElevationColour(scale, {
                      trackId: track.id,
                      weight: Number(weight),
                    }),
                  )
                }
              />
            </div>
          </div>
        ) : (
          <p className={styles.settingHint}>
            Build a palette first. Until then the shadows fall back to black.
          </p>
        )}
      </div>
      {scale.levels.map((level) => (
        <div key={level.id} className={styles.settingGroup}>
          <h2>{level.name}</h2>
          <p className={styles.settingHint}>{level.description}</p>
          {level.layers.map((layer, index) => {
            const layerName = elevationLayerName(index, level.layers.length);
            return (
              <div key={index} className={styles.elevationLayer}>
                <span className={styles.elevationLayerName}>{layerName}</span>
                {COLOUR_MODES.map((mode) => (
                  <div
                    key={mode}
                    className={styles.elevationOpacity}
                    data-elevation-opacity=""
                    data-layer={layerName.toLowerCase()}
                    data-mode={mode}
                    style={
                      {
                        "--elevation-surface": surfaces[mode].card,
                        "--elevation-shadow": colour.hex,
                        "--elevation-opacity": String(layer.opacity[mode]),
                        "--elevation-mix": String(
                          Math.round(OPACITY_MAX * 100),
                        ),
                      } as CSSProperties
                    }
                  >
                    <span className={styles.elevationMode} aria-hidden="true">
                      {mode === "light" ? "Light" : "Dark"}
                    </span>
                    <span className={styles.elevationSlider}>
                      <Slider
                        formatValue={(value) => `${Math.round(value * 100)}%`}
                        isLabelHidden
                        label={`${level.name} ${layerName.toLowerCase()} ${mode}`}
                        max={OPACITY_MAX}
                        min={0}
                        step={OPACITY_STEP}
                        value={layer.opacity[mode]}
                        width="100%"
                        onChange={(value: number) =>
                          onChange(
                            setLayerOpacity(
                              scale,
                              level.id,
                              index,
                              mode,
                              value,
                            ),
                            `elevation:opacity:${level.id}:${index}:${mode}`,
                          )
                        }
                      />
                    </span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      ))}
    </>
  );
}
