import snapshot from "./google-fonts.json";

/**
 * The Google Fonts catalogue, and the URL that loads a family at runtime.
 *
 * `next/font` cannot do this. Its own documentation is explicit that CSS and
 * font files are downloaded at build time, and it is a static import, so the
 * family has to be known when the app is built. A picker over the whole
 * catalogue is therefore incompatible with it.
 *
 * The cost of that choice: the reader's browser requests fonts.googleapis.com
 * and fonts.gstatic.com. It applies to the studio only — exported tokens name
 * families but never load them.
 */

/** [family, category, weights, supports thai, popularity rank] */
type FontTuple = [string, string, number[], number, number];

export interface GoogleFont {
  family: string;
  category: string;
  weights: number[];
  /** Whether the family ships Thai glyphs. */
  thai: boolean;
  /** Google's own usage rank, 1 being the most used. */
  popularity: number;
}

const CATALOGUE: GoogleFont[] = (snapshot as FontTuple[]).map(
  ([family, category, weights, thai, popularity]) => ({
    family,
    category,
    weights,
    thai: thai === 1,
    popularity,
  }),
);

const BY_POPULARITY = [...CATALOGUE].sort(
  (a, b) => a.popularity - b.popularity,
);

/** Every family in the snapshot, sorted by name. */
export function googleFonts(): GoogleFont[] {
  return CATALOGUE;
}

export function findGoogleFont(family: string): GoogleFont | undefined {
  const wanted = family.trim().toLowerCase();
  return CATALOGUE.find(
    (candidate) => candidate.family.toLowerCase() === wanted,
  );
}

export interface GoogleFontSearch {
  /** Only families that ship Thai glyphs. */
  thaiOnly?: boolean;
  limit?: number;
}

/**
 * Search the catalogue by name.
 *
 * Ranked by how the results are useful rather than alphabetically: families
 * starting with the query come before ones that merely contain it, and within
 * each the most-used come first. An empty query returns the most popular
 * families, since opening the picker on ABeeZee and Abel helps nobody.
 */
export function searchGoogleFonts(
  query: string,
  { thaiOnly = false, limit = 50 }: GoogleFontSearch = {},
): GoogleFont[] {
  const needle = query.trim().toLowerCase();
  const pool = thaiOnly
    ? BY_POPULARITY.filter((font) => font.thai)
    : BY_POPULARITY;
  if (!needle) return pool.slice(0, limit);

  const starts: GoogleFont[] = [];
  const contains: GoogleFont[] = [];
  for (const font of pool) {
    const name = font.family.toLowerCase();
    if (name.startsWith(needle)) starts.push(font);
    else if (name.includes(needle)) contains.push(font);
  }
  return [...starts, ...contains].slice(0, limit);
}

/**
 * Stylesheet URL that loads the given families.
 *
 * No subset parameter: the API returns one `@font-face` per subset with a
 * `unicode-range`, so the browser fetches only the ranges the page actually
 * uses. Asking for Thai explicitly would be redundant, and asking for the wrong
 * one would drop glyphs.
 *
 * Returns null when nothing needs loading, so a caller can remove the tag
 * rather than request an empty stylesheet.
 */
export function googleFontsHref(
  families: Array<{ family: string; weights?: number[] }>,
): string | null {
  const wanted = families
    .map(({ family, weights }) => {
      const known = findGoogleFont(family);
      if (!known) return null;
      const usable = (weights ?? known.weights).filter((weight) =>
        known.weights.includes(weight),
      );
      const list = usable.length > 0 ? usable : known.weights;
      return `family=${encodeURIComponent(known.family).replace(/%20/g, "+")}:wght@${[...new Set(list)].sort((a, b) => a - b).join(";")}`;
    })
    .filter((entry): entry is string => entry !== null);

  if (wanted.length === 0) return null;
  /* display=swap so text stays readable while the font downloads, rather than
     being invisible on a slow connection. */
  return `https://fonts.googleapis.com/css2?${wanted.join("&")}&display=swap`;
}
