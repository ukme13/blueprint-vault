/**
 * Where the studio application lives, from this build's point of view.
 *
 * The mirror of the playground's `lib/docs-url.ts`: the two applications are
 * separate deployments, so the address comes from the environment and falls
 * back to the port `pnpm dev` serves the studio on, which is a local fact
 * rather than a default anybody ships.
 *
 * Only an internal build ever renders it. The footer shows "Open Studio" when
 * the Studio section is in the route list it is handed, and a client build's
 * list never has one. Read from server components only; see
 * `@blueprint/ui/docs-routes` for why that matters.
 */
export const STUDIO_URL =
  process.env.NEXT_PUBLIC_STUDIO_URL ?? "http://localhost:3000";
