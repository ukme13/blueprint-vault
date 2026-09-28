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

/**
 * A drop shadow falls outside the box; an inner one is `inset`, inside it.
 *
 * Optional on the layer, and absent means drop: every scale saved before
 * layers had a type is a stack of drop shadows, and reads as one unchanged.
 */
export type ShadowLayerType = "drop" | "inner";

export interface ShadowLayer {
  /** Absent is "drop". Only an inner layer stores it. */
  type?: ShadowLayerType;
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
  /**
   * A shade of its own, for a layer that is not a shadow in the scale's
   * colour: a neumorphic highlight, a coloured glow.
   *
   * A palette reference, never a raw colour, so it follows the palette as
   * `colour` on the scale does. Absent means the scale's colour, which is what
   * almost every layer wants.
   */
  colour?: SemanticReference;
  /**
   * Switched off without being deleted, so its values survive while an author
   * compares the stack with and without it. A hidden layer is left out of
   * every output: the CSS, the variables and the Design Tokens file.
   */
  hidden?: boolean;
}

export function isInnerShadow(layer: Pick<ShadowLayer, "type">): boolean {
  return layer.type === "inner";
}

export interface ElevationLevel {
  /** The exported name: `low` becomes `--shadow-low`. */
  id: string;
  name: string;
  description: string;
  layers: ShadowLayer[];
  /**
   * The preset last applied, if any. Standard and Subtle card are both two
   * plain drop shadows, so once tuned in Simple their shape no longer says
   * which one a level is; this does, for as long as the shape still fits.
   * Absent on a level no preset has touched.
   */
  preset?: string;
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
/*
 * Dark opacities are four to six times the light ones. The first seeds used
 * twice, and on a dark canvas that read as no shadow at all: the canvas is
 * already close to the shadow's own shade, so a thin layer of it barely moves
 * the pixels underneath. High keeps a stronger cast than contact in dark, so
 * a dialog still reads as further off the page than a menu. That cast is
 * 0.55 rather than higher, so a seed leaves room to make it stronger.
 */
export const DEFAULT_ELEVATION_LEVELS: readonly ElevationLevel[] = [
  {
    id: "low",
    name: "Low",
    description: "A card resting on the page.",
    layers: [layer(1, 1, 0.1, 0.4), layer(2, 8, 0.1, 0.4)],
  },
  {
    id: "med",
    name: "Medium",
    description: "A menu or a popover above the page.",
    layers: [layer(1, 2, 0.1, 0.4), layer(2, 12, 0.1, 0.4)],
  },
  {
    id: "high",
    name: "High",
    description: "A dialog over everything else.",
    layers: [layer(2, 2, 0.1, 0.4), layer(8, 24, 0.1, 0.55)],
  },
];

/**
 * The levels the system ships and builds against. They can be retuned and
 * described, never renamed or removed: their variables are what components
 * and exports promise. Levels an author adds beside them are theirs.
 */
export const SYSTEM_ELEVATION_LEVEL_IDS: readonly string[] =
  DEFAULT_ELEVATION_LEVELS.map((level) => level.id);

export function isSystemElevationLevel(id: string): boolean {
  return SYSTEM_ELEVATION_LEVEL_IDS.includes(id);
}

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
  const track = findElevationTrack(tracks, colour.trackId) ?? tracks[0];
  if (!track) return "#000000";
  const exact = track.shades.find((shade) => shade.weight === colour.weight);
  return (exact ?? extremeShade(track, "darkest"))?.hex ?? "#000000";
}

/**
 * The track a reference names: by id, or by name for a reference saved
 * before tracks had ids. Undefined when neither matches.
 */
export function findElevationTrack(
  tracks: readonly ColorTrack[],
  idOrName: string,
): ColorTrack | undefined {
  return (
    tracks.find((track) => track.id === idOrName) ??
    tracks.find((track) => track.name === idOrName)
  );
}

/** A track's lightest or darkest shade, by weight. */
export function extremeShade(
  track: ColorTrack,
  end: "lightest" | "darkest",
): ColorTrack["shades"][number] | undefined {
  return track.shades.reduce<ColorTrack["shades"][number] | undefined>(
    (best, shade) =>
      !best ||
      (end === "darkest"
        ? shade.weight > best.weight
        : shade.weight < best.weight)
        ? shade
        : best,
    undefined,
  );
}

/**
 * One layer with its colour worked out.
 *
 * The channels and the alpha are kept apart rather than pre-joined into
 * `rgba(...)`, because CSS wants that string and the Design Tokens format wants
 * the parts. Formatting twice from one resolution beats resolving twice.
 */
export interface ResolvedShadowLayer {
  /** An inner shadow: `inset` in CSS, `inset: true` in Design Tokens. */
  inset: boolean;
  offsetXPx: number;
  offsetYPx: number;
  blurPx: number;
  spreadPx: number;
  rgb: [number, number, number];
  alpha: number;
}

export interface ResolvedElevation {
  id: string;
  name: string;
  description: string;
  variable: string;
  layers: ResolvedShadowLayer[];
  /** A complete `box-shadow` value. */
  css: string;
}

function rgbOf(hex: string): [number, number, number] {
  const [red, green, blue] = hexToRgb(hex).map((channel) =>
    Math.round(channel * 255),
  );
  return [red!, green!, blue!];
}

/**
 * The hex the scale's shadows are drawn in, with the same fallback the
 * shadows themselves use.
 *
 * Read from the scale rather than off a resolved layer: a layer can carry a
 * colour of its own or be hidden, and a level can have none, so the first
 * layer of the first level is not the scale's colour.
 */
export function elevationColourHex(
  scale: ElevationScale,
  tracks: ColorTrack[],
): string {
  return shadowHex(tracks, scale.colour);
}

/** One layer as a `box-shadow` entry. */
export function shadowLayerCss(layer: ResolvedShadowLayer): string {
  const [red, green, blue] = layer.rgb;
  return `${layer.inset ? "inset " : ""}${layer.offsetXPx}px ${layer.offsetYPx}px ${layer.blurPx}px ${layer.spreadPx}px rgba(${red}, ${green}, ${blue}, ${layer.alpha})`;
}

/** Every level as a box-shadow value, for one mode. */
export function resolveElevation(
  scale: ElevationScale,
  tracks: ColorTrack[],
  mode: ColourMode,
): ResolvedElevation[] {
  const scaleRgb = rgbOf(shadowHex(tracks, scale.colour));
  return scale.levels.map((level) =>
    resolveLevel(level, scaleRgb, tracks, mode),
  );
}

/**
 * One level as a box-shadow value, for one mode — without resolving the
 * rest of the scale. For a preview of one level or of layers not yet in the
 * scale, such as a preset's.
 */
export function resolveElevationLevel(
  level: ElevationLevel,
  scale: ElevationScale,
  tracks: ColorTrack[],
  mode: ColourMode,
): ResolvedElevation {
  return resolveLevel(
    level,
    rgbOf(shadowHex(tracks, scale.colour)),
    tracks,
    mode,
  );
}

function resolveLevel(
  level: ElevationLevel,
  scaleRgb: [number, number, number],
  tracks: ColorTrack[],
  mode: ColourMode,
): ResolvedElevation {
  const layers: ResolvedShadowLayer[] = level.layers
    .filter((each) => !each.hidden)
    .map((each) => ({
      inset: isInnerShadow(each),
      offsetXPx: each.offsetXPx,
      offsetYPx: each.offsetYPx,
      blurPx: each.blurPx,
      spreadPx: each.spreadPx,
      rgb: each.colour ? rgbOf(shadowHex(tracks, each.colour)) : scaleRgb,
      alpha: Number(each.opacity[mode].toFixed(3)),
    }));

  return {
    id: level.id,
    name: level.name,
    description: level.description,
    variable: elevationVariableName(level.id),
    layers,
    /* A level whose every layer is hidden draws nothing, the same as one
       with no layers. */
    css: layers.map(shadowLayerCss).join(", ") || "none",
  };
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
  const colour = readReference(raw.colour);

  /* The optional fields are written only when they say something, so a layer
     saved before they existed reads back as exactly what it was: no
     `type: "drop"`, no `hidden: false`. */
  return {
    ...(raw.type === "inner" ? { type: "inner" as const } : {}),
    offsetXPx: number(raw.offsetXPx),
    offsetYPx: number(raw.offsetYPx),
    blurPx: Math.max(number(raw.blurPx), 0),
    spreadPx: number(raw.spreadPx),
    opacity: {
      light: clampOpacity(opacity.light),
      dark: clampOpacity(opacity.dark),
    },
    ...(colour ? { colour } : {}),
    ...(raw.hidden === true ? { hidden: true } : {}),
  };
}

/** A palette reference, or null for anything that is not one. */
function readReference(value: unknown): SemanticReference | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.trackId !== "string" || !raw.trackId) return null;
  if (typeof raw.weight !== "number" || !Number.isFinite(raw.weight)) {
    return null;
  }
  return { trackId: raw.trackId, weight: raw.weight };
}

function readLevel(value: unknown): ElevationLevel | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.id !== "string" || !raw.id) return null;

  return {
    id: raw.id,
    name: typeof raw.name === "string" && raw.name ? raw.name : raw.id,
    description: typeof raw.description === "string" ? raw.description : "",
    ...(typeof raw.preset === "string" && raw.preset
      ? { preset: raw.preset }
      : {}),
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
