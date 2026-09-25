import type { ColourMode, SemanticReference } from "../color/semantic";
import type { ColorTrack } from "../color/types";
import {
  isSystemElevationLevel,
  resolveElevation,
  SYSTEM_ELEVATION_LEVEL_IDS,
  type ElevationLevel,
  type ElevationScale,
} from "./elevation";

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

/** Hard ceiling in the editor. A shadow at 1 is a black slab. */
export const ELEVATION_OPACITY_MAX = 0.6;
export const ELEVATION_OPACITY_STEP = 0.05;

/** Snap onto the editor's step, inside the editor's ceiling. */
export function snapElevationOpacity(value: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  const clamped = Math.min(Math.max(value, 0), ELEVATION_OPACITY_MAX);
  return Number(
    (
      Math.round(clamped / ELEVATION_OPACITY_STEP) * ELEVATION_OPACITY_STEP
    ).toFixed(2),
  );
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
 * Contact and cast together, for one mode of one level.
 *
 * The pad writes both axes in one gesture. Two `setLayerOpacity` calls keep
 * the per-layer clamp; this is only the pairing.
 */
export function setLevelModeOpacities(
  scale: ElevationScale,
  levelId: string,
  mode: ColourMode,
  contact: number,
  cast: number,
): ElevationScale {
  const level = scale.levels.find((item) => item.id === levelId);
  if (!level) return scale;
  let next = setLayerOpacity(scale, levelId, 0, mode, contact);
  if (level.layers.length > 1) {
    next = setLayerOpacity(next, levelId, 1, mode, cast);
  }
  return next;
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

function elevationIdFromName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * A name and id no other level has, nor any system level: the one asked
 * for, or it with the lowest free number ("New level 2", `new-level-2`).
 * Names compare without case, so "low" cannot sit beside Low.
 */
function uniqueElevationName(
  wanted: string,
  levels: readonly ElevationLevel[],
  exceptId?: string,
): { id: string; name: string } {
  const others = levels.filter((level) => level.id !== exceptId);
  const ids = new Set([
    ...others.map((level) => level.id),
    ...SYSTEM_ELEVATION_LEVEL_IDS,
  ]);
  const names = new Set(others.map((level) => level.name.toLowerCase()));
  const fits = (name: string) => {
    const id = elevationIdFromName(name) || "level";
    return !ids.has(id) && !names.has(name.toLowerCase());
  };
  if (fits(wanted)) {
    return { id: elevationIdFromName(wanted) || "level", name: wanted };
  }
  let suffix = 2;
  while (!fits(`${wanted} ${suffix}`)) suffix += 1;
  const name = `${wanted} ${suffix}`;
  return { id: elevationIdFromName(name), name };
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
