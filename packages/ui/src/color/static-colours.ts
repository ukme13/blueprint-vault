import { hexToRgb, rgbToOklch } from "./conversion";
import type { ShadeItem } from "./types";

/**
 * Static base colours: pure white and pure black.
 *
 * A palette is made of tracks, and every track is a ramp that can be edited,
 * renamed and deleted. White and black are none of that: they are the same in
 * every project and in both modes, which is what lets a label on a filled
 * control, or a layer in the accessibility sandbox, be exactly `#ffffff` or
 * `#000000` and still be a reference to a primitive rather than a hex typed
 * into a role.
 *
 * They are one reserved track that is not in the palette. A reference to them
 * is the same `{ trackId, weight }` every other reference is, so a token file
 * saved before they existed reads back as it was, and a project written by
 * this build opens in an older one with the two references reported as a
 * missing track rather than failing to load.
 *
 * The weights are 0 and 1000: the two ends of the 25-interval scale, one
 * beyond the lightest shade (25) and one beyond the darkest (950) a track can
 * hold, so neither can ever be the weight of a shade.
 */
export const STATIC_TRACK_ID = "static";

/** The track's name, as the semantic layer and the Design Tokens file spell it. */
export const STATIC_TRACK_NAME = "static";

export interface StaticColour {
  /** 0 for white and 1000 for black: past the ends of every ramp. */
  weight: number;
  /** What it is called, and the end of its custom property. */
  name: "white" | "black";
  /** What a picker calls it. */
  label: "White" | "Black";
  hex: string;
  /** The custom property that declares it: `--color-white`. */
  variable: `--color-${"white" | "black"}`;
}

export const STATIC_COLOURS: readonly StaticColour[] = [
  {
    weight: 0,
    name: "white",
    label: "White",
    hex: "#ffffff",
    variable: "--color-white",
  },
  {
    weight: 1000,
    name: "black",
    label: "Black",
    hex: "#000000",
    variable: "--color-black",
  },
];

/** The two as references, for a role to point at. */
export const STATIC_WHITE = { trackId: STATIC_TRACK_ID, weight: 0 } as const;
export const STATIC_BLACK = { trackId: STATIC_TRACK_ID, weight: 1000 } as const;

export function isStaticTrackId(trackId: string): boolean {
  return trackId === STATIC_TRACK_ID;
}

/** The static colour at a weight, if it is one. */
export function staticColourAt(weight: number): StaticColour | undefined {
  return STATIC_COLOURS.find((colour) => colour.weight === weight);
}

/**
 * A static colour as a shade, for the code that reads a palette's shades.
 *
 * Its coordinates are worked out from its hex like any other colour's, so a
 * reader that wants a lightness or a hue gets the real ones. It is never an
 * anchor and never overridden: there is nothing to edit.
 */
export function staticShade(colour: StaticColour): ShadeItem {
  const [L, C, H] = rgbToOklch(...hexToRgb(colour.hex));
  return {
    weight: colour.weight,
    L,
    C,
    H,
    hex: colour.hex,
    isAnchor: false,
    isOverridden: false,
    anchorType: null,
  };
}

/**
 * The static colour a weight comes to: the one at it, or the nearer end.
 *
 * A reference with a weight that is neither end is not one anybody chose, so
 * it lands on the nearer of the two, as a weight a track no longer has lands
 * on the nearest shade.
 */
export function nearestStaticColour(weight: number): StaticColour {
  return STATIC_COLOURS.reduce((closest, colour) =>
    Math.abs(colour.weight - weight) < Math.abs(closest.weight - weight)
      ? colour
      : closest,
  );
}

/**
 * What to say of a primitive reference: `primary/500`, or `white`.
 *
 * A static colour has no weight worth saying — `static/1000` is not a thing
 * anybody calls black — so it is named.
 */
export function primitiveReferenceLabel(
  trackName: string,
  trackId: string,
  weight: number,
): string {
  if (isStaticTrackId(trackId)) {
    return nearestStaticColour(weight).name;
  }
  return `${trackName}/${weight}`;
}
