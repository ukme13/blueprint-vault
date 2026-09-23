/**
 * Every page the documentation application has, and who may see it.
 *
 * The half of the list a client receives, and the shapes both halves share.
 *
 * Read by four things that would otherwise each hold their own copy: the
 * sidebar, the documentation home page, the copy that fills a handover
 * archive, and the guard that checks what that copy did.
 *
 * The rows a client never sees are in `@blueprint/ui/docs-routes`, which is
 * its own entry point rather than part of this barrel. That file says why, and
 * the short version is that every client component in `apps/docs` imports
 * this package, so anything the barrel re-exports can reach a browser bundle
 * whether or not a browser asks for it. What is here is published to a client
 * anyway, so it is safe where it sits.
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
 * The pages a client receives, in the order a reader should meet them.
 *
 * Colour first because every other foundation refers to it, then the layer
 * over it, then type, then the three scales in the order the scale studio
 * settles them.
 */
export const CLIENT_DOCS_ROUTES: readonly DocsRoute[] = [
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

export interface DocsRouteGroup {
  group: DocsGroup;
  routes: DocsRoute[];
}

/**
 * Any list of routes, grouped for a sidebar, with empty groups dropped.
 *
 * Takes the rows rather than an audience, because the audience-aware list
 * lives in the other entry point — this has to work for a caller holding only
 * the client half and for one holding both.
 *
 * Dropped rather than rendered empty, because a client build showing a Studio
 * heading with nothing under it would be telling a client there is something
 * they cannot see — which is worse than not mentioning it, and is the same
 * leak in a politer form.
 */
export function groupDocsRoutes(
  routes: readonly DocsRoute[],
): DocsRouteGroup[] {
  return DOCS_GROUPS.map((group) => ({
    group,
    routes: routes.filter((route) => route.group === group),
  })).filter((entry) => entry.routes.length > 0);
}

/**
 * The paths a client may receive.
 *
 * What the handover guard checks against. Derived rather than written down
 * again: a route in a client's nav whose path is missing from the archive's
 * allowlist would be a link to a folder that is not there.
 */
export function clientRoutePaths(): string[] {
  return CLIENT_DOCS_ROUTES.map((route) => route.path);
}
