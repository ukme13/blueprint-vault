/**
 * Every page the documentation application has, and who may see it.
 *
 * One list, read by four things that would otherwise each hold their own copy:
 * the sidebar, the documentation home page, the copy that fills a handover
 * archive, and the guard that checks what that copy did. A route added here
 * appears in all four; a route added to only some of them is the bug this file
 * exists to make impossible.
 *
 * The audience is the interesting field. `apps/docs` is not an internal site —
 * `pnpm handover` builds it and copies it into the archive a client is given —
 * so a page written for whoever operates the studio has to be kept out of that
 * archive, out of the nav the archive's pages render, and out of the home page
 * the archive's root payloads carry. All three come from this list.
 *
 * See docs/roadmap/studio-guide.md.
 */

/**
 * Who a page is for.
 *
 * The narrowest audience allowed to see it, not a list of audiences: `client`
 * means everybody, because anything a client receives is also on the internal
 * site. There is no page an internal reader may not see.
 */
export type DocsAudience = "client" | "internal";

/** The sections the navigation is grouped into, in the order they appear. */
export const DOCS_GROUPS = ["Foundations", "Components", "Studio"] as const;

export type DocsGroup = (typeof DOCS_GROUPS)[number];

export interface DocsRoute {
  /** The path under the app, with no leading or trailing slash. */
  path: string;
  /** The nav label and the card title. Short: it is the accessible name. */
  label: string;
  /** One line under the label, on the home page. */
  description: string;
  group: DocsGroup;
  audience: DocsAudience;
}

/**
 * The pages, in the order a reader should meet them.
 *
 * Colour first because every other foundation refers to it, then the layer
 * over it, then type, then the three scales in the order the scale studio
 * settles them.
 *
 * Nothing under `studio/` yet. Those routes arrive with the pages themselves,
 * so that this list never names a page that would 404 — the nav is generated
 * from here, and a generated nav cannot be told that one of its links is
 * aspirational.
 */
export const DOCS_ROUTES: readonly DocsRoute[] = [
  {
    path: "foundations/colour",
    label: "Colour",
    description:
      "The primitive tracks, on the stable 25-interval scale, as this workspace generated them.",
    group: "Foundations",
    audience: "client",
  },
  {
    path: "foundations/semantic",
    label: "Semantic roles",
    description:
      "What each name means, what it resolves to in both modes, and what the pairs measure.",
    group: "Foundations",
    audience: "client",
  },
  {
    path: "foundations/typography",
    label: "Typography",
    description:
      "The scale, the roles mapped onto it, and the faces they are set in.",
    group: "Foundations",
    audience: "client",
  },
  {
    path: "foundations/spacing",
    label: "Spacing",
    description: "The base unit, the steps counted out from it, and their rem.",
    group: "Foundations",
    audience: "client",
  },
  {
    path: "foundations/radius",
    label: "Radius",
    description:
      "Tokens named by use rather than by size, and the multiplier they scale by.",
    group: "Foundations",
    audience: "client",
  },
  {
    path: "foundations/elevation",
    label: "Elevation",
    description:
      "Composite shadows drawn from one shade, with opacity held per mode.",
    group: "Foundations",
    audience: "client",
  },
  {
    path: "docs/button",
    label: "Button",
    description:
      "Actions, links, loading states, icons, colour schemes, variants, and sizes.",
    group: "Components",
    audience: "client",
  },
];

/** The routes one audience may see, in list order. */
export function docsRoutesFor(audience: DocsAudience): DocsRoute[] {
  return audience === "internal"
    ? [...DOCS_ROUTES]
    : DOCS_ROUTES.filter((route) => route.audience === "client");
}

export interface DocsRouteGroup {
  group: DocsGroup;
  routes: DocsRoute[];
}

/**
 * The same routes, grouped for a sidebar, with empty groups dropped.
 *
 * Dropped rather than rendered empty, because a client build showing a Studio
 * heading with nothing under it would be telling a client there is something
 * they cannot see — which is worse than not mentioning it, and is the same
 * leak in a politer form.
 */
export function docsRouteGroups(audience: DocsAudience): DocsRouteGroup[] {
  const routes = docsRoutesFor(audience);
  return DOCS_GROUPS.map((group) => ({
    group,
    routes: routes.filter((route) => route.group === group),
  })).filter((entry) => entry.routes.length > 0);
}

/**
 * The paths a client may receive, shortest-first and de-duplicated.
 *
 * What the handover guard checks against. Derived rather than written down
 * again: a route whose audience says client and whose path is missing from the
 * archive's allowlist would be a page in the nav that 404s from the folder a
 * client opens.
 */
export function clientRoutePaths(): string[] {
  return docsRoutesFor("client").map((route) => route.path);
}
