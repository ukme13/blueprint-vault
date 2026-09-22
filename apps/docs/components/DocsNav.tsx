import {
  SideNav,
  SideNavItem,
  SideNavSection,
} from "@astryxdesign/core/SideNav";
import type { DocsRouteGroup } from "@blueprint/ui";

/**
 * The navigation, generated from the route list.
 *
 * Never written out by hand, and that is the whole reason it exists as a
 * component rather than as markup in the frame. A sidebar holding its own copy
 * of the routes is a second answer to "what does this site have", and the two
 * answers drift the first time somebody adds a page and edits one of them —
 * which for this site means a client's archive linking to a page it does not
 * contain, or containing one it never mentions.
 *
 * It takes the groups rather than fetching them, so what it renders can be
 * tested against a list that has an internal route in it — the real list has
 * none until the studio pages exist, and a test reading that would prove the
 * client build hides the Studio section by describing an empty set. Who gets
 * which rows is `docsRouteGroups`'s decision and is tested where it is made.
 *
 * Plain `href`s rather than Next's `Link`. A handover is opened from a folder
 * over `file://`, and `scripts/handover.ts` rewrites absolute URLs in the
 * exported HTML to relative ones on the way into the archive — which it can do
 * to an anchor's `href` and cannot do to a client-side router's state.
 *
 * See docs/roadmap/studio-guide.md.
 */

interface DocsNavProps {
  /** Already filtered for this build's audience, and already grouped. */
  groups: readonly DocsRouteGroup[];
  /** The current page's path, with no leading slash, or "" for the home page. */
  currentPath: string;
}

export function DocsNav({ groups, currentPath }: DocsNavProps) {
  return (
    <SideNav>
      {groups.map((entry) => (
        <SideNavSection key={entry.group} title={entry.group}>
          {entry.routes.map((route) => (
            <SideNavItem
              href={`/${route.path}`}
              isSelected={route.path === currentPath}
              key={route.path}
              label={route.label}
            />
          ))}
        </SideNavSection>
      ))}
    </SideNav>
  );
}
