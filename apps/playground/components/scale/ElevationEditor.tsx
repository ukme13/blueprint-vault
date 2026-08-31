"use client";

import { Slider } from "@astryxdesign/core/Slider";
import {
  COLOUR_MODES,
  resolveElevation,
  type ColorTrack,
  type ColourMode,
  type ElevationScale,
} from "@blueprint/ui";

/**
 * Edit the shadow levels.
 *
 * Shown on both a light and a dark ground, because that is the whole reason
 * opacity is held per mode: the same black at the same alpha reads as nothing
 * once the background is already dark, and a single preview would hide it.
 *
 * See docs/roadmap/scale-studio.md.
 */

interface ElevationEditorProps {
  scale: ElevationScale;
  palettes: ColorTrack[];
  onChange: (scale: ElevationScale) => void;
}

/** The ground a shadow is shown against, so the sample is honest. */
const GROUND: Record<ColourMode, string> = {
  light: "var(--color-neutral-50)",
  dark: "var(--color-neutral-900)",
};

export function ElevationEditor({
  scale,
  palettes,
  onChange,
}: ElevationEditorProps) {
  const setOpacity = (
    levelId: string,
    mode: ColourMode,
    opacity: number,
  ): void =>
    onChange({
      ...scale,
      levels: scale.levels.map((level) =>
        level.id === levelId
          ? {
              ...level,
              layers: level.layers.map((layer) => ({
                ...layer,
                opacity: { ...layer.opacity, [mode]: opacity },
              })),
            }
          : level,
      ),
    });

  return (
    <section aria-label="Elevation" className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold">Elevation</h2>
      <p className="max-w-2xl text-sm text-[var(--color-text-secondary)]">
        A level is a stack of shadows, not a single one: the tight layer says
        the edge is off the surface, the wide one says how far. The colour stays
        the same in both modes — a shadow is the absence of light — and what
        changes is how much of it a dark surface needs.
      </p>

      <ol className="flex flex-col gap-5">
        {scale.levels.map((level) => (
          <li key={level.id} className="flex flex-col gap-2">
            <div className="flex items-baseline gap-2">
              <strong className="text-sm">{level.name}</strong>
              <code className="text-xs text-[var(--color-text-secondary)]">
                --shadow-{level.id}
              </code>
              <span className="text-xs text-[var(--color-text-secondary)]">
                {level.description}
              </span>
            </div>

            <div className="flex flex-wrap gap-4">
              {COLOUR_MODES.map((mode) => {
                const resolved = resolveElevation(scale, palettes, mode).find(
                  (each) => each.id === level.id,
                );
                const opacity = level.layers[0]?.opacity[mode] ?? 0;

                return (
                  <div key={mode} className="flex flex-col gap-2">
                    <div
                      className="flex h-24 w-48 items-center justify-center rounded"
                      style={{ background: GROUND[mode] }}
                    >
                      <span
                        aria-label={`${level.name} on ${mode}`}
                        className="h-12 w-32 rounded bg-[var(--color-neutral-50)]"
                        style={{ boxShadow: resolved?.css }}
                      />
                    </div>
                    <div className="w-48">
                      <Slider
                        label={`${level.name} ${mode} strength`}
                        max={0.6}
                        min={0}
                        step={0.05}
                        value={opacity}
                        onChange={(value: number | [number, number]) =>
                          setOpacity(level.id, mode, value as number)
                        }
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
