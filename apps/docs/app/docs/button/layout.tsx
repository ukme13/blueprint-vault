import type { Metadata } from "next";
import type { ReactNode } from "react";
import {
  Layout,
  LayoutContent,
  LayoutHeader,
  LayoutPanel,
} from "@astryxdesign/core/Layout";
import { docsRouteGroups } from "@blueprint/ui/docs-routes";
import { DocsNav } from "../../../components/DocsNav";
import { SiteHeader } from "../../../components/SiteHeader";
import { docsAudience } from "../../../lib/audience";
import { DOCS_HEADER_HEIGHT } from "../../../lib/header";
import { activeDocsGroup, docsSections, sidebarGroups } from "../../../lib/nav";

const PATH = "docs/button";

export const metadata: Metadata = {
  title: "Button",
  description:
    "Blueprint Button usage, interactive examples, variants, sizes, and API reference.",
};

/**
 * The Button page, with the mode control the rest of the documentation has.
 *
 * The page below it is written in fixed Tailwind utilities and does not follow
 * the mode — it predates the semantic layer and stage 4's scanner is what will
 * find it. The Buttons on it do follow, which is the thing worth being able to
 * check: six schemes by six variants, both modes, on one screen.
 *
 * The nav panel arrived later than the page did. This route is in the route
 * list, so it was in every other page's sidebar while being the one page you
 * could not leave — a dead end reachable from everywhere. The frame is written
 * out here rather than borrowed from `FoundationsFrame`, which caps its column
 * for prose; this page is a specimen board and fills the width it is given.
 */
export default function ButtonDocsLayout({
  children,
}: {
  children: ReactNode;
}) {
  const groups = docsRouteGroups(docsAudience());

  return (
    <Layout
      /* The same header as the framed pages, so Components is marked and the
         other sections are one click away. Without it the header's
         Components link landed on the one page with no header to leave by.
         The theme control that sat in the content's corner now comes with
         it, as it does everywhere else. */
      header={
        <LayoutHeader hasDivider height={DOCS_HEADER_HEIGHT}>
          <SiteHeader
            activeGroup={activeDocsGroup(groups, PATH)}
            sections={docsSections(groups)}
          />
        </LayoutHeader>
      }
      height="auto"
      start={
        <LayoutPanel
          hasDivider
          label="Documentation"
          role="navigation"
          width={260}
        >
          <DocsNav currentPath={PATH} groups={sidebarGroups(groups, PATH)} />
        </LayoutPanel>
      }
    >
      <LayoutContent>{children}</LayoutContent>
    </Layout>
  );
}
