import scriptNames from "./google-font-scripts.json";
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

/** [family, category, weights, script indices, popularity rank] */
type FontTuple = [string, string, number[], number[], number];

/**
 * Writing systems a family may cover, beyond Latin.
 *
 * Latin is not listed: nearly every family has it, so it separates nothing.
 * These are what a bilingual fallback is chosen for — Thai here, but the same
 * problem exists for Arabic, Devanagari, Korean and the rest.
 */
export const FONT_SCRIPTS: string[] = scriptNames as string[];

export interface GoogleFont {
  family: string;
  category: string;
  weights: number[];
  /** Non-Latin writing systems this family covers. */
  scripts: string[];
  /** Google's own usage rank, 1 being the most used. */
  popularity: number;
}

const CATALOGUE: GoogleFont[] = (snapshot as FontTuple[]).map(
  ([family, category, weights, scripts, popularity]) => ({
    family,
    category,
    weights,
    scripts: scripts.map((index) => FONT_SCRIPTS[index]!),
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
  /** Only families covering this writing system, e.g. "thai". */
  script?: string;
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
  { script, limit = 50 }: GoogleFontSearch = {},
): GoogleFont[] {
  const needle = query.trim().toLowerCase();
  const pool = script
    ? BY_POPULARITY.filter((font) => font.scripts.includes(script))
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
 * The CSS generic a family should fall back to.
 *
 * Appended automatically so a stack always ends in something the browser can
 * render. Without it, two failed loads leave the browser default, which may be
 * a serif nobody chose.
 */
export function genericForCategory(category: string): string {
  const normalized = category.trim().toLowerCase();
  if (normalized.includes("serif") && !normalized.includes("sans")) {
    return "serif";
  }
  if (normalized.includes("mono")) return "monospace";
  if (normalized.includes("handwriting")) return "cursive";
  if (normalized.includes("display")) return "sans-serif";
  return "sans-serif";
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
