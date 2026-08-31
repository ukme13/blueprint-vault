"use client";

import { Slider } from "@astryxdesign/core/Slider";
import {
  MAX_RADIUS_MULTIPLIER,
  MIN_RADIUS_MULTIPLIER,
  resolveRadius,
  type RadiusScale,
} from "@blueprint/ui";

/**
 * Edit the corner radii: one multiplier over tokens named for their use.
 *
 * The swatch is the control that matters. A radius is judged by looking at a
 * corner, and a column of pixel values does not tell anybody whether a card and
 * a button read as the same family.
 *
 * See docs/roadmap/scale-studio.md.
 */

interface RadiusEditorProps {
  scale: RadiusScale;
  onChange: (scale: RadiusScale) => void;
}

export function RadiusEditor({ scale, onChange }: RadiusEditorProps) {
  const tokens = resolveRadius(scale);

  return (
    <section aria-label="Radius" className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold">Radius</h2>
      <p className="max-w-2xl text-sm text-[var(--color-text-secondary)]">
        Named for what they go on rather than how big they are. One multiplier
        moves them together, because &ldquo;make the whole thing rounder&rdquo;
        is one decision.
      </p>

      <div className="max-w-sm">
        <Slider
          label={`Roundness: ${scale.multiplier}×`}
          max={MAX_RADIUS_MULTIPLIER}
          min={MIN_RADIUS_MULTIPLIER}
          step={0.25}
          value={scale.multiplier}
          onChange={(value: number | [number, number]) =>
            onChange({ ...scale, multiplier: value as number })
          }
        />
      </div>

      <ol className="flex flex-wrap gap-4">
        {tokens.map((token) => (
          <li key={token.id} className="flex w-40 flex-col gap-1">
            <span
              aria-hidden="true"
              className="h-16 w-full border border-[var(--color-border)] bg-[var(--color-primary-200)]"
              style={{ borderRadius: `${token.px}px` }}
            />
            <span className="text-sm font-medium">{token.name}</span>
            <code className="text-xs text-[var(--color-text-secondary)]">
              {token.variable}
            </code>
            <span className="text-xs tabular-nums">
              {token.px}px
              {!token.scales && (
                /* Said out loud, because a control that appears not to work is
                   worse than one that says why. */
                <span className="text-[var(--color-text-secondary)]">
                  {" "}
                  · fixed
                </span>
              )}
            </span>
            <span className="text-xs text-[var(--color-text-secondary)]">
              {token.description}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
