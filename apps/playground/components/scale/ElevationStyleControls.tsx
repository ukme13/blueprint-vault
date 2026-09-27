"use client";

import { Slider } from "@astryxdesign/core/Slider";
import {
  COLOUR_MODES,
  GLOW_SIZE,
  NEUMORPHIC_DISTANCE,
  glowIntensity,
  glowSize,
  isGlowLevel,
  isNeumorphicLevel,
  neumorphicDistance,
  setGlowElevationIntensity,
  setGlowElevationSize,
  setNeumorphicElevationDistance,
  setNeumorphicElevationOpacities,
  type ElevationLevel,
  type ElevationScale,
} from "@blueprint/ui";
import styles from "./scale-workspace.module.css";

interface ElevationStyleControlsProps {
  scale: ElevationScale;
  level: ElevationLevel;
  onChange: (scale: ElevationScale, editKey?: string) => void;
}

const MODE_NAME = { light: "Light", dark: "Dark" } as const;
const percent = (value: number) => `${Math.round(value * 100)}%`;
const px = (value: number) => `${value}px`;

/**
 * Simple's controls for the presets the contact and cast pads cannot
 * describe: Neumorphic by its distance and the strength of its shadow and
 * highlight, Glow by its size and intensity. Each slider keeps the level
 * that preset, so the selector above still names it.
 *
 * A level of any other shape gets nothing here: it is edited in Advanced.
 */
export function ElevationStyleControls({
  scale,
  level,
  onChange,
}: ElevationStyleControlsProps) {
  /* Each slider is one step in history per drag, not one per value. */
  const key = (control: string) => `elevation:style:${level.id}:${control}`;

  if (isNeumorphicLevel(level)) {
    const [shadow, highlight] = level.layers;
    return (
      <div
        aria-label={`${level.name} neumorphic`}
        className={styles.settingSubgroup}
        role="group"
      >
        <Slider
          formatValue={px}
          label="Distance"
          max={NEUMORPHIC_DISTANCE.max}
          min={NEUMORPHIC_DISTANCE.min}
          value={neumorphicDistance(level)}
          valueDisplay="text"
          width="100%"
          onChange={(value: number) =>
            onChange(
              setNeumorphicElevationDistance(scale, level.id, value),
              key("distance"),
            )
          }
        />
        {COLOUR_MODES.map((mode) => (
          <div key={mode} className={styles.styleControlPair}>
            {(["shadow", "highlight"] as const).map((part) => {
              const current = (part === "shadow" ? shadow : highlight)!.opacity[
                mode
              ];
              return (
                <Slider
                  key={part}
                  formatValue={percent}
                  label={`${MODE_NAME[mode]} ${part}`}
                  max={1}
                  min={0}
                  step={0.05}
                  value={current}
                  valueDisplay="text"
                  width="100%"
                  onChange={(value: number) =>
                    onChange(
                      setNeumorphicElevationOpacities(
                        scale,
                        level.id,
                        mode,
                        part === "shadow" ? value : shadow!.opacity[mode],
                        part === "highlight" ? value : highlight!.opacity[mode],
                      ),
                      key(`${part}:${mode}`),
                    )
                  }
                />
              );
            })}
          </div>
        ))}
      </div>
    );
  }

  if (isGlowLevel(level)) {
    return (
      <div
        aria-label={`${level.name} glow`}
        className={styles.settingSubgroup}
        role="group"
      >
        <Slider
          formatValue={px}
          label="Size"
          max={GLOW_SIZE.max}
          min={GLOW_SIZE.min}
          value={glowSize(level)}
          valueDisplay="text"
          width="100%"
          onChange={(value: number) =>
            onChange(setGlowElevationSize(scale, level.id, value), key("size"))
          }
        />
        <div className={styles.styleControlPair}>
          {COLOUR_MODES.map((mode) => (
            <Slider
              key={mode}
              formatValue={percent}
              label={`${MODE_NAME[mode]} intensity`}
              max={1}
              min={0}
              step={0.05}
              value={glowIntensity(level, mode)}
              valueDisplay="text"
              width="100%"
              onChange={(value: number) =>
                onChange(
                  setGlowElevationIntensity(scale, level.id, mode, value),
                  key(`intensity:${mode}`),
                )
              }
            />
          ))}
        </div>
      </div>
    );
  }

  return null;
}
