"use client";

import type { CSSProperties } from "react";
import { SheetSelector } from "../SheetSelector";
import { Slider } from "@astryxdesign/core/Slider";
import {
  COLOUR_MODES,
  ELEVATION_OPACITY_MAX,
  ELEVATION_OPACITY_STEP,
  elevationColourOnTrack,
  elevationLayerName,
  elevationPreviewSurfaces,
  resolveElevationColour,
  setElevationColour,
  setLayerOpacity,
  setLevelModeOpacities,
  type ColorTrack,
  type ElevationScale,
} from "@blueprint/ui";
import { ElevationPad } from "./ElevationPad";
import styles from "./scale-workspace.module.css";

interface ElevationInspectorProps {
  scale: ElevationScale;
  palettes: ColorTrack[];
  onChange: (scale: ElevationScale, editKey?: string) => void;
}

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
              <SheetSelector
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
              <SheetSelector
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
          {level.layers.length === 2 ? (
            <div className={styles.elevationPads}>
              {COLOUR_MODES.map((mode) => (
                <div
                  key={mode}
                  className={styles.elevationPadBlock}
                  data-elevation-pad=""
                  data-mode={mode}
                >
                  <span className={styles.elevationPadLabel}>
                    {mode === "light" ? "Light" : "Dark"}
                  </span>
                  <ElevationPad
                    cast={level.layers[1]!.opacity[mode]}
                    contact={level.layers[0]!.opacity[mode]}
                    label={`${level.name} ${mode} contact and cast`}
                    shadow={colour.hex}
                    surface={surfaces[mode].card}
                    onChange={(contact, cast) =>
                      onChange(
                        setLevelModeOpacities(
                          scale,
                          level.id,
                          mode,
                          contact,
                          cast,
                        ),
                        `elevation:opacity:${level.id}:${mode}`,
                      )
                    }
                  />
                  <span className={styles.elevationPadReadout}>
                    Contact {Math.round(level.layers[0]!.opacity[mode] * 100)}%
                    {" · "}
                    Cast {Math.round(level.layers[1]!.opacity[mode] * 100)}%
                  </span>
                </div>
              ))}
            </div>
          ) : (
            level.layers.map((layer, index) => {
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
                            Math.round(ELEVATION_OPACITY_MAX * 100),
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
                          max={ELEVATION_OPACITY_MAX}
                          min={0}
                          step={ELEVATION_OPACITY_STEP}
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
            })
          )}
        </div>
      ))}
    </>
  );
}
