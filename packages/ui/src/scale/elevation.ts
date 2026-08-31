import { hexToRgb } from "../color/conversion";
import type { SemanticReference } from "../color/semantic";
import type { ColorTrack } from "../color/types";
import type { ColourMode } from "../color/semantic";

/**
 * Elevation: named levels, each a stack of shadow layers.
 *
 * Neither a ramp nor a set of names over one. A level is a composite — two
 * layers is the usual shape, a tight one for the contact edge and a wide one
 * for the cast — so there is nothing to multiply.
 *
 * ## The colour does not flip
 *
 * The plan said the shadow colour would be a reference that follows light and
 * dark "the way everything else does". Building it showed that is wrong, and
 * Astryx's own tokens say so plainly: `light-dark(rgba(0,0,0,0.1),
 * rgba(0,0,0,0.2))` is the *same* black in both modes. A shadow is the absence
 * of light, not a surface — flipping it to a pale colour in dark mode would
 * draw a halo, which is a different effect with a different name.
 *
 * What does change is strength. A dark surface swallows a shadow, so the same
 * black needs more of it, which is why opacity is held per mode and the colour
 * is one reference.
 *
 * See docs/roadmap/scale-studio.md.
 */

export interface ShadowLayer {
  offsetXPx: number;
  offsetYPx: number;
  blurPx: number;
  spreadPx: number;
  /**
   * How opaque the shadow is, per mode.
   *
   * Per mode because a dark surface swallows a shadow: the same black at the
   * same alpha reads as nothing once the background is already dark.
   */
  opacity: { light: number; dark: number };
}

export interface ElevationLevel {
  /** The exported name: `low` becomes `--shadow-low`. */
  id: string;
  name: string;
  description: string;
  layers: ShadowLayer[];
}

export interface ElevationScale {
  /**
   * The shade every shadow is drawn from.
   *
   * One reference rather than one per mode, for the reason above. It is a
   * primitive rather than a semantic token because there is no page element
   * called "shadow" — the semantic names describe where a colour goes, and a
   * shadow is cast rather than placed.
   */
  colour: SemanticReference;
  levels: ElevationLevel[];
}

function layer(
  offsetYPx: number,
  blurPx: number,
  light: number,
  dark: number,
): ShadowLayer {
  return {
    offsetXPx: 0,
    offsetYPx,
    blurPx,
    spreadPx: 0,
    opacity: { light, dark },
  };
}

/**
 * The levels a new scale starts with.
 *
 * Three, matching the set the studio already builds against. Each is a contact
 * layer and a cast layer, because a single shadow reads as a sticker: the tight
 * one says the edge is off the surface, the wide one says how far.
 */
export const DEFAULT_ELEVATION_LEVELS: readonly ElevationLevel[] = [
  {
    id: "low",
    name: "Low",
    description: "A card resting on the page.",
    layers: [layer(1, 1, 0.1, 0.2), layer(2, 8, 0.1, 0.2)],
  },
  {
    id: "med",
    name: "Medium",
    description: "A menu or a popover above the page.",
    layers: [layer(1, 2, 0.1, 0.2), layer(2, 12, 0.1, 0.2)],
  },
  {
    id: "high",
    name: "High",
    description: "A dialog over everything else.",
    layers: [layer(2, 2, 0.1, 0.2), layer(8, 24, 0.1, 0.3)],
  },
];

/** The track a shadow is drawn from when a workspace has not chosen one. */
export const DEFAULT_SHADOW_TRACK_NAME = "neutral";

export function defaultElevationScale(
  colour: SemanticReference = {
    trackId: DEFAULT_SHADOW_TRACK_NAME,
    weight: 950,
  },
): ElevationScale {
  return {
    colour,
    levels: DEFAULT_ELEVATION_LEVELS.map((level) => ({
      ...level,
      layers: level.layers.map((each) => ({
        ...each,
        opacity: { ...each.opacity },
      })),
    })),
  };
}

export function elevationVariableName(id: string): string {
  return `--shadow-${id}`;
}

/**
 * The shade a reference points at.
 *
 * Falls back to the darkest shade available rather than failing: a shadow with
 * no colour is no shadow at all, and a track can be renamed or deleted after
 * the scale was set. Black is the wrong fallback — a palette's darkest neutral
 * is usually tinted, and a sudden pure black is more obviously off than a shade
 * one step away.
 */
function shadowHex(tracks: ColorTrack[], colour: SemanticReference): string {
  if (tracks.length === 0) return "#000000";

  const track =
    tracks.find((candidate) => candidate.id === colour.trackId) ??
    tracks.find((candidate) => candidate.name === colour.trackId) ??
    tracks[0]!;

  const exact = track.shades.find((shade) => shade.weight === colour.weight);
  if (exact) return exact.hex;

  return track.shades.reduce((darkest, shade) =>
    shade.weight > darkest.weight ? shade : darkest,
  ).hex;
}

export interface ResolvedElevation {
  id: string;
  name: string;
  description: string;
  variable: string;
  /** A complete `box-shadow` value. */
  css: string;
}

/** Every level as a box-shadow value, for one mode. */
export function resolveElevation(
  scale: ElevationScale,
  tracks: ColorTrack[],
  mode: ColourMode,
): ResolvedElevation[] {
  const hex = shadowHex(tracks, scale.colour);
  const [red, green, blue] = hexToRgb(hex).map((channel) =>
    Math.round(channel * 255),
  );

  return scale.levels.map((level) => ({
    id: level.id,
    name: level.name,
    description: level.description,
    variable: elevationVariableName(level.id),
    css:
      level.layers
        .map((each) => {
          const alpha = Number(each.opacity[mode].toFixed(3));
          return `${each.offsetXPx}px ${each.offsetYPx}px ${each.blurPx}px ${each.spreadPx}px rgba(${red}, ${green}, ${blue}, ${alpha})`;
        })
        .join(", ") || "none",
  }));
}

/** The scale as custom properties, for one mode. */
export function elevationCssVariables(
  scale: ElevationScale,
  tracks: ColorTrack[],
  mode: ColourMode,
): Record<string, string> {
  return Object.fromEntries(
    resolveElevation(scale, tracks, mode).map((level) => [
      level.variable,
      level.css,
    ]),
  );
}

function clampOpacity(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0.1;
  return Math.min(Math.max(value, 0), 1);
}

function readLayer(value: unknown): ShadowLayer | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const number = (at: unknown) =>
    typeof at === "number" && Number.isFinite(at) ? at : 0;
  const opacity = (raw.opacity ?? {}) as Record<string, unknown>;

  return {
    offsetXPx: number(raw.offsetXPx),
    offsetYPx: number(raw.offsetYPx),
    blurPx: Math.max(number(raw.blurPx), 0),
    spreadPx: number(raw.spreadPx),
    opacity: {
      light: clampOpacity(opacity.light),
      dark: clampOpacity(opacity.dark),
    },
  };
}

function readLevel(value: unknown): ElevationLevel | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.id !== "string" || !raw.id) return null;

  return {
    id: raw.id,
    name: typeof raw.name === "string" && raw.name ? raw.name : raw.id,
    description: typeof raw.description === "string" ? raw.description : "",
    /* A level with no layers is `box-shadow: none`, which is a legitimate
       thing to want at the bottom of a scale. */
    layers: (Array.isArray(raw.layers) ? raw.layers : [])
      .map(readLayer)
      .filter((each): each is ShadowLayer => each !== null),
  };
}

/** Make a scale usable, whatever it arrived as. */
export function normalizeElevationScale(scale: ElevationScale): ElevationScale {
  const seen = new Set<string>();
  const levels = (Array.isArray(scale.levels) ? scale.levels : [])
    .map(readLevel)
    .filter((level): level is ElevationLevel => level !== null)
    .filter((level) => {
      if (seen.has(level.id)) return false;
      seen.add(level.id);
      return true;
    });

  const colour =
    scale.colour && typeof scale.colour.trackId === "string"
      ? {
          trackId: scale.colour.trackId,
          weight:
            typeof scale.colour.weight === "number" &&
            Number.isFinite(scale.colour.weight)
              ? scale.colour.weight
              : 950,
        }
      : defaultElevationScale().colour;

  return {
    colour,
    levels: levels.length > 0 ? levels : defaultElevationScale().levels,
  };
}
