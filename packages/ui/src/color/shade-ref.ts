import { findShade } from "./palette";
import type { ColorTrack } from "./types";

/**
 * Which shade a preview colour points at.
 *
 * A reference rather than a hex: the palette is still being edited, so
 * "primary 500" has to keep meaning primary 500 after someone changes what
 * that is.
 */
export interface ShadeRef {
  trackId: string;
  weight: number;
}

/** The hex a reference resolves to now, or null if the palette dropped it. */
export function resolveShadeHex(
  tracks: ColorTrack[],
  ref: ShadeRef | null,
): string | null {
  if (!ref) return null;
  return findShade(tracks, ref.trackId, ref.weight)?.hex ?? null;
}
