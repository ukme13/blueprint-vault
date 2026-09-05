import { formatColour, type ColourFormat } from "./format";
import { paletteTokenName } from "./export";
import {
  resolveSemantic,
  semanticVariableName,
  type ColourMode,
  type ResolvedSemantic,
  type SemanticToken,
} from "./semantic";
import type { ColorTrack } from "./types";

/**
 * A layer and a palette, as rows something can render.
 *
 * The studio's Semantics tab and the documentation's semantic page draw the
 * same thing from the same data and would otherwise each decide what a row is:
 * which group a token belongs to, what that group is called, what order the
 * groups come in. Three small rules, and three chances for the two pages to
 * disagree about a layer they are both describing.
 *
 * The rules live here. What a table looks like is still each application's,
 * because the studio's is editable and the documentation's is not.
 */

/** The part of an id before the dot: `surface.raised` → `surface`. */
export function semanticGroupOf(id: string): string {
  return id.split(".")[0] ?? id;
}

/**
 * What a group is called in a heading.
 *
 * The id prefix is the export's spelling — `fg` is what a developer types —
 * and it makes a poor heading. A group somebody added themselves has no entry
 * here and shows its prefix, which is still what they typed.
 */
const GROUP_LABELS: Readonly<Record<string, string>> = {
  action: "Actions",
  surface: "Surfaces",
  border: "Borders",
  fg: "Foregrounds",
  focus: "Focus",
  status: "Status",
};

export function semanticGroupLabel(group: string): string {
  return GROUP_LABELS[group] ?? group;
}

export interface SemanticTokenGroup {
  group: string;
  label: string;
  tokens: SemanticToken[];
}

/**
 * Tokens bucketed by group, in the order each group first appears.
 *
 * Not sorted: the order somebody arranged is theirs, and the export writes it
 * the same way. A group's members keep their order inside it too, so a token
 * added to `surface` lands where it was put rather than alphabetically.
 */
export function groupSemanticTokens(
  tokens: SemanticToken[],
): SemanticTokenGroup[] {
  const buckets = new Map<string, SemanticToken[]>();
  for (const token of tokens) {
    const group = semanticGroupOf(token.id);
    const bucket = buckets.get(group);
    if (bucket) bucket.push(token);
    else buckets.set(group, [token]);
  }
  return [...buckets].map(([group, members]) => ({
    group,
    label: semanticGroupLabel(group),
    tokens: members,
  }));
}

/** One role, resolved in both modes. */
export interface SemanticRow {
  id: string;
  name: string;
  description: string;
  /** The exported name: `--color-surface-raised`. */
  variable: string;
  light: ResolvedSemantic;
  dark: ResolvedSemantic;
}

export interface SemanticRowGroup {
  group: string;
  label: string;
  rows: SemanticRow[];
}

/**
 * The layer resolved for reading rather than for editing.
 *
 * Both modes on every row, because the pair is the thing being described: a
 * page that showed one mode at a time would make somebody flip back and forth
 * to answer "what does this name do in dark", which is the question the layer
 * exists to answer. A token whose reference no longer resolves is dropped
 * rather than shown half-empty; `resolveSemantic` returns null only for an
 * empty palette, and a page with no palette has nothing to draw anyway.
 */
export function semanticRowGroups(
  tokens: SemanticToken[],
  palettes: ColorTrack[],
): SemanticRowGroup[] {
  return groupSemanticTokens(tokens).map(
    ({ group, label, tokens: members }) => ({
      group,
      label,
      rows: members.flatMap((token) => {
        const light = resolveSemantic(token, "light", palettes);
        const dark = resolveSemantic(token, "dark", palettes);
        if (!light || !dark) return [];
        return [
          {
            id: token.id,
            name: token.name,
            description: token.description,
            variable: semanticVariableName(token.id),
            light,
            dark,
          },
        ];
      }),
    }),
  );
}

/** One shade of one track. */
export interface PrimitiveRow {
  weight: number;
  /** The exported name: `--color-primary-500`. */
  variable: string;
  hex: string;
  /** The same colour in the format the workspace is being read in. */
  value: string;
}

export interface PrimitiveTrackRows {
  id: string;
  name: string;
  rows: PrimitiveRow[];
}

/**
 * Every track, every shade, in the order the ramp runs.
 *
 * The variable name comes from `paletteTokenName`, the same function the CSS
 * export uses, so the name on the page is the name in the file somebody
 * installs. Building it here from `track.name` would be a second spelling of
 * the same rule, and the first time a track was called "Brand Primary" the two
 * would disagree about where the hyphen goes.
 */
export function primitiveTrackRows(
  palettes: ColorTrack[],
  colourFormat: ColourFormat,
): PrimitiveTrackRows[] {
  return palettes.map((track) => ({
    id: track.id,
    name: track.name,
    rows: track.shades.map((shade) => ({
      weight: shade.weight,
      variable: `--color-${paletteTokenName(track.name)}-${shade.weight}`,
      hex: shade.hex,
      value: formatColour(shade.hex, colourFormat),
    })),
  }));
}

/** A role name and where it landed, for one mode. */
export interface ResolvedRoleReference {
  id: string;
  trackId: string;
  weight: number;
  hex: string;
}

/**
 * Where a role resolved, named.
 *
 * The contrast rows on the documentation page have to say which two roles were
 * measured and which primitives they landed on — "fg.primary on surface.base,
 * neutral 850 on neutral 100" — because a verdict with only a ratio in it
 * cannot be acted on. The report computes the ratio; this says what it was
 * computed from.
 */
export function resolvedRoleReference(
  tokens: SemanticToken[],
  id: string,
  mode: ColourMode,
  palettes: ColorTrack[],
): ResolvedRoleReference | null {
  const token = tokens.find((candidate) => candidate.id === id);
  if (!token) return null;
  const resolved = resolveSemantic(token, mode, palettes);
  if (!resolved) return null;
  return {
    id: token.id,
    trackId: resolved.trackId,
    weight: resolved.weight,
    hex: resolved.hex,
  };
}
