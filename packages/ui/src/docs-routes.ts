import {
  CLIENT_DOCS_ROUTES,
  groupDocsRoutes,
  type DocsAudience,
  type DocsRoute,
  type DocsRouteGroup,
} from "./system/docs-routes";

/**
 * Every page the documentation has, including the ones only we see.
 *
 * Its own entry point, not the package root, and for the same reason the
 * scanner has one: what a module can reach decides where it can end up. Every
 * client component in `apps/docs` imports `@blueprint/ui` — the theme control,
 * the theme provider, the mode hook, the Button page — so anything the barrel
 * re-exports is reachable from the browser bundle whether or not a browser
 * ever asks for it.
 *
 * That was measured rather than assumed. With the route list in the barrel, a
 * throwaway internal route was built into a client handover and its label came
 * back out of a shared chunk, `_next/static/chunks/911-…js`, while every page
 * of it had been correctly held back. The pages obeyed the allowlist; the data
 * travelled by a different road.
 *
 * So the split is by audience, and it matches what each side needs to know.
 * `system/docs-routes` holds what a **client** may receive, which is what the
 * archive guard checks against and what the nav renders in a client build —
 * all of it published to that client anyway. This file adds the rows a client
 * never sees. Import it from a server component, a test or a build script; if
 * it is ever imported from a component with `"use client"` at the top, the
 * split has been undone and nothing will say so.
 *
 * See docs/roadmap/studio-guide.md.
 */

/**
 * The studio guide.
 *
 * Kept apart from the client rows rather than marked within them, because a
 * marker in a shared array still ships the array. There is no page here an
 * internal reader may not see, so this file plus the client rows is the whole
 * site.
 */
export const INTERNAL_DOCS_ROUTES: readonly DocsRoute[] = [
  {
    path: "studio",
    label: "Getting started",
    description:
      "What the studio is for, what it keeps and where, and what each of its nine routes does.",
    group: "Studio",
    audience: "internal",
  },
  {
    path: "studio/guides/anchors",
    label: "Anchors",
    description:
      "Keeping an exact brand colour inside a generated ramp, without breaking the row around it.",
    group: "Studio",
    audience: "internal",
  },
  {
    path: "studio/guides/semantic-tokens",
    label: "Semantic tokens and alpha",
    description:
      "Naming colours by what they are for, one reference per mode, and what transparency does to a contrast number.",
    group: "Studio",
    audience: "internal",
  },
  {
    path: "studio/guides/typography",
    label: "Typography studio",
    description:
      "Three numbers make a scale; roles make it useful. Fonts, line height, and judging a scale in two scripts.",
    group: "Studio",
    audience: "internal",
  },
  {
    path: "studio/guides/spacing-and-radius",
    label: "Spacing, radius and elevation",
    description:
      "The third of a system that is not colour or type: counting rather than multiplying, names rather than sizes.",
    group: "Studio",
    audience: "internal",
  },
  {
    path: "studio/guides/accessibility",
    label: "Simulation and accessibility",
    description:
      "What the contrast numbers mean, what the Vision chip does, and which pairs collapse for whom.",
    group: "Studio",
    audience: "internal",
  },
  {
    path: "studio/guides/export",
    label: "Export and handover",
    description:
      "Five formats, the one file that is your work, and the archive a client receives.",
    group: "Studio",
    audience: "internal",
  },
];

/** Every route, client rows first, in reading order. */
export const DOCS_ROUTES: readonly DocsRoute[] = [
  ...CLIENT_DOCS_ROUTES,
  ...INTERNAL_DOCS_ROUTES,
];

/** The routes one audience may see, in list order. */
export function docsRoutesFor(audience: DocsAudience): DocsRoute[] {
  return audience === "internal" ? [...DOCS_ROUTES] : [...CLIENT_DOCS_ROUTES];
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
  return groupDocsRoutes(docsRoutesFor(audience));
}

export type {
  DocsAudience,
  DocsGroup,
  DocsRoute,
  DocsRouteGroup,
} from "./system/docs-routes";
