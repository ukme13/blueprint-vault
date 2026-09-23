/**
 * A path on the documentation site, as an absolute URL.
 *
 * Here rather than in the application that calls it, because it is a pure
 * function and the playground has no unit tests to check it with — which the
 * repository's own rule names as the sign that a piece of logic is sitting in
 * the wrong workspace. What stays in the application is reading the
 * environment, which is the part no test would learn anything from.
 *
 * Trims a trailing slash off the base: a base configured as
 * `https://docs.example.com/` would otherwise produce a double slash, which
 * works everywhere and looks like a bug to everybody.
 */
export function docsUrl(path: string, base: string): string {
  const root = base.replace(/\/+$/, "");
  const route = path.replace(/^\/+/, "");
  return route === "" ? root : `${root}/${route}`;
}
