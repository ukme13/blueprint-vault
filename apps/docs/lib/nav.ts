import type { DocsGroup, DocsRouteGroup } from "@blueprint/ui/docs-routes";

/**
 * The site's sections, and which one a page belongs to.
 *
 * Everything here is worked out from the route groups a page is handed, which
 * are already filtered for this build's audience. Nothing names a section or
 * a path by hand, so a client build — whose groups have no Studio — cannot
 * produce a Studio link, and a page added to the route list reaches the
 * header, the sidebar and the footer without anybody editing this file.
 */

export interface DocsSection {
  group: DocsGroup;
  /** The section's first page, which is where its header link goes. */
  href: string;
}

export interface FooterLink {
  label: string;
  href: string;
  /** Another application, so a new tab rather than a page of this site. */
  isExternal: boolean;
}

/** One header link per group, pointing at the group's first page. */
export function docsSections(groups: readonly DocsRouteGroup[]): DocsSection[] {
  return groups
    .filter((entry) => entry.routes.length > 0)
    .map((entry) => ({
      group: entry.group,
      href: `/${entry.routes[0]!.path}`,
    }));
}

/** The group a page belongs to, or undefined for a page in none. */
export function activeDocsGroup(
  groups: readonly DocsRouteGroup[],
  currentPath: string,
): DocsGroup | undefined {
  return groups.find((entry) =>
    entry.routes.some((route) => route.path === currentPath),
  )?.group;
}

/**
 * The sidebar for one page: its own section only.
 *
 * A page in no section, which today is none of the framed pages, gets every
 * group rather than an empty sidebar.
 */
export function sidebarGroups(
  groups: readonly DocsRouteGroup[],
  currentPath: string,
): DocsRouteGroup[] {
  const active = activeDocsGroup(groups, currentPath);
  if (active === undefined) return [...groups];
  return groups.filter((entry) => entry.group === active);
}

/** Internal pages the footer points at, by path, when this build has them. */
const FOOTER_PAGES = ["studio", "studio/whats-new"] as const;

/**
 * The footer's links.
 *
 * An internal build gets three: Getting started, What's new, and the studio
 * itself. A client build has none of those — its route list holds no Studio
 * pages and it must not link to a tool it does not receive — so it gets one
 * link per section it does have, which is the whole of what it was sent.
 */
export function footerLinks(
  groups: readonly DocsRouteGroup[],
  studioUrl: string,
): FooterLink[] {
  const routes = groups.flatMap((entry) => entry.routes);
  const hasStudio = groups.some((entry) => entry.group === "Studio");
  if (!hasStudio) {
    return docsSections(groups).map((section) => ({
      label: section.group,
      href: section.href,
      isExternal: false,
    }));
  }
  const pages = FOOTER_PAGES.flatMap((path) => {
    const route = routes.find((each) => each.path === path);
    return route
      ? [{ label: route.label, href: `/${route.path}`, isExternal: false }]
      : [];
  });
  return [
    ...pages,
    { label: "Open Studio", href: studioUrl, isExternal: true },
  ];
}
