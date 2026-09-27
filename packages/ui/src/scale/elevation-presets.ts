import type { ColourMode, SemanticReference } from "../color/semantic";
import type { ColorTrack } from "../color/types";
import {
  isInnerShadow,
  resolveElevation,
  type ElevationLevel,
  type ElevationScale,
  type ShadowLayer,
} from "./elevation";
import {
  isGlowLevel,
  isInsetLevel,
  isNeumorphicLevel,
} from "./elevation-styles";

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

/**
 * A level's layer is still the preset's: every value equal, absent read as
 * default. A preset layer with a colour of its own — Glow's, Neumorphic's
 * highlight — matches any colour of its own, so recolouring a Glow leaves it
 * a Glow rather than Custom. A layer in the scale's colour must stay in it.
 */
function sameLayer(preset: ShadowLayer, layer: ShadowLayer): boolean {
  const a = preset;
  const b = layer;
  return (
    isInnerShadow(a) === isInnerShadow(b) &&
    a.offsetXPx === b.offsetXPx &&
    a.offsetYPx === b.offsetYPx &&
    a.blurPx === b.blurPx &&
    a.spreadPx === b.spreadPx &&
    a.opacity.light === b.opacity.light &&
    a.opacity.dark === b.opacity.dark &&
    Boolean(a.hidden) === Boolean(b.hidden) &&
    (a.colour ? Boolean(b.colour) : !b.colour)
  );
}

/**
 * The preset a level is exactly, or null for one that has been changed from
 * any preset — which the studio names "Custom".
 *
 * Exact for Standard and Subtle card: one opacity moved a step is no longer
 * that preset, and the selector saying otherwise would hide the edit. Inset,
 * Neumorphic and Glow go by their shape instead, since Simple tunes them.
 */
export function matchingElevationPreset(
  level: ElevationLevel,
  scale: ElevationScale,
  tracks: readonly ColorTrack[],
): ElevationPresetId | null {
  const match = ELEVATION_PRESETS.find((preset) => {
    const layers = elevationPresetLayers(preset.id, scale, tracks);
    return (
      layers.length === level.layers.length &&
      layers.every((layer, index) => sameLayer(layer, level.layers[index]!))
    );
  });
  if (match) return match.id;
  /* Not exactly a preset, but still one's shape once tuned in Simple: an
     Inset pressed deeper, a Neumorphic lifted higher, a Glow made wider. */
  if (isInsetLevel(level)) return "inset";
  if (isNeumorphicLevel(level)) return "neumorphic";
  if (isGlowLevel(level)) return "glow";
  return null;
}

/**
 * A preset as a `box-shadow` value, for one mode: what applying it would
 * draw, so a preview of it is the real shadow rather than a picture of one.
 */
export function elevationPresetCss(
  presetId: ElevationPresetId,
  scale: ElevationScale,
  tracks: ColorTrack[],
  mode: ColourMode,
): string {
  const preview: ElevationScale = {
    colour: scale.colour,
    levels: [
      {
        id: "preview",
        name: "Preview",
        description: "",
        layers: elevationPresetLayers(presetId, scale, tracks),
      },
    ],
  };
  return resolveElevation(preview, tracks, mode)[0]!.css;
}
