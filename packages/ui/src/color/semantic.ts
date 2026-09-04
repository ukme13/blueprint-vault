import type { ColorTrack, ShadeItem } from "./types";

/**
 * The semantic layer: names that say when to use a colour, not what it is.
 *
 * A primitive says `primary 500`. A semantic token says `primary action`, and
 * points at a primitive to get its value. That indirection is the whole layer:
 * it is what lets one name carry a different colour in light and dark, and what
 * makes an export something a developer codes against rather than a list of
 * swatches.
 *
 * See docs/roadmap/semantic-tokens.md.
 */

/** Light or dark. A token holds one reference per mode. */
export type ColourMode = "light" | "dark";

export const COLOUR_MODES: readonly ColourMode[] = ["light", "dark"];

/**
 * Where a semantic token points.
 *
 * A weight rather than a position along the ramp, because the export has to
 * emit an alias — `var(--color-primary-500)` — and a position cannot be
 * written as one. Resolving a position at export time would mean the alias
 * silently changed the day somebody altered the shade count, which is the
 * failure this layer exists to prevent.
 */
export interface SemanticReference {
  trackId: string;
  weight: number;
}

export interface SemanticToken {
  /** The exported name, e.g. `primary.action` becomes `--color-primary-action`. */
  id: string;
  name: string;
  description: string;
  light: SemanticReference;
  dark: SemanticReference;
}

/**
 * The roles, and where each one sits.
 *
 * Which track each reaches for, and how far along it, came from the palette
 * preview's own table — a choice that predated this layer and was moved here so
 * it could be edited and exported. That table is gone now: the preview resolves
 * these tokens instead, so this is the only place the choice is made.
 *
 * The names are the demo page's answer. The first pass translated the preview
 * helper's own labels, which described a position on a ramp: `neutral.light`,
 * `neutral.dark`, `primary.soft`. Building a real page out of them showed what
 * they were actually for — a canvas, body text, a raised card — so they now say
 * that instead. A developer reading `--color-surface-base` knows where it goes;
 * `--color-neutral-light` only says how light it is.
 *
 * Old ids are carried forward by `migrateSemanticIds`, so a layer saved under
 * the first names keeps working.
 */
interface SeedRole {
  id: string;
  name: string;
  description: string;
  /** Preferred track by name; falls back down the chain in `trackFor`. */
  track: TrackRole;
  /** How far along the track, as a fraction of its length. */
  position: number;
  /** Taken when the track has it, whatever `position` would give. */
  preferWeight?: number;
  /**
   * The dark weight, when mirroring is the wrong answer for this role.
   *
   * Mirroring is right for the roles that carry the page — text on light
   * becomes text on dark at the same distance from the edge — and wrong for a
   * role whose two values were chosen as a pair. `fg.on-action` is white on a
   * fill in light and near-black on a fill in dark, which is 50 and 950, and
   * the mirror of 50 is 900. Six roles came over from the studio's chrome with
   * pairs like that; every one of them would have been a shade out.
   *
   * Falls back to the mirror when the track does not have the weight, the same
   * way `preferWeight` falls back to `position`.
   */
  preferDarkWeight?: number;
}

type TrackRole =
  | "primary"
  | "secondary"
  | "neutral"
  | "success"
  | "warning"
  | "error"
  | "info";

const SEED_ROLES: readonly SeedRole[] = [
  {
    id: "action.primary",
    name: "Action primary",
    description: "The fill of a primary button or an active control.",
    track: "primary",
    position: 0.55,
  },
  {
    id: "action.secondary",
    name: "Action secondary",
    description: "The fill of a secondary button or control.",
    track: "secondary",
    position: 0.48,
  },
  {
    id: "action.hover",
    name: "Action hover",
    description: "A primary control under the pointer.",
    track: "primary",
    position: 0.62,
  },
  {
    id: "action.active",
    name: "Action active",
    description: "A primary control while it is pressed.",
    track: "primary",
    position: 0.7,
  },
  {
    /* The accent at rest: a tint behind a selected row, a quiet badge. Not a
       state of `action.primary` the way hover and active are — nothing is
       hovering — but the same colour turned down, which is why it takes the
       accent track at both ends rather than mirroring into neutral. */
    id: "action.muted",
    name: "Action muted",
    description: "A quiet fill in the action colour: a tint or a soft badge.",
    track: "primary",
    position: 0.42,
    preferWeight: 400,
    preferDarkWeight: 900,
  },
  {
    id: "surface.base",
    name: "Surface base",
    description: "The page canvas, behind everything else.",
    track: "neutral",
    position: 0.08,
  },
  {
    id: "surface.subtle",
    name: "Surface subtle",
    description: "A quiet wash set into the canvas: a well, a code block.",
    track: "neutral",
    position: 0.14,
  },
  {
    id: "surface.raised",
    name: "Surface raised",
    description: "A card or panel lifted off the canvas.",
    track: "primary",
    position: 0.12,
  },
  {
    id: "surface.overlay",
    name: "Surface overlay",
    description: "A popover, menu or dialog over everything else.",
    track: "neutral",
    position: 0.02,
  },
  {
    /* Behind a loading placeholder, and behind the filled part of a slider or
       a progress bar. Two roles rather than one because they are two
       decisions: a skeleton may pulse and a track may not, and a system that
       gives them one name cannot change one without the other. They start on
       the same shade, which is what the studio's chrome already does. */
    id: "surface.skeleton",
    name: "Surface skeleton",
    description: "The placeholder block shown while content loads.",
    track: "neutral",
    position: 0.21,
    preferWeight: 200,
    preferDarkWeight: 800,
  },
  {
    id: "surface.track",
    name: "Surface track",
    description: "The groove of a slider, scrollbar or progress bar.",
    track: "neutral",
    position: 0.21,
    preferWeight: 200,
    preferDarkWeight: 800,
  },
  {
    id: "border.default",
    name: "Border default",
    description: "Borders and dividers.",
    track: "neutral",
    position: 0.48,
  },
  {
    id: "border.subtle",
    name: "Border subtle",
    description: "A border that separates without drawing the eye.",
    track: "neutral",
    position: 0.32,
  },
  {
    id: "border.muted",
    name: "Border muted",
    description: "The faintest rule: a divider inside a surface.",
    track: "neutral",
    position: 0.22,
  },
  {
    /* Heavier than `border.default` on purpose: the rule under a section
       heading and the edge of a card that has to read as an edge. In dark it
       goes lighter than the mirror would, because a border on a dark surface
       has to climb further out of it to be seen at all. */
    id: "border.strong",
    name: "Border strong",
    description: "A border meant to be noticed: a card edge, a section rule.",
    track: "neutral",
    position: 0.32,
    preferWeight: 300,
    preferDarkWeight: 700,
  },
  {
    /* `fg`, not `text`: the same token colours an icon, a rule in a chart, a
       glyph in a badge. "Foreground" is what it is; "text" was one thing it
       is used for. Saved layers keep working through `migrateSemanticIds`. */
    id: "fg.primary",
    name: "Foreground primary",
    description: "Body text, headings and icons.",
    track: "neutral",
    position: 0.9,
  },
  {
    id: "fg.secondary",
    /* The page asked for this one. Muted text was being faked with opacity,
       which the primitive check cannot see and which mixes a colour nobody
       chose out of whatever happens to be behind it. */
    name: "Foreground secondary",
    description: "Supporting text, captions and help.",
    track: "neutral",
    position: 0.68,
  },
  {
    /* Solid, like every foreground. Fading text with opacity lets the surface
       bleed through into a colour nobody chose and nothing measured, which is
       how a disabled label ends up below the contrast floor on one surface and
       above it on the next. A token has one value and is checked once. */
    id: "fg.disabled",
    name: "Foreground disabled",
    description: "Text and icons on a control that cannot be used.",
    track: "neutral",
    position: 0.55,
  },
  {
    /* Text and icons in the accent colour, on an ordinary surface: a link, an
       eyebrow, a selected tab's label. It is a foreground and not an action —
       `action.primary` is the fill of a thing you press, and using a fill
       colour as text is how a link ends up at 3:1 on the canvas. */
    id: "fg.accent",
    name: "Foreground accent",
    description: "Text or an icon in the accent colour, on a surface.",
    track: "primary",
    position: 0.63,
    preferWeight: 600,
    preferDarkWeight: 400,
  },
  {
    /* The label on a filled control, which is the one pair every button
       ships. Its two values are chosen against the fill rather than mirrored
       through the ramp: near-white on the light fill, near-black on the dark
       one. Measured against `action.primary` in the report for that reason —
       it is the only foreground in the layer whose background is not a
       surface. */
    id: "fg.on-action",
    name: "Foreground on action",
    description: "The label on a filled action: text and icons on the accent.",
    track: "neutral",
    position: 0.05,
    preferWeight: 50,
    preferDarkWeight: 950,
  },
  {
    id: "focus.ring",
    name: "Focus ring",
    description: "The focus indicator.",
    track: "primary",
    position: 0.32,
    /* 300 is the weight the focus token is documented against, so it is taken
       when the track has it rather than whatever the position rounds to. */
    preferWeight: 300,
  },
  {
    id: "status.success",
    name: "Status success",
    description: "A success badge or message.",
    track: "success",
    position: 0.55,
  },
  {
    id: "status.warning",
    name: "Status warning",
    description: "A warning badge or message.",
    track: "warning",
    position: 0.45,
  },
  {
    id: "status.error",
    name: "Status error",
    description: "An error badge or message.",
    track: "error",
    position: 0.55,
  },
  {
    id: "status.info",
    name: "Status info",
    description: "An informational badge or message.",
    track: "info",
    position: 0.55,
  },
];

/** Where along a track a role sits, as a fraction of its length. */
function shadeAt(track: ColorTrack, position: number): ShadeItem {
  const index = Math.round((track.shades.length - 1) * position);
  return track.shades[index]!;
}

/**
 * The track a role reaches for.
 *
 * Every track falls back towards primary rather than to nothing, so a project
 * with a single track still seeds a complete layer.
 */
function trackFor(tracks: ColorTrack[], role: TrackRole): ColorTrack {
  const named = (name: string, fallback: ColorTrack) =>
    tracks.find((track) => track.name === name) ?? fallback;

  const primary = named("primary", tracks[0]!);
  if (role === "primary") return primary;

  const neutral = named("neutral", primary);
  if (role === "neutral") return neutral;
  if (role === "secondary") return named("secondary", neutral);
  return named(role, primary);
}

/**
 * The shade at the same distance from the other end of the track.
 *
 * Mirroring the index rather than the weight number. The weights are not
 * symmetric — the ramp runs 25, 50, 100 … 950, so 1000 minus a weight lands on
 * one the track does not have — and a track may hold any number of shades. The
 * index is the only expression of "as far from the dark end as this is from the
 * light one" that holds for every palette.
 */
function mirrored(track: ColorTrack, weight: number): ShadeItem {
  const index = track.shades.findIndex((shade) => shade.weight === weight);
  if (index < 0) return track.shades[track.shades.length - 1]!;
  return track.shades[track.shades.length - 1 - index]!;
}

/**
 * A complete semantic layer for a palette.
 *
 * Dark is seeded by mirroring, which is right for the roles that carry the
 * page — text on light becomes text on dark — and a defensible starting point
 * for the rest. It is a seed and not a rule: every reference is editable, and
 * the point of holding two is that they can disagree.
 *
 * Returns an empty layer for an empty palette rather than throwing: there is
 * nothing to point at, which is a state the studio reaches whenever the last
 * track is deleted.
 */
export function seedSemanticTokens(tracks: ColorTrack[]): SemanticToken[] {
  if (tracks.length === 0) return [];

  return SEED_ROLES.map((role) => {
    const track = trackFor(tracks, role.track);
    const light =
      (role.preferWeight === undefined
        ? undefined
        : track.shades.find((shade) => shade.weight === role.preferWeight)) ??
      shadeAt(track, role.position);
    const dark =
      (role.preferDarkWeight === undefined
        ? undefined
        : track.shades.find(
            (shade) => shade.weight === role.preferDarkWeight,
          )) ?? mirrored(track, light.weight);

    return {
      id: role.id,
      name: role.name,
      description: role.description,
      light: { trackId: track.id, weight: light.weight },
      dark: { trackId: track.id, weight: dark.weight },
    };
  });
}

/**
 * Why a reference could not be honoured.
 *
 * A user can delete a track a token points at, or change a shade count so a
 * weight stops existing. Both are ordinary states rather than corruption — the
 * same call the uploaded-fonts plan made about a font file that is not in this
 * browser — so resolution reports them and carries on.
 */
export type SemanticMiss = "track" | "weight";

export interface ResolvedSemantic {
  id: string;
  mode: ColourMode;
  /** The track actually used, which is the referenced one unless it is gone. */
  trackId: string;
  trackName: string;
  /** The weight actually used. */
  weight: number;
  hex: string;
  missing: SemanticMiss | null;
}

/** The shade whose weight is closest to the one asked for. */
function nearestWeight(track: ColorTrack, weight: number): ShadeItem {
  return track.shades.reduce((closest, shade) =>
    Math.abs(shade.weight - weight) < Math.abs(closest.weight - weight)
      ? shade
      : closest,
  );
}

/**
 * What a token is worth in one mode.
 *
 * The single place a reference becomes a colour. Nothing upstream of this call
 * knows about modes, which is what keeps preview, contrast and export from each
 * growing their own idea of what dark means.
 *
 * Null only for an empty palette, where there is no colour to fall back to.
 */
export function resolveSemantic(
  token: SemanticToken,
  mode: ColourMode,
  tracks: ColorTrack[],
): ResolvedSemantic | null {
  if (tracks.length === 0) return null;

  const reference = token[mode];
  const referenced = tracks.find((track) => track.id === reference.trackId);
  const track = referenced ?? tracks[0]!;
  const exact = track.shades.find((shade) => shade.weight === reference.weight);
  const shade = exact ?? nearestWeight(track, reference.weight);

  return {
    id: token.id,
    mode,
    trackId: track.id,
    trackName: track.name,
    weight: shade.weight,
    hex: shade.hex,
    missing: referenced ? (exact ? null : "weight") : "track",
  };
}

/** Every token resolved in one mode, skipping nothing. */
export function resolveSemantics(
  tokens: SemanticToken[],
  mode: ColourMode,
  tracks: ColorTrack[],
): ResolvedSemantic[] {
  return tokens
    .map((token) => resolveSemantic(token, mode, tracks))
    .filter((resolved): resolved is ResolvedSemantic => resolved !== null);
}

/**
 * Editing a layer.
 *
 * Pure `SemanticToken[] -> SemanticToken[]`, so the editor is a rendering
 * concern and every rule about ids and uniqueness is testable without a DOM.
 */

/** Turn a label into a token id: lowercase, words joined by a single dot. */
export function semanticId(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.|\.$/g, "");
}

/**
 * Rename a token, and its id with it.
 *
 * The id is the exported name — `primary.action` becomes
 * `--color-primary-action` — so a rename that left it alone would let the
 * label and the token a developer writes drift apart. The typography groups
 * made exactly that mistake and had to be fixed.
 *
 * A blank or duplicate label keeps the existing id rather than colliding: two
 * tokens sharing an id would export one variable twice, and the later one
 * would silently win.
 */
export function renameSemanticToken(
  tokens: SemanticToken[],
  id: string,
  label: string,
): SemanticToken[] {
  if (!tokens.some((token) => token.id === id)) return tokens;

  const wanted = semanticId(label);
  let nextId = wanted || id;
  let suffix = 2;
  while (nextId !== id && tokens.some((candidate) => candidate.id === nextId)) {
    nextId = `${wanted}.${suffix}`;
    suffix += 1;
  }

  return tokens.map((token) =>
    token.id === id
      ? { ...token, id: nextId, name: label.trim() || token.name }
      : token,
  );
}

/** Point one mode of one token somewhere else. */
export function repointSemanticToken(
  tokens: SemanticToken[],
  id: string,
  mode: ColourMode,
  reference: SemanticReference,
): SemanticToken[] {
  return tokens.map((token) =>
    token.id === id ? { ...token, [mode]: reference } : token,
  );
}

/**
 * Add a token.
 *
 * It starts pointing at the middle of the first track in both modes rather
 * than at nothing: a token with no reference cannot be previewed, and the
 * first thing anybody does is repoint it anyway.
 */
export function addSemanticToken(
  tokens: SemanticToken[],
  tracks: ColorTrack[],
  label = "New token",
): SemanticToken[] {
  if (tracks.length === 0) return tokens;

  const track = tracks[0]!;
  const middle = shadeAt(track, 0.5);
  const reference = { trackId: track.id, weight: middle.weight };

  const wanted = semanticId(label) || "token";
  let id = wanted;
  let suffix = 2;
  while (tokens.some((token) => token.id === id)) {
    id = `${wanted}.${suffix}`;
    suffix += 1;
  }

  return [
    ...tokens,
    {
      id,
      name: label,
      description: "",
      light: reference,
      dark: {
        trackId: track.id,
        weight: mirrored(track, middle.weight).weight,
      },
    },
  ];
}

export function removeSemanticToken(
  tokens: SemanticToken[],
  id: string,
): SemanticToken[] {
  return tokens.filter((token) => token.id !== id);
}
/**
 * The CSS custom-property name a token exports under.
 *
 * `primary.action` becomes `--color-primary-action`. Dots are the layer's own
 * separator and mean nothing to CSS.
 */
export function semanticVariableName(id: string): string {
  return `--color-${id.replace(/\./g, "-")}`;
}

/**
 * A layer as custom properties, resolved for one mode.
 *
 * Values, not aliases. A preview has to be able to simulate what it shows, and
 * a colour-vision transform needs a colour rather than a reference to one. The
 * export in stage 5 emits aliases instead, from the same tokens — which is the
 * point of resolution living in one place.
 *
 * `transform` is where simulation hooks in; it defaults to the identity so a
 * caller that does not simulate passes nothing.
 */
export function semanticCssVariables(
  tokens: SemanticToken[],
  mode: ColourMode,
  tracks: ColorTrack[],
  transform: (hex: string) => string = (hex) => hex,
): Record<string, string> {
  return Object.fromEntries(
    resolveSemantics(tokens, mode, tracks).map((resolved) => [
      semanticVariableName(resolved.id),
      transform(resolved.hex),
    ]),
  );
}

/**
 * The first names, and what they became.
 *
 * The first pass took the preview helper's labels, which describe a position on
 * a ramp rather than a use. Anything already saved under them is renamed on the
 * way in, so a project made before this keeps its layer instead of silently
 * gaining a second set beside the ones it has.
 */
const RENAMED_IDS: Readonly<Record<string, string>> = {
  "primary.action": "action.primary",
  "secondary.action": "action.secondary",
  "neutral.light": "surface.base",
  "primary.soft": "surface.raised",
  "neutral.mid": "border.default",
  "neutral.dark": "text.primary",
  "primary.focus": "focus.ring",
  "success.action": "status.success",
  "warning.action": "status.warning",
  "error.action": "status.error",
  "info.action": "status.info",
  /* The second rename. `text` named one use of a foreground colour; the same
     token draws icons and rules, so the group is now called what it is. A
     layer saved under the first names goes `neutral.dark` → `text.primary` →
     `fg.primary` in one read, which is why the walk below follows a chain. */
  "text.primary": "fg.primary",
  "text.secondary": "fg.secondary",
};

/**
 * Where an id ends up, following renames until they stop.
 *
 * Bounded by the table's size: a cycle would otherwise loop, and a table that
 * renames `a` to `b` and `b` back to `a` is a bug worth surviving rather than
 * hanging on.
 */
function currentId(id: string): string {
  let at = id;
  for (let hops = 0; hops < Object.keys(RENAMED_IDS).length; hops += 1) {
    const next = RENAMED_IDS[at];
    if (!next) break;
    at = next;
  }
  return at;
}

/**
 * Carry a stored layer onto the current names.
 *
 * A token is renamed only when its id is untouched from an earlier seed set: a
 * rename moves the id with the label, so an id still matching one of these is
 * one nobody has edited. And never onto a name already taken — two tokens
 * sharing an id would export one variable twice and the later would win.
 */
export function migrateSemanticIds(tokens: SemanticToken[]): SemanticToken[] {
  const taken = new Set(tokens.map((token) => token.id));

  return tokens.map((token) => {
    const renamed = currentId(token.id);
    if (renamed === token.id || taken.has(renamed)) return token;

    const role = SEED_ROLES.find((each) => each.id === renamed);
    return {
      ...token,
      id: renamed,
      name: role?.name ?? token.name,
      description: role?.description ?? token.description,
    };
  });
}

/**
 * Add the seed roles a stored layer does not have.
 *
 * A workspace saved before a role existed has no token for it, and the demo
 * page and the studio's own chrome both reach for the full set by name. The
 * new ones are seeded against this palette the same way a fresh layer is, and
 * appended so nothing somebody arranged moves.
 *
 * Only for a layer that has something in it. An empty layer that was
 * genuinely stored is a deliberate act, and filling it would undo that.
 */
export function fillSeedRoles(
  tokens: SemanticToken[],
  tracks: ColorTrack[],
): SemanticToken[] {
  if (tokens.length === 0 || tracks.length === 0) return tokens;
  const present = new Set(tokens.map((token) => token.id));
  const missing = seedSemanticTokens(tracks).filter(
    (seeded) => !present.has(seeded.id),
  );
  return missing.length === 0 ? tokens : [...tokens, ...missing];
}
