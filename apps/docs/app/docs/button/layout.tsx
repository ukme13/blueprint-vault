import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Layout, LayoutContent, LayoutPanel } from "@astryxdesign/core/Layout";
import { docsRouteGroups } from "@blueprint/ui/docs-routes";
import { DocsNav } from "../../../components/DocsNav";
import { docsAudience } from "../../../lib/audience";
import { ThemeControl } from "../../../components/ThemeControl";

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
  return (
    <Layout
      height="auto"
      start={
        <LayoutPanel
          hasDivider
          label="Documentation"
          role="navigation"
          width={260}
        >
          <DocsNav
            currentPath="docs/button"
            groups={docsRouteGroups(docsAudience())}
          />
        </LayoutPanel>
      }
    >
      <LayoutContent>
        <div className="flex justify-end px-6 pt-6">
          <ThemeControl />
        </div>
        {children}
      </LayoutContent>
    </Layout>
  );
}
