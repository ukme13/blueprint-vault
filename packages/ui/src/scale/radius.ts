/**
 * Corner radius: named for what it goes on, and scaled together.
 *
 * Not a ramp. Astryx's own tokens are `inner`, `element`, `container` and
 * `page` — a use rather than a size — which is the shape the colour layer took
 * four stages to arrive at, so radius starts there. A developer reading
 * `--radius-container` knows where it goes; `--radius-3` only says it is the
 * third biggest.
 *
 * One multiplier scales the named ones together, because "make the whole thing
 * rounder" is a single decision and editing five values to express it is how
 * they drift apart.
 *
 * See docs/roadmap/scale-studio.md.
 */

export interface RadiusToken {
  /** The exported name: `element` becomes `--radius-element`. */
  id: string;
  name: string;
  description: string;
  /** The value at a multiplier of 1, in px. */
  basePx: number;
  /**
   * Whether the multiplier applies.
   *
   * A square corner and a pill are not sizes — 0 scaled is still 0, and half of
   * 9999px is still a pill — so they sit outside the scale rather than being
   * multiplied by a number that cannot change them meaningfully.
   */
  scales: boolean;
}

export interface RadiusScale {
  /** Applied to every token that scales. */
  multiplier: number;
  tokens: RadiusToken[];
}

export const DEFAULT_RADIUS_MULTIPLIER = 1;

/**
 * Bounds on the multiplier.
 *
 * 0 is a real choice — a system with square corners everywhere — so it is the
 * floor rather than a value to be clamped away from. 3 is where a container
 * radius stops reading as a corner and starts reading as a pill.
 */
export const MIN_RADIUS_MULTIPLIER = 0;
export const MAX_RADIUS_MULTIPLIER = 3;

/** The pixel value that means "as round as this box can be". */
export const RADIUS_FULL_PX = 9999;

/**
 * The tokens a new scale starts with.
 *
 * Four named sizes and two fixed, matching the set the studio already builds
 * against, so a developer moving between this system and Astryx reads one
 * convention rather than two.
 */
export const DEFAULT_RADIUS_TOKENS: readonly RadiusToken[] = [
  {
    id: "none",
    name: "None",
    description: "A square corner.",
    basePx: 0,
    scales: false,
  },
  {
    id: "inner",
    name: "Inner",
    description: "A corner inside another corner — a chip inside a card.",
    basePx: 4,
    scales: true,
  },
  {
    id: "element",
    name: "Element",
    description: "A button, an input, a badge.",
    basePx: 8,
    scales: true,
  },
  {
    id: "container",
    name: "Container",
    description: "A card, a panel, a dialog.",
    basePx: 12,
    scales: true,
  },
  {
    id: "page",
    name: "Page",
    description: "A full-width surface or a sheet.",
    basePx: 28,
    scales: true,
  },
  {
    id: "full",
    name: "Full",
    description: "A pill or a circle.",
    basePx: RADIUS_FULL_PX,
    scales: false,
  },
];

export function defaultRadiusScale(): RadiusScale {
  return {
    multiplier: DEFAULT_RADIUS_MULTIPLIER,
    tokens: DEFAULT_RADIUS_TOKENS.map((token) => ({ ...token })),
  };
}

export function radiusVariableName(id: string): string {
  return `--radius-${id}`;
}

export interface ResolvedRadius {
  id: string;
  name: string;
  description: string;
  variable: string;
  px: number;
  scales: boolean;
}

/**
 * Every token at the current multiplier.
 *
 * Rounded to whole pixels: a browser will render 10.5px, but a token file that
 * says 10.5 invites somebody to wonder which half-pixel matters, and none of
 * them do at this scale. In px rather than rem, per the plan — spacing should
 * grow with the reader's font size, a 4px corner should not.
 */
export function resolveRadius(scale: RadiusScale): ResolvedRadius[] {
  return scale.tokens.map((token) => ({
    id: token.id,
    name: token.name,
    description: token.description,
    variable: radiusVariableName(token.id),
    px: token.scales
      ? Math.round(token.basePx * scale.multiplier)
      : token.basePx,
    scales: token.scales,
  }));
}

function readToken(value: unknown): RadiusToken | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.id !== "string" || !raw.id) return null;
  if (typeof raw.basePx !== "number" || !Number.isFinite(raw.basePx)) {
    return null;
  }
  if (raw.basePx < 0) return null;

  return {
    id: raw.id,
    name: typeof raw.name === "string" && raw.name ? raw.name : raw.id,
    description: typeof raw.description === "string" ? raw.description : "",
    basePx: raw.basePx,
    /* Defaults to scaling. A token stored before `scales` existed is a named
       size, and named sizes are the ones the multiplier is for. */
    scales: raw.scales !== false,
  };
}

/**
 * Make a scale usable, whatever it arrived as.
 *
 * Read tolerantly, as the other slices are: a damaged token is dropped rather
 * than taking the scale with it, and a multiplier outside the bounds is clamped
 * rather than replaced, so a 4× experiment comes back as 3 and not as 1.
 */
export function normalizeRadiusScale(scale: RadiusScale): RadiusScale {
  const multiplier = Math.min(
    Math.max(
      Number.isFinite(scale.multiplier)
        ? scale.multiplier
        : DEFAULT_RADIUS_MULTIPLIER,
      MIN_RADIUS_MULTIPLIER,
    ),
    MAX_RADIUS_MULTIPLIER,
  );

  const seen = new Set<string>();
  const tokens = (Array.isArray(scale.tokens) ? scale.tokens : [])
    .map(readToken)
    .filter((token): token is RadiusToken => token !== null)
    .filter((token) => {
      /* Two tokens sharing an id export one variable twice and the later one
         silently wins, the same trap the semantic layer guards against. */
      if (seen.has(token.id)) return false;
      seen.add(token.id);
      return true;
    });

  return {
    multiplier,
    tokens: tokens.length > 0 ? tokens : defaultRadiusScale().tokens,
  };
}

/** The scale as custom properties, in px. */
export function radiusCssVariables(scale: RadiusScale): Record<string, string> {
  return Object.fromEntries(
    resolveRadius(scale).map((token) => [token.variable, `${token.px}px`]),
  );
}
