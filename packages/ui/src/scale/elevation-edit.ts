import type { ColourMode, SemanticReference } from "../color/semantic";
import type { ColorTrack } from "../color/types";
import {
  isInnerShadow,
  isSystemElevationLevel,
  elevationColourHex,
  findElevationTrack,
  SYSTEM_ELEVATION_LEVEL_IDS,
  type ElevationLevel,
  type ElevationScale,
  type ShadowLayer,
  type ShadowLayerType,
} from "./elevation";
import { uniqueTokenName } from "./token-names";

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

/*
 * Layer edits, for the Advanced builder: a stack of any length, each layer a
 * drop or an inner shadow, in the scale's colour or its own, shown or hidden.
 *
 * Levels are found by id, as every other edit here finds them, rather than by
 * position: a level's id survives levels being added and removed around it.
 * Each returns the scale it was given when there is nothing to change — an
 * unknown level, a layer index past the end — so a caller needs no guard.
 */

/** The layer Add layer appends: a plain drop shadow, visible, mid-strength. */
export const DEFAULT_SHADOW_LAYER: Readonly<ShadowLayer> = {
  offsetXPx: 0,
  offsetYPx: 4,
  blurPx: 8,
  spreadPx: 0,
  opacity: { light: 0.1, dark: 0.4 },
};

/** Replace one level's layers; an unknown level, or an edit returning null, is a no-op. */
export function withLevelLayers(
  scale: ElevationScale,
  levelId: string,
  edit: (layers: ShadowLayer[]) => ShadowLayer[] | null,
): ElevationScale {
  const level = scale.levels.find((each) => each.id === levelId);
  if (!level) return scale;
  const layers = edit(level.layers);
  if (!layers) return scale;
  return {
    ...scale,
    levels: scale.levels.map((each) =>
      each.id === levelId ? { ...each, layers } : each,
    ),
  };
}

function editLayer(
  scale: ElevationScale,
  levelId: string,
  layerIndex: number,
  edit: (layer: ShadowLayer) => ShadowLayer,
): ElevationScale {
  return withLevelLayers(scale, levelId, (layers) =>
    layerIndex >= 0 && layerIndex < layers.length
      ? layers.map((layer, index) =>
          index === layerIndex ? edit(layer) : layer,
        )
      : null,
  );
}

/** Append a layer, on top of the stack. */
export function addShadowLayer(
  scale: ElevationScale,
  levelId: string,
  layer: ShadowLayer = DEFAULT_SHADOW_LAYER,
): ElevationScale {
  return withLevelLayers(scale, levelId, (layers) => [
    ...layers,
    { ...layer, opacity: { ...layer.opacity } },
  ]);
}

/**
 * Delete a layer. The last one may go too: a level with no layers is
 * `box-shadow: none`, which is a real thing to want.
 */
export function removeShadowLayer(
  scale: ElevationScale,
  levelId: string,
  layerIndex: number,
): ElevationScale {
  return withLevelLayers(scale, levelId, (layers) =>
    layerIndex >= 0 && layerIndex < layers.length
      ? layers.filter((_, index) => index !== layerIndex)
      : null,
  );
}

/** Hide a shown layer or show a hidden one, keeping every value it holds. */
export function toggleShadowLayerVisibility(
  scale: ElevationScale,
  levelId: string,
  layerIndex: number,
): ElevationScale {
  return editLayer(scale, levelId, layerIndex, (layer) =>
    tidyLayer({ ...layer, hidden: !layer.hidden }),
  );
}

/**
 * A change to one layer. `colour: null` goes back to the scale's colour;
 * `opacity` may name one mode and leave the other alone.
 */
export interface ShadowLayerPatch {
  type?: ShadowLayerType;
  offsetXPx?: number;
  offsetYPx?: number;
  blurPx?: number;
  spreadPx?: number;
  opacity?: Partial<Record<ColourMode, number>>;
  colour?: SemanticReference | null;
  hidden?: boolean;
}

/**
 * Change one layer.
 *
 * Offsets and spread keep any finite number, negative included — a highlight
 * sits up and to the left, and a negative spread tucks a shadow in. Blur
 * cannot be negative in CSS, so it stops at 0. Opacity is held to 0–1; not to
 * the pads' ceiling, because a neumorphic highlight or a glow is meant to be
 * stronger than a shadow. A value that is not a finite number is ignored
 * rather than written.
 */
export function updateShadowLayer(
  scale: ElevationScale,
  levelId: string,
  layerIndex: number,
  patch: ShadowLayerPatch,
): ElevationScale {
  return editLayer(scale, levelId, layerIndex, (layer) => {
    const finite = (value: number | undefined, fallback: number) =>
      typeof value === "number" && Number.isFinite(value) ? value : fallback;
    const opacity = (mode: ColourMode) => {
      const value = patch.opacity?.[mode];
      return typeof value === "number" && Number.isFinite(value)
        ? Math.min(Math.max(value, 0), 1)
        : layer.opacity[mode];
    };
    const next: ShadowLayer = {
      ...layer,
      type: patch.type ?? layer.type,
      offsetXPx: finite(patch.offsetXPx, layer.offsetXPx),
      offsetYPx: finite(patch.offsetYPx, layer.offsetYPx),
      blurPx: Math.max(finite(patch.blurPx, layer.blurPx), 0),
      spreadPx: finite(patch.spreadPx, layer.spreadPx),
      opacity: { light: opacity("light"), dark: opacity("dark") },
      hidden: patch.hidden ?? layer.hidden,
    };
    if (patch.colour === null) delete next.colour;
    else if (patch.colour) {
      next.colour = {
        trackId: patch.colour.trackId,
        weight: patch.colour.weight,
      };
    }
    return tidyLayer(next);
  });
}

/**
 * Drop the optional fields that say nothing — `type: "drop"`, `hidden:
 * false` — so an edited layer has the shape a saved one does, and a layer
 * turned back into a plain drop shadow compares equal to one that always was.
 */
function tidyLayer(layer: ShadowLayer): ShadowLayer {
  const tidy: ShadowLayer = { ...layer };
  if (tidy.type !== "inner") delete tidy.type;
  if (!tidy.hidden) delete tidy.hidden;
  if (!tidy.colour) delete tidy.colour;
  return tidy;
}

/**
 * The colour a level is drawn in when it is not the scale's: the one shade
 * every shown layer of it picks, as Glow's do. Null when any shown layer
 * uses the scale's colour, or when they pick different shades — then there
 * is no one colour of its own to show.
 *
 * Simple's colour control reads this. A level with a colour of its own gets
 * a control for that colour, which recolours this level only; any other
 * level gets the scale's shared colour, which recolours every level.
 */
export function elevationLevelColour(
  level: ElevationLevel,
): SemanticReference | null {
  const shown = level.layers.filter((layer) => !layer.hidden);
  const first = shown[0]?.colour;
  if (!first) return null;
  return shown.every(
    (layer) =>
      layer.colour?.trackId === first.trackId &&
      layer.colour.weight === first.weight,
  )
    ? { trackId: first.trackId, weight: first.weight }
    : null;
}

/**
 * Draw every layer of one level in one shade, or pass null to put them all
 * back on the scale's colour. Other levels are untouched.
 */
export function setElevationLevelColour(
  scale: ElevationScale,
  levelId: string,
  colour: SemanticReference | null,
): ElevationScale {
  return withLevelLayers(scale, levelId, (layers) =>
    layers.map((layer) =>
      tidyLayer({
        ...layer,
        colour: colour
          ? { trackId: colour.trackId, weight: colour.weight }
          : undefined,
      }),
    ),
  );
}

/** "Drop shadow" or "Inner shadow", as the layer list names a layer's type. */
export function shadowLayerTypeLabel(layer: Pick<ShadowLayer, "type">): string {
  return isInnerShadow(layer) ? "Inner shadow" : "Drop shadow";
}

/** A layer's geometry in one line: `X 0 · Y 4 · B 8 · S 0`. */
export function shadowLayerSummary(layer: ShadowLayer): string {
  return `X ${layer.offsetXPx} · Y ${layer.offsetYPx} · B ${layer.blurPx} · S ${layer.spreadPx}`;
}

/**
 * The shadow a layer's icon casts: a small, hard copy of the layer's own
 * shadow, in the icon's text colour.
 *
 * The icon is a square outline that casts this, so the outline reads heavier
 * on the side the layer's shadow falls — the way Figma marks an effect. It
 * is a real shadow rather than a drawn edge, so it goes where CSS puts one:
 * a drop shadow pushed down falls below the square; an inner one pushed down
 * shows along the top inside edge, since that is where `inset` draws it.
 *
 * Only the direction is kept, not the size: every offset becomes `weightPx`
 * in its direction, and the blur is 0, so the icon stays crisp at any value.
 * With no offset, the shadow spreads evenly at half strength, as a glow
 * shows on every side.
 */
export function shadowLayerIconShadow(
  layer: Pick<ShadowLayer, "type" | "offsetXPx" | "offsetYPx">,
  weightPx = 2,
): string {
  const inset = isInnerShadow(layer) ? "inset " : "";
  const x = Math.sign(layer.offsetXPx) * weightPx;
  const y = Math.sign(layer.offsetYPx) * weightPx;
  if (x === 0 && y === 0) {
    return `${inset}0 0 0 ${weightPx / 2}px color-mix(in srgb, currentColor 50%, transparent)`;
  }
  /* `+ 0` turns a -0 into 0, so a straight shadow reads `0px`, not `-0px`. */
  return `${inset}${x + 0}px ${y + 0}px 0 0 currentColor`;
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
  const track = findElevationTrack(tracks, scale.colour.trackId);
  return {
    trackId: scale.colour.trackId,
    trackName: track?.name ?? scale.colour.trackId,
    weight: scale.colour.weight,
    hex: elevationColourHex(scale, tracks),
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
  /* Dark starts one step up from the darkest shade, not on it. The default
     shadow is drawn in the darkest neutral, and a colour laid over itself is
     the same colour at any opacity, so a ground of that shade made every dark
     shadow invisible here — while on a real page, whose seeded dark canvas
     sits a few steps up the track, the same shadow shows. The card is one step
     lighter again, the way a raised surface lifts off the canvas. */
  const darkGround = shades.at(-2)?.hex ?? shades.at(-1)?.hex;
  const darkCard = shades.at(-3)?.hex ?? darkGround;
  return {
    light: {
      ground: nextLight ?? "var(--color-neutral-50)",
      card: lightest ?? "var(--color-neutral-50)",
    },
    dark: {
      ground: darkGround ?? "var(--color-neutral-900)",
      card: darkCard ?? "var(--color-neutral-800)",
    },
  };
}

/**
 * A name and id no other level has, nor any system level, so no two levels
 * export one variable and "low" cannot sit beside Low.
 */
function uniqueElevationName(
  wanted: string,
  levels: readonly ElevationLevel[],
  exceptId?: string,
): { id: string; name: string } {
  const others = levels.filter((level) => level.id !== exceptId);
  return uniqueTokenName(
    wanted,
    {
      ids: [...others.map((level) => level.id), ...SYSTEM_ELEVATION_LEVEL_IDS],
      names: others.map((level) => level.name),
    },
    "level",
  );
}

/**
 * A new level after the others, exported as `--shadow-{id}`.
 *
 * Seeded between Medium and High, a contact and a cast layer like the rest,
 * so it draws something sensible before it is tuned and the pads apply.
 */
export function addElevationLevel(
  scale: ElevationScale,
  name = "New level",
): ElevationScale {
  const { id, name: unique } = uniqueElevationName(name, scale.levels);
  const level: ElevationLevel = {
    id,
    name: unique,
    description: "",
    layers: [
      {
        offsetXPx: 0,
        offsetYPx: 2,
        blurPx: 4,
        spreadPx: 0,
        opacity: { light: 0.1, dark: 0.4 },
      },
      {
        offsetXPx: 0,
        offsetYPx: 6,
        blurPx: 18,
        spreadPx: 0,
        opacity: { light: 0.1, dark: 0.45 },
      },
    ],
  };
  return { ...scale, levels: [...scale.levels, level] };
}

/** Delete a level the author added. A system level stays. */
export function removeElevationLevel(
  scale: ElevationScale,
  levelId: string,
): ElevationScale {
  if (isSystemElevationLevel(levelId)) return scale;
  const levels = scale.levels.filter((level) => level.id !== levelId);
  return levels.length === scale.levels.length ? scale : { ...scale, levels };
}

/**
 * Rename a level and its variable together, and set its description.
 *
 * A system level keeps its name and id, and takes only the description. A
 * custom level's name that another level already has takes a number
 * instead, so no two levels export one variable. Pass no description to
 * leave it as it is.
 */
export function renameElevationLevel(
  scale: ElevationScale,
  levelId: string,
  name: string,
  description?: string,
): ElevationScale {
  const target = scale.levels.find((level) => level.id === levelId);
  if (!target) return scale;
  const nextDescription = description ?? target.description;
  const trimmed = name.trim();
  const renamed =
    isSystemElevationLevel(levelId) || !trimmed || trimmed === target.name
      ? { id: target.id, name: target.name }
      : uniqueElevationName(trimmed, scale.levels, levelId);
  if (
    renamed.id === target.id &&
    renamed.name === target.name &&
    nextDescription === target.description
  ) {
    return scale;
  }
  return {
    ...scale,
    levels: scale.levels.map((level) =>
      level.id === levelId
        ? { ...level, ...renamed, description: nextDescription }
        : level,
    ),
  };
}
