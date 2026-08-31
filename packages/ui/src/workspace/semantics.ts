import type { PaletteProjectData } from "../color/export";
import { generatePalettes } from "../color/palette";
import {
  migrateSemanticIds,
  seedSemanticTokens,
  type SemanticToken,
} from "../color/semantic";

/**
 * The semantic slice: reading it back, and seeding it when it is not there.
 *
 * Semantics are their own slice rather than part of the palette. They point
 * into it, but a user may keep a palette while replacing the whole layer, and
 * the workspace merge established that a studio writes only its own slice.
 *
 * See docs/roadmap/semantic-tokens.md.
 */

function readReference(
  value: unknown,
): { trackId: string; weight: number } | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.trackId !== "string" || !raw.trackId) return null;
  if (typeof raw.weight !== "number" || !Number.isFinite(raw.weight)) {
    return null;
  }
  return { trackId: raw.trackId, weight: raw.weight };
}

function readToken(value: unknown): SemanticToken | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.id !== "string" || !raw.id) return null;

  const light = readReference(raw.light);
  const dark = readReference(raw.dark);
  /* Both modes or neither. A token with one reference cannot be resolved in
     the other mode, and guessing the missing half would put a colour nobody
     chose into an export. */
  if (!light || !dark) return null;

  return {
    id: raw.id,
    name: typeof raw.name === "string" && raw.name ? raw.name : raw.id,
    description: typeof raw.description === "string" ? raw.description : "",
    light,
    dark,
  };
}

/**
 * Read a stored semantic layer.
 *
 * Null when there is nothing readable, which is the signal to seed. A damaged
 * token is dropped rather than taking the layer with it, the same way a
 * corrupt palette must not cost somebody their type scale — and an empty array
 * that was genuinely stored is kept, because reseeding it would undo a
 * deliberate act.
 */
export function readSemanticTokens(value: unknown): SemanticToken[] | null {
  if (!Array.isArray(value)) return null;
  return migrateSemanticIds(
    value
      .map(readToken)
      .filter((token): token is SemanticToken => token !== null),
  );
}

/**
 * A freshly seeded layer for a palette.
 *
 * The palette slice stores track inputs and a lightness ramp, not shades, so
 * the tracks are generated here to seed against — the same generation the
 * studio renders from, so a seeded weight is one the palette really has.
 */
export function semanticsForPalette(
  palette: PaletteProjectData | null,
): SemanticToken[] | null {
  if (!palette) return null;
  return seedSemanticTokens(
    generatePalettes({
      tracks: palette.tracks,
      lightnessValues: palette.lightnessValues,
    }),
  );
}
