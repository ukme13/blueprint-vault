"use client";

import type { ColorTrack, ResolvedSandboxColour } from "@blueprint/ui";
import { usePaletteView } from "./PaletteViewContext";
import styles from "./accessibility-sandbox.module.css";

interface SandboxRampProps {
  palettes: ColorTrack[];
  /** The colour now held: its track is the ramp, its weight the one outlined. */
  resolved: ResolvedSandboxColour;
  targetLabel: string;
  onChoose: (trackId: string, weight: number) => void;
}

/**
 * The shades of the track the colour is on, 25 to 950, in one strip.
 *
 * For trying neighbours: one press moves a layer a shade lighter or darker
 * without opening the list. A layer on a role shows the shade the role comes
 * to, outlined, and pressing another shade turns it into that shade.
 */
export function SandboxRamp({
  palettes,
  resolved,
  targetLabel,
  onChoose,
}: SandboxRampProps) {
  const { seen } = usePaletteView();
  const track = palettes.find((each) => each.id === resolved.trackId);
  if (!track) return null;

  return (
    <div
      aria-label={`${track.name} shades for ${targetLabel}`}
      className={styles.ramp}
      role="group"
    >
      {track.shades.map((shade) => (
        <button
          key={shade.weight}
          aria-label={`${track.name} ${shade.weight}`}
          aria-pressed={shade.weight === resolved.weight}
          className={styles.rampStep}
          style={{ backgroundColor: seen(shade.hex) }}
          title={`${track.name} ${shade.weight}`}
          type="button"
          onClick={() => onChoose(track.id, shade.weight)}
        />
      ))}
    </div>
  );
}
