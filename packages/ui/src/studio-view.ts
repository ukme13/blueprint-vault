/**
 * A studio's view and tab, kept in the URL so the browser's Back, Forward and
 * refresh are the studio's own, and remembered per studio so the sidebar can
 * take somebody back to where they were working.
 *
 * Pure, so it is tested without a browser: the app binds these to
 * `useSearchParams` and `history.pushState`.
 */

/**
 * The view a query value names, or the fallback.
 *
 * A stale or hand-edited URL must not put a studio in a view it does not
 * have, so anything outside `allowed` is the default rather than an error.
 */
export function studioViewParam<T extends string>(
  raw: string | null,
  allowed: readonly T[],
  fallback: T,
): T {
  return allowed.find((each) => each === raw) ?? fallback;
}

/**
 * The query string with one parameter set, the others kept.
 *
 * A value equal to its default is dropped rather than written, so the
 * studio's opening state stays a clean `/typography` and only a departure
 * from it shows in the address.
 */
export function withStudioParam(
  search: string,
  key: string,
  value: string,
  fallback: string,
): string {
  const params = new URLSearchParams(search);
  if (value === fallback) params.delete(key);
  else params.set(key, value);
  return params.toString();
}

/**
 * The query string without some parameters, the others kept.
 *
 * For a parameter that belongs to one view of a studio, such as the group a
 * table is filtered to, so that leaving the view leaves it out of the address.
 */
export function withoutStudioParams(
  search: string,
  keys: readonly string[],
): string {
  const params = new URLSearchParams(search);
  for (const key of keys) params.delete(key);
  return params.toString();
}

/** Each studio's last non-default query, by its path: `{ "/typography": "view=specimen" }`. */
export type StudioViewMemory = Readonly<Record<string, string>>;

/**
 * The memory after a studio's query is seen.
 *
 * An empty query is the studio's defaults, so it clears the entry: coming
 * back opens the studio as it opens, not on a departure long since undone.
 */
export function rememberStudioView(
  memory: StudioViewMemory,
  path: string,
  search: string,
): StudioViewMemory {
  const query = search.replace(/^\?/, "");
  const { [path]: previous, ...rest } = memory;
  if (query === "") return previous === undefined ? memory : rest;
  return previous === query ? memory : { ...rest, [path]: query };
}

/** A studio's link: its path, with the query it was last left on. */
export function studioHref(memory: StudioViewMemory, path: string): string {
  const query = memory[path];
  return query ? `${path}?${query}` : path;
}
