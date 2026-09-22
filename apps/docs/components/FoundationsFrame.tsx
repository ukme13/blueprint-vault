import type { ReactNode } from "react";
import { Heading } from "@astryxdesign/core/Heading";
import {
  Layout,
  LayoutContent,
  LayoutHeader,
  LayoutPanel,
} from "@astryxdesign/core/Layout";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { HStack } from "@astryxdesign/core/HStack";
import { docsRouteGroups } from "@blueprint/ui/docs-routes";
import { docsAudience } from "../lib/audience";
import { DocsNav } from "./DocsNav";
import { ThemeControl } from "./ThemeControl";

/**
 * The frame every foundation page sits in.
 *
 * `Layout` with a header, a navigation panel and a capped content column.
 * The cap keeps a line of prose readable and the tables inside it are dense
 * and fill the column.
 *
 * The panel is a second region, which this frame deliberately did without
 * while there were six pages and no way between them. The layout guide's rule
 * is to default to `SideNav` once a site has destinations a reader has to
 * find, and the studio guide takes this one past that — so the budget is now
 * two regions, 260px of nav and a 960px column, both written down here rather
 * than negotiated at render time.
 *
 * The theme control lives here rather than on each page, because the mode is
 * the reader's and not the page's — the same reason the studio has one.
 */

interface FoundationsFrameProps {
  title: string;
  summary: string;
  /** This page's own path, so the nav can mark it. No leading slash. */
  path: string;
  children: ReactNode;
}

export function FoundationsFrame({
  title,
  summary,
  path,
  children,
}: FoundationsFrameProps) {
  return (
    <Layout
      contentWidth={960}
      height="auto"
      start={
        <LayoutPanel
          hasDivider
          label="Documentation"
          role="navigation"
          width={260}
        >
          <DocsNav
            currentPath={path}
            groups={docsRouteGroups(docsAudience())}
          />
        </LayoutPanel>
      }
      header={
        <LayoutHeader hasDivider>
          <HStack gap={4} hAlign="between" vAlign="center">
            <Text type="label" weight="semibold">
              Blueprint foundations
            </Text>
            <ThemeControl />
          </HStack>
        </LayoutHeader>
      }
    >
      <LayoutContent padding={6}>
        <VStack gap={6}>
          <VStack gap={2}>
            <Heading level={1}>{title}</Heading>
            <Text as="p" color="secondary" display="block" type="large">
              {summary}
            </Text>
          </VStack>
          {children}
        </VStack>
      </LayoutContent>
    </Layout>
  );
}
