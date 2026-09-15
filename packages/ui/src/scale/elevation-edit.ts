import type { ColourMode, SemanticReference } from "../color/semantic";
import type { ColorTrack } from "../color/types";
import { resolveElevation, type ElevationScale } from "./elevation";

/**
 * Edits to the elevation scale.
 *
 * The scale already stores one colour and a per-layer, per-mode opacity. The
 * editor used to throw the second half away: one slider wrote the same alpha
 * onto every layer of a level, so High's seed (0.2 vs 0.3 on dark) could not
 * be expressed. These writes are the ones that keep the stored shape.
 *
 * See docs/roadmap/scale-studio.md.
 */

export function setElevationColour(
  scale: ElevationScale,
  colour: SemanticReference,
): ElevationScale {
  return {
    ...scale,
    colour: { trackId: colour.trackId, weight: colour.weight },
  };
}

/**
 * Point the shadow at another track without jumping to a random shade.
 *
 * Keep the weight when the new ramp has it; otherwise take the darkest, which
 * is what a shadow is for.
 */
export function elevationColourOnTrack(
  colour: SemanticReference,
  track: ColorTrack,
): SemanticReference {
  const keeps = track.shades.some((shade) => shade.weight === colour.weight);
  const darkest = track.shades.reduce<(typeof track.shades)[number] | null>(
    (current, shade) =>
      !current || shade.weight > current.weight ? shade : current,
    null,
  );
  return {
    trackId: track.id,
    weight: keeps ? colour.weight : (darkest?.weight ?? colour.weight),
  };
}

export function setLayerOpacity(
  scale: ElevationScale,
  levelId: string,
  layerIndex: number,
  mode: ColourMode,
  opacity: number,
): ElevationScale {
  const clamped =
    typeof opacity === "number" && Number.isFinite(opacity)
      ? Math.min(Math.max(opacity, 0), 1)
      : 0;
  return {
    ...scale,
    levels: scale.levels.map((level) =>
      level.id !== levelId
        ? level
        : {
            ...level,
            layers: level.layers.map((layer, index) =>
              index !== layerIndex
                ? layer
                : {
                    ...layer,
                    opacity: { ...layer.opacity, [mode]: clamped },
                  },
            ),
          },
    ),
  };
}

/**
 * How a layer is named in the editor.
 *
 * Two layers is the usual shape: a tight contact edge and a wide cast. A
 * numbered fallback is for a stored scale that has some other count.
 */
export function elevationLayerName(index: number, count: number): string {
  if (count === 2) return index === 0 ? "Contact" : "Cast";
  return `Layer ${index + 1}`;
}

/** The shade the shadows are drawn from, named and resolved. */
export function resolveElevationColour(
  scale: ElevationScale,
  tracks: ColorTrack[],
): {
  trackId: string;
  trackName: string;
  weight: number;
  hex: string;
} {
  const track =
    tracks.find((candidate) => candidate.id === scale.colour.trackId) ??
    tracks.find((candidate) => candidate.name === scale.colour.trackId);
  const resolved = resolveElevation(scale, tracks, "light")[0]?.layers[0];
  const hex = resolved
    ? `#${resolved.rgb
        .map((channel) => channel.toString(16).padStart(2, "0"))
        .join("")}`
    : "#000000";
  return {
    trackId: scale.colour.trackId,
    trackName: track?.name ?? scale.colour.trackId,
    weight: scale.colour.weight,
    hex,
  };
}

/**
 * Ground and card fills for the light/dark samples.
 *
 * The card has to be a surface of that mode. A light card on a dark ground
 * is a sticker, and you never see whether the shadow still reads.
 */
export function elevationPreviewSurfaces(
  tracks: ColorTrack[],
): Record<ColourMode, { ground: string; card: string }> {
  const track =
    tracks.find((each) => each.id === "neutral" || each.name === "neutral") ??
    tracks[0];
  const shades = [...(track?.shades ?? [])].sort((a, b) => a.weight - b.weight);
  const lightest = shades[0]?.hex;
  const nextLight = shades[1]?.hex ?? lightest;
  const darkest = shades.at(-1)?.hex;
  const nextDark = shades.at(-2)?.hex ?? darkest;
  return {
    light: {
      ground: nextLight ?? "var(--color-neutral-50)",
      card: lightest ?? "var(--color-neutral-50)",
    },
    dark: {
      ground: darkest ?? "var(--color-neutral-900)",
      card: nextDark ?? "var(--color-neutral-800)",
    },
  };
}
