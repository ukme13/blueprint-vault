/**
 * Every shade of every track as one selector list.
 *
 * Where a colour is a track and a weight, a phone gets one grouped,
 * searchable list ("secondary 500") rather than a selector for each part.
 * The semantic reference chip and the elevation shadow colour both pick from
 * it, so the two cannot drift in wording or value format.
 */

/** The parts of a track a shade list reads. `ColorTrack` fits. */
export interface ShadeTrack {
  id: string;
  name: string;
  shades: readonly { weight: number; hex: string }[];
}

/** One shade as a selector option. `Icon` is whatever the app draws. */
export interface ShadeOption<Icon> {
  label: string;
  value: string;
  icon?: Icon;
}

export interface ShadeReference {
  trackId: string;
  weight: number;
}

/** The option value for one shade: `trackId:weight`. */
export function shadeOptionValue({ trackId, weight }: ShadeReference): string {
  return `${trackId}:${weight}`;
}

/**
 * Reads an option value back, or `null` for one that is not a shade.
 *
 * Splits on the last colon, so a track id that holds a colon of its own
 * still reads whole.
 */
export function parseShadeOptionValue(value: string): ShadeReference | null {
  const split = value.lastIndexOf(":");
  if (split <= 0) return null;
  const weight = Number(value.slice(split + 1));
  if (value.slice(split + 1) === "" || !Number.isFinite(weight)) return null;
  return { trackId: value.slice(0, split), weight };
}

/**
 * One titled section per track, one option per shade.
 *
 * `icon` draws each shade's swatch; it is handed the shade's hex so the app
 * can pass it through a vision simulation first.
 */
export function shadeOptionSections<Icon = never>(
  tracks: readonly ShadeTrack[],
  icon?: (hex: string) => Icon,
): { type: "section"; title: string; options: ShadeOption<Icon>[] }[] {
  return tracks.map((track) => ({
    type: "section",
    title: track.name,
    options: track.shades.map((shade) => ({
      label: `${track.name} ${shade.weight}`,
      value: shadeOptionValue({ trackId: track.id, weight: shade.weight }),
      ...(icon ? { icon: icon(shade.hex) } : {}),
    })),
  }));
}
