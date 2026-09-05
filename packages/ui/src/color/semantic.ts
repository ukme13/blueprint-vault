import { contrastRatio } from "./accessibility";
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
  /**
   * Choose between the two ends of this role's track by measuring.
   *
   * Named for the fill this role is drawn on top of. A label on a filled
   * control has exactly one job — to be readable on that fill — and which end
   * of the neutral ramp does it is a fact about the fill's lightness rather
   * than a preference anybody holds.
   *
   * Seeding it statically works for one palette and no others. Measured
   * against this project's own: white reads better on the primary, warning,
   * error and info fills, near-black on success in dark, and the neutral fill
   * inverts with the mode. A client whose brand colour is pale wants the
   * opposite of all of them, and would have no way to know until the report
   * told them.
   *
   * So the seed asks. `seedSemanticTokens` resolves the fill first, then takes
   * whichever end of this role's own track reads better on it.
   */
  readableOn?: string;
}

type TrackRole =
  | "primary"
  | "secondary"
  | "neutral"
  | "success"
  | "warning"
  | "error"
  | "info";

/**
 * A tone: one colour of the system, and everything a control needs from it.
 *
 * The statuses arrived at this shape first — a fill is not enough to build an
 * alert, which needs a ground, a foreground and an edge as well. A button
 * turned out to want exactly the same four, plus a hovered and a pressed fill
 * and a hovered ground. So it is one pattern applied six times rather than six
 * sets of names, and the Button's scheme table is a lookup rather than a
 * palette of its own.
 *
 * Every weight below was measured against this project's palette rather than
 * chosen by eye. Three of them came back different from the obvious answer:
 *
 * - The border is 450 in **both** modes. A border's job is to be seen against
 *   the canvas, and the canvas moves between modes while the middle of the
 *   ramp does not — so the same weight clears 3:1 on both. The 200/800 the
 *   statuses were seeded at for their alert borders measures 1.4:1 on a light
 *   canvas and 1.06:1 on a dark one, which is not a boundary.
 * - The surface stays at the pale end, 50/950, where it measures about 1.15:1
 *   against the canvas. That is faint, and it is what a hover wash is; the
 *   alternative moves the alert backgrounds the bridge feeds.
 * - The label on the fill is measured per mode rather than declared. See
 *   `readableOn`.
 */
interface ToneSpec {
  /** The fill's role id: `action.primary`, `status.success`. */
  id: string;
  /** How a role of this tone is named: "Primary action". */
  name: string;
  /** What the fill is for, in one line. */
  description: string;
  track: TrackRole;
  /** The fill, as a fraction along the track. */
  position: number;
  fill: [light: number, dark: number];
  /** One step toward the middle of the ramp, then two. */
  hover: [light: number, dark: number];
  active: [light: number, dark: number];
  /** The id of the label that sits on the fill, which lives in the fg group. */
  onFill: string;
  /** What that label is called. */
  onFillName: string;
  /** A foreground of this tone, on its surface or on the canvas. */
  foreground: [light: number, dark: number];
}

/** The pale ground and its hover, the same for every tone. */
const TONE_SURFACE: [number, number] = [50, 950];
const TONE_SURFACE_HOVER: [number, number] = [100, 900];
/** Measured: the one weight that clears 3:1 on both canvases. */
const TONE_BORDER = 450;

function toneRoles(tone: ToneSpec): SeedRole[] {
  const of = (
    suffix: string,
    label: string,
    description: string,
    [light, dark]: [number, number],
  ): SeedRole => ({
    id: `${tone.id}-${suffix}`,
    name: `${tone.name} ${label}`,
    description,
    track: tone.track,
    position: tone.position,
    preferWeight: light,
    preferDarkWeight: dark,
  });

  return [
    {
      id: tone.id,
      name: tone.name,
      description: tone.description,
      track: tone.track,
      position: tone.position,
      preferWeight: tone.fill[0],
      preferDarkWeight: tone.fill[1],
    },
    of("hover", "hover", "The fill under the pointer.", tone.hover),
    of("active", "active", "The fill while it is pressed.", tone.active),
    of(
      "surface",
      "surface",
      "The soft ground of an alert, a ghost control or a hovered outline.",
      TONE_SURFACE,
    ),
    of(
      "surface-hover",
      "surface hover",
      "That soft ground, hovered or pressed.",
      TONE_SURFACE_HOVER,
    ),
    of(
      "fg",
      "foreground",
      "Text and icons on the surface, and on the canvas.",
      tone.foreground,
    ),
    of("border", "border", "The edge of an outlined control or an alert.", [
      TONE_BORDER,
      TONE_BORDER,
    ]),
  ];
}

/** The label on a filled control, measured against that fill. */
function onFillRole(tone: ToneSpec): SeedRole {
  return {
    id: tone.onFill,
    name: tone.onFillName,
    description: `Text and icons on the ${tone.name.toLowerCase()} fill.`,
    track: "neutral",
    /* Only reached when the fill is missing from the layer, which the
       measurement cannot happen without. */
    position: 0.05,
    preferWeight: 50,
    preferDarkWeight: 950,
    readableOn: tone.id,
  };
}

const TONES: readonly ToneSpec[] = [
  {
    id: "action.primary",
    name: "Action primary",
    description: "The fill of a primary button or an active control.",
    track: "primary",
    position: 0.55,
    fill: [500, 450],
    hover: [550, 400],
    active: [600, 350],
    onFill: "fg.on-action",
    onFillName: "Foreground on action",
    foreground: [900, 100],
  },
  {
    /* Black in light and white in dark, which is the one tone whose fill
       crosses the ramp rather than sitting on it. A neutral action is a
       variant of a button and not a second mode: it takes its two values from
       the same layer every other tone does, so "the quiet button" is a
       decision the Semantics tab can edit rather than a branch in a
       component. */
    id: "action.neutral",
    name: "Action neutral",
    description: "The fill of a plain button: black on light, white on dark.",
    track: "neutral",
    position: 0.95,
    fill: [950, 50],
    hover: [900, 100],
    active: [850, 150],
    onFill: "fg.on-neutral",
    onFillName: "Foreground on neutral",
    /* Body text, because a neutral text button's label is body text. */
    foreground: [850, 100],
  },
  {
    id: "status.success",
    name: "Status success",
    description: "A success badge or message.",
    track: "success",
    position: 0.55,
    fill: [500, 450],
    hover: [550, 400],
    active: [600, 350],
    onFill: "fg.on-success",
    onFillName: "Foreground on success",
    foreground: [900, 100],
  },
  {
    id: "status.warning",
    name: "Status warning",
    description: "A warning badge or message.",
    track: "warning",
    position: 0.45,
    fill: [450, 500],
    hover: [500, 450],
    active: [550, 400],
    onFill: "fg.on-warning",
    onFillName: "Foreground on warning",
    foreground: [900, 100],
  },
  {
    id: "status.error",
    name: "Status error",
    description: "An error badge or message.",
    track: "error",
    position: 0.55,
    fill: [500, 450],
    hover: [550, 400],
    active: [600, 350],
    onFill: "fg.on-error",
    onFillName: "Foreground on error",
    foreground: [900, 100],
  },
  {
    id: "status.info",
    name: "Status info",
    description: "An informational badge or message.",
    track: "info",
    position: 0.55,
    fill: [500, 450],
    hover: [550, 400],
    active: [600, 350],
    onFill: "fg.on-info",
    onFillName: "Foreground on info",
    foreground: [900, 100],
  },
];

const tone = (id: string): SeedRole[] =>
  toneRoles(TONES.find((each) => each.id === id)!);

const onFill = (id: string): SeedRole =>
  onFillRole(TONES.find((each) => each.id === id)!);

const SEED_ROLES: readonly SeedRole[] = [
  ...tone("action.primary"),
  {
    id: "action.secondary",
    name: "Action secondary",
    description: "The fill of a secondary button or control.",
    track: "secondary",
    position: 0.48,
  },
  {
    /* Not the primary tone's surface, though it reads like it should be.
       A surface is the pale ground a control sits on at the canvas end of
       the ramp; this is the accent turned down but still present — the fill
       of a selected chip, at 400 and 900. Three places in the studio use it
       that way and Astryx reads it as `--color-accent-muted`, so folding it
       into `action.primary-surface` would move three backgrounds two thirds
       of the way up the ramp. Two names because they are two jobs. */
    id: "action.muted",
    name: "Action muted",
    description: "A quiet fill in the action colour: a tint or a soft badge.",
    track: "primary",
    position: 0.42,
    preferWeight: 400,
    preferDarkWeight: 900,
  },
  ...tone("action.neutral"),

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
    /* Two roles rather than one because they are two decisions: a skeleton
       may pulse and a track may not, and a system that gives them one name
       cannot change one without the other. */
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
       glyph in a badge. Saved layers keep working through
       `migrateSemanticIds`. */
    id: "fg.primary",
    name: "Foreground primary",
    description: "Body text, headings and icons.",
    track: "neutral",
    position: 0.9,
  },
  {
    id: "fg.secondary",
    name: "Foreground secondary",
    description: "Supporting text, captions and help.",
    track: "neutral",
    position: 0.68,
  },
  {
    /* Solid, like every foreground. Fading text with opacity lets the surface
       bleed through into a colour nobody chose and nothing measured. */
    id: "fg.disabled",
    name: "Foreground disabled",
    description: "Text and icons on a control that cannot be used.",
    track: "neutral",
    position: 0.55,
  },
  {
    /* Text in the accent colour on an ordinary surface: a link, an eyebrow.
       Not `action.primary-fg`, which is the label of an outlined button and
       sits at the dark end of the ramp with the other tones. */
    id: "fg.accent",
    name: "Foreground accent",
    description: "Text or an icon in the accent colour, on a surface.",
    track: "primary",
    position: 0.63,
    preferWeight: 600,
    preferDarkWeight: 400,
  },
  ...TONES.map((each) => onFill(each.id)),

  {
    id: "focus.ring",
    name: "Focus ring",
    description: "The focus indicator.",
    track: "primary",
    position: 0.32,
    preferWeight: 300,
  },

  ...tone("status.success"),
  ...tone("status.warning"),
  ...tone("status.error"),
  ...tone("status.info"),
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

  /* Fills first, then the labels that measure against them. Every role a
     `readableOn` names is an ordinary role in this same list, so one pass
     would depend on the order somebody happened to write them in. */
  const seeded = new Map<string, SemanticToken>();
  const ordered = [
    ...SEED_ROLES.filter((role) => role.readableOn === undefined),
    ...SEED_ROLES.filter((role) => role.readableOn !== undefined),
  ];

  for (const role of ordered) {
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
    const measured =
      role.readableOn === undefined
        ? null
        : readableEnds(track, seeded.get(role.readableOn), tracks);

    seeded.set(role.id, {
      id: role.id,
      name: role.name,
      description: role.description,
      light: {
        trackId: track.id,
        weight: measured?.light.weight ?? light.weight,
      },
      dark: { trackId: track.id, weight: measured?.dark.weight ?? dark.weight },
    });
  }

  /* Back into the order the roles are written in, which is the order the
     Semantics table groups them and the export writes them. */
  return SEED_ROLES.map((role) => seeded.get(role.id)!);
}

/**
 * The end of a track that reads best on a fill, per mode.
 *
 * Null when the fill is not in the layer, which leaves the caller on its
 * declared weights: a seed that cannot measure should fall back to a stated
 * choice rather than to a guess about a colour that is not there.
 */
function readableEnds(
  track: ColorTrack,
  fill: SemanticToken | undefined,
  tracks: ColorTrack[],
): { light: ShadeItem; dark: ShadeItem } | null {
  if (!fill) return null;
  const lightest = track.shades[0]!;
  const darkest = track.shades[track.shades.length - 1]!;

  const better = (mode: ColourMode): ShadeItem => {
    const on = resolveSemantic(fill, mode, tracks);
    if (!on) return mode === "light" ? lightest : darkest;
    return contrastRatio(lightest.hex, on.hex) >=
      contrastRatio(darkest.hex, on.hex)
      ? lightest
      : darkest;
  };

  return { light: better("light"), dark: better("dark") };
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
  /* The third rename, and the one that made a pattern out of a special case.
     Primary was the only tone whose hovered and pressed fills were named for
     the group rather than for the tone — `action.hover` reads as "the hover
     of actions", which stopped being true the moment a second action tone
     existed. Every tone now spells them the same way. */
  "action.hover": "action.primary-hover",
  "action.active": "action.primary-active",
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
