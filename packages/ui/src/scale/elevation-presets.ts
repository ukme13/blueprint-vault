import type { SemanticReference } from "../color/semantic";
import type { ColorTrack } from "../color/types";
import type { ElevationScale, ShadowLayer } from "./elevation";

/**
 * Starting points for one level's stack, offered in Simple mode.
 *
 * A preset replaces the level's layers and nothing else: its name, id and
 * description stay, so a preset never renames a variable. Standard and Subtle
 * card keep the two-drop-shadow shape the pads edit; Neumorphic, Inset and
 * Glow are shapes the pads cannot describe, and are tuned in Advanced.
 */

export type ElevationPresetId =
  "standard" | "subtle-card" | "neumorphic" | "inset" | "glow";

export interface ElevationPreset {
  id: ElevationPresetId;
  name: string;
  description: string;
}

export const ELEVATION_PRESETS: readonly ElevationPreset[] = [
  {
    id: "standard",
    name: "Standard",
    description: "A contact edge and a soft cast.",
  },
  {
    id: "subtle-card",
    name: "Subtle card",
    description: "Barely off the page.",
  },
  {
    id: "neumorphic",
    name: "Neumorphic",
    description: "A shadow below and a highlight above.",
  },
  {
    id: "inset",
    name: "Inset",
    description: "Pressed into the page.",
  },
  {
    id: "glow",
    name: "Glow",
    description: "A halo in the brand colour.",
  },
];

function drop(
  offsetXPx: number,
  offsetYPx: number,
  blurPx: number,
  spreadPx: number,
  light: number,
  dark: number,
  colour?: SemanticReference,
): ShadowLayer {
  return {
    offsetXPx,
    offsetYPx,
    blurPx,
    spreadPx,
    opacity: { light, dark },
    ...(colour ? { colour } : {}),
  };
}

function trackFor(
  tracks: readonly ColorTrack[],
  trackId: string,
): ColorTrack | undefined {
  return tracks.find((track) => track.id === trackId || track.name === trackId);
}

/**
 * The lightest shade of the scale's own track, for a neumorphic highlight.
 *
 * A real shade rather than a weight guessed at: the resolver falls back to a
 * track's darkest shade when a weight is missing, and a highlight that fell
 * back to the darkest shade would be a second shadow.
 */
function highlight(
  scale: ElevationScale,
  tracks: readonly ColorTrack[],
): SemanticReference | undefined {
  const track = trackFor(tracks, scale.colour.trackId) ?? tracks[0];
  const lightest = track?.shades.reduce<ColorTrack["shades"][number] | null>(
    (current, shade) =>
      !current || shade.weight < current.weight ? shade : current,
    null,
  );
  return track && lightest
    ? { trackId: track.id, weight: lightest.weight }
    : undefined;
}

/**
 * The brand colour for a glow: the primary track's locked source shade, where
 * the brand colour is exact, or the shade nearest 500 without one.
 */
function brand(tracks: readonly ColorTrack[]): SemanticReference | undefined {
  const track =
    trackFor(tracks, "primary") ??
    tracks.find((each) => each.id !== "neutral" && each.name !== "neutral") ??
    tracks[0];
  if (!track || track.shades.length === 0) return undefined;
  const source = track.shades.find((shade) => shade.anchorType === "source");
  const shade =
    source ??
    track.shades.reduce((nearest, each) =>
      Math.abs(each.weight - 500) < Math.abs(nearest.weight - 500)
        ? each
        : nearest,
    );
  return { trackId: track.id, weight: shade.weight };
}

/**
 * A preset's layers, for this scale and palette.
 *
 * Without a palette the coloured layers take the scale's colour instead, so a
 * preset still draws something rather than failing.
 */
export function elevationPresetLayers(
  presetId: ElevationPresetId,
  scale: ElevationScale,
  tracks: readonly ColorTrack[],
): ShadowLayer[] {
  switch (presetId) {
    case "standard":
      return [drop(0, 1, 2, 0, 0.1, 0.4), drop(0, 4, 12, 0, 0.1, 0.45)];
    case "subtle-card":
      return [drop(0, 1, 1, 0, 0.06, 0.3), drop(0, 1, 4, 0, 0.06, 0.3)];
    case "neumorphic":
      /* The highlight is strong in light mode, where it has a pale page to
         read against, and faint in dark, where a bright edge would glare. */
      return [
        drop(6, 6, 12, 0, 0.15, 0.5),
        drop(-6, -6, 12, 0, 0.9, 0.08, highlight(scale, tracks)),
      ];
    case "inset":
      return [
        { ...drop(0, 2, 4, 0, 0.15, 0.5), type: "inner" },
        { ...drop(0, 1, 1, 0, 0.1, 0.4), type: "inner" },
      ];
    case "glow": {
      const colour = brand(tracks);
      return [
        drop(0, 0, 4, 0, 0.35, 0.45, colour),
        drop(0, 0, 16, 2, 0.3, 0.4, colour),
      ];
    }
  }
}

/** Replace one level's layers with a preset's. An unknown level is a no-op. */
export function applyElevationPreset(
  scale: ElevationScale,
  levelId: string,
  presetId: ElevationPresetId,
  tracks: readonly ColorTrack[],
): ElevationScale {
  if (!scale.levels.some((level) => level.id === levelId)) return scale;
  const layers = elevationPresetLayers(presetId, scale, tracks);
  return {
    ...scale,
    levels: scale.levels.map((level) =>
      level.id === levelId ? { ...level, layers } : level,
    ),
  };
}
