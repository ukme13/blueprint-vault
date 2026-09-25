/**
 * Naming for the token lists an author can add to: layout uses, elevation
 * levels.
 *
 * A name is also a variable (`Hero inset` exports `--hero-inset`), so two
 * entries must never share one, and a name that reads as another's must not
 * sit beside it either. "Input radius" and "radius input" are one name to a
 * reader, and `--input-radius` beside `--radius-input` is a duplicate in
 * all but spelling.
 */

/** The id a name exports as: lowercase words joined by hyphens. */
export function tokenIdFromName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * What a name is called, whatever its case, order or separators: the words,
 * lowercased and sorted. "Input radius", "RADIUS-INPUT" and `radius-input`
 * share one key.
 */
export function tokenNameKey(nameOrId: string): string {
  return nameOrId
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .sort()
    .join(" ");
}

/**
 * A name and id nothing taken reads as: the one asked for, or it with the
 * lowest free number after it ("Input radius 2", `input-radius-2`). A clash
 * is numbered rather than refused, because a refused rename looks like a
 * field that did not save; the number says the name was taken.
 *
 * `taken` is every id and name the result must not collide with, the
 * caller's own entry left out. `fallbackId` names an entry whose name has no
 * letters or digits to make an id from.
 */
export function uniqueTokenName(
  wanted: string,
  taken: { ids: Iterable<string>; names: Iterable<string> },
  fallbackId: string,
): { id: string; name: string } {
  const ids = new Set(taken.ids);
  const keys = new Set(
    [...ids, ...taken.names].map((each) => tokenNameKey(each)),
  );
  const idOf = (name: string) => tokenIdFromName(name) || fallbackId;
  const fits = (name: string) =>
    !ids.has(idOf(name)) &&
    !keys.has(tokenNameKey(name)) &&
    !keys.has(tokenNameKey(idOf(name)));
  if (fits(wanted)) return { id: idOf(wanted), name: wanted };
  let suffix = 2;
  while (!fits(`${wanted} ${suffix}`)) suffix += 1;
  const name = `${wanted} ${suffix}`;
  return { id: idOf(name), name };
}
