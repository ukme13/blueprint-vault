import { Text } from "@astryxdesign/core/Text";
import type { DocsRouteGroup } from "@blueprint/ui/docs-routes";
import { footerLinks } from "../lib/nav";
import { STUDIO_URL } from "../lib/studio-url";

/**
 * The foot of every page.
 *
 * Two rows, as in the reference: the mark and the site's own links, then a
 * quieter line under a divider. What the rows hold is this system's, not the
 * reference's — there is no blog, no community and no social account to link,
 * and a footer full of dead links is decoration pretending to be navigation.
 *
 * The links used to be every route, which at fourteen was a second sidebar.
 * Now an internal reader gets three destinations — Getting started, What's
 * new, and the studio itself — and a client gets the sections it was sent.
 * Both come out of the same audience-filtered list the sidebar and the
 * archive guard read, so a client build's footer has no studio link in it for
 * the same reason its sidebar does not. See `footerLinks`.
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

        {/* Three destinations for an internal reader, and a client's own
            sections for a client: see `footerLinks`. The studio opens in a new
            tab, as the studio opens this guide, because it is the other
            application rather than a page of this one. */}
        <nav aria-label="Footer" className="site-footer-links">
          {footerLinks(groups, STUDIO_URL).map((link) => (
            <a
              href={link.href}
              key={link.href}
              {...(link.isExternal
                ? { rel: "noreferrer", target: "_blank" }
                : {})}
            >
              <Text type="label">{link.label}</Text>
            </a>
          ))}
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
