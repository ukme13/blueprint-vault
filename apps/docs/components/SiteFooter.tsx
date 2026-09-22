import { Text } from "@astryxdesign/core/Text";
import type { DocsRouteGroup } from "@blueprint/ui/docs-routes";

/**
 * The foot of every page.
 *
 * Two rows, as in the reference: the mark and the site's own links, then a
 * quieter line under a divider. What the rows hold is this system's, not the
 * reference's — there is no blog, no community and no social account to link,
 * and a footer full of dead links is decoration pretending to be navigation.
 *
 * So the links are the routes, out of the same list the sidebar and the
 * archive guard read. A client build's footer has no studio link in it for the
 * same reason its sidebar does not, and neither had to be told separately.
 *
 * The line about the archive is the one thing worth repeating at the bottom of
 * every page: a reader who arrived from a folder rather than a URL is holding
 * a snapshot of one workspace and should know it.
 */

interface SiteFooterProps {
  groups: readonly DocsRouteGroup[];
}

export function SiteFooter({ groups }: SiteFooterProps) {
  return (
    <footer className="site-footer">
      <div className="site-footer-row">
        <span className="site-footer-name">
          <Text type="label" weight="semibold">
            Blueprint
          </Text>
        </span>

        <nav aria-label="Footer" className="site-footer-links">
          {groups.flatMap((group) =>
            group.routes.map((route) => (
              <a href={`/${route.path}`} key={route.path}>
                <Text type="label">{route.label}</Text>
              </a>
            )),
          )}
        </nav>
      </div>

      <p className="site-footer-note">
        <Text color="secondary" type="supporting">
          Generated from a workspace. Every value on these pages comes from the
          system they document.
        </Text>
      </p>
    </footer>
  );
}
