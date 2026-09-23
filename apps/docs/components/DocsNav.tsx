import { Text } from "@astryxdesign/core/Text";
import type { DocsRouteGroup } from "@blueprint/ui/docs-routes";

/**
 * The site navigation, generated from the route list.
 *
 * Never written out by hand, which is why it is a component rather than markup
 * in the frame. A sidebar holding its own copy of the routes is a second
 * answer to "what does this site have", and the two drift the first time
 * somebody adds a page and edits one of them — which for this site means a
 * client's archive linking to a page it does not contain.
 *
 * It renders what it is handed and decides nothing. Who gets which rows is
 * `docsRouteGroups`'s call, and is tested where it is made.
 *
 * Groups are `<details>`, open by default, so a reader can fold away the
 * sections they are not in without this needing to be a client component.
 *
 * Plain anchors rather than a router link: a handover is opened from a folder
 * over `file://`, and the relativiser in `scripts/handover.ts` can rewrite an
 * `href` and cannot rewrite a client-side router's state.
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
    <nav aria-label="Documentation" className="docs-nav">
      {groups.map((entry) => (
        <details className="docs-nav-group" key={entry.group} open>
          <summary>
            <Text type="label" weight="semibold">
              {entry.group}
            </Text>
          </summary>
          <ul>
            {entry.routes.map((route) => (
              <li key={route.path}>
                <a
                  aria-current={route.path === currentPath ? "page" : undefined}
                  href={`/${route.path}`}
                >
                  <Text type="label">{route.label}</Text>
                </a>
              </li>
            ))}
          </ul>
        </details>
      ))}
    </nav>
  );
}
