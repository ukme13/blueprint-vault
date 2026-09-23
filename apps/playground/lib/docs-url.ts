import { docsUrl } from "@blueprint/ui";

/**
 * Where the documentation lives, from this build's point of view.
 *
 * The two applications are separate deployments. A literal URL would be wrong
 * in one environment or the other, so the base comes from the environment and
 * falls back to the port `pnpm dev` serves the documentation on — which is a
 * local-development fact rather than a default anybody ships.
 *
 * `NEXT_PUBLIC_` because the link is rendered in the browser, and the value is
 * a public URL: it is inlined into the bundle by design and there is nothing
 * in it to keep. Read as a literal property rather than looked up
 * dynamically, because that is the only form Next can inline.
 *
 * The joining is `docsUrl` in `@blueprint/ui`, where it can be tested. All
 * this file does is answer what the base is, which is the part a test would
 * learn nothing from.
 */
export const DOCS_BASE_URL =
  process.env.NEXT_PUBLIC_DOCS_URL ?? "http://localhost:3001";

/** A path on the documentation site, against this build's base. */
export function docsLink(path: string): string {
  return docsUrl(path, DOCS_BASE_URL);
}
