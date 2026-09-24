import { Text } from "@astryxdesign/core/Text";
import { BlueprintWordmark } from "@blueprint/ui";
import type { DocsGroup, DocsRouteGroup } from "@blueprint/ui/docs-routes";
import type { DocsSection } from "../lib/nav";
import { MobileMenu } from "./MobileMenu";
import { ThemeControl } from "./ThemeControl";

/**
 * The bar across the top of every page.
 *
 * The mark is the studio's own, out of `@blueprint/ui` rather than the SVG in
 * `public/`: that file is `fill="black"` and would sit in a dark page as a
 * black rectangle, where the component is `currentColor` and follows whatever
 * the header sets. Same drawing, one copy, both modes.
 *
 * Named destinations only. The reference this was built from carries a product
 * nav — Docs, Components, Templates, Themes, Playground — and this site has
 * two of those things, so it says two. A header listing routes that do not
 * exist is the kind of scaffolding that ships and then gets explained.
 *
 * The mode control lives here rather than on each page, because the mode is
 * the reader's and not the page's — the same reason the studio has one.
 */
interface SiteHeaderProps {
  /** One per group this build's reader receives; see `docsSections`. */
  sections: readonly DocsSection[];
  /** The section the current page is in, if it is in one. */
  activeGroup?: DocsGroup;
  /** Every group, for the drawer a narrow screen navigates by. */
  groups: readonly DocsRouteGroup[];
  /** The current page's path, so the drawer can mark it. No leading slash. */
  path: string;
}

export function SiteHeader({
  sections,
  activeGroup,
  groups,
  path,
}: SiteHeaderProps) {
  return (
    <div className="site-header">
      {/* One cell, two things. The bar is a three-column grid and the toggle
          was added as a fourth child — which pushed the theme control into an
          implicit second row, 20px below a bar with a fixed height, on top of
          the first paragraph. Grouping it with the mark keeps the grid three
          wide. */}
      <div className="site-header-start">
        <MobileMenu currentPath={path} groups={groups} />
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages --
            A plain anchor on purpose, as in DocsNav. These pages ship inside a
            handover and are opened from a folder over file://, where there is
            no server for a router to ask. `scripts/handover.ts` rewrites an
            absolute href to a relative one on the way into the archive; it
            cannot rewrite a client-side router. The rule is right about an
            ordinary Next app and wrong about this one. */}
        <a aria-label="Blueprint documentation" className="site-mark" href="/">
          <BlueprintWordmark className="site-mark-wordmark" />
        </a>
      </div>

      {/* The site's sections, centred. Built from the audience-filtered
          route groups, so a client build has no Studio link to render. Plain
          anchors for the same file:// reason as the mark above. aria-current
          is "true" rather than "page": the link marks the section a page is
          in, and the section's first page is only one of them. */}
      {sections.length > 0 ? (
        <nav
          aria-label="Sections"
          className="site-sections flex items-center gap-1 overflow-x-auto"
        >
          {sections.map((section) => (
            <a
              aria-current={section.group === activeGroup ? "true" : undefined}
              className="rounded-element px-3 py-1.5 whitespace-nowrap text-fg-secondary hover:text-fg-primary aria-[current=true]:bg-surface-subtle aria-[current=true]:text-fg-primary"
              href={section.href}
              key={section.group}
            >
              <Text type="label" weight="semibold">
                {section.group}
              </Text>
            </a>
          ))}
        </nav>
      ) : null}

      <div className="site-header-actions">
        <ThemeControl />
      </div>
    </div>
  );
}
