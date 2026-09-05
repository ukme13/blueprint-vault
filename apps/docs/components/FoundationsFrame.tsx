import type { ReactNode } from "react";
import { Heading } from "@astryxdesign/core/Heading";
import { Layout, LayoutContent, LayoutHeader } from "@astryxdesign/core/Layout";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { HStack } from "@astryxdesign/core/HStack";
import { ThemeControl } from "./ThemeControl";

/**
 * The frame every foundation page sits in.
 *
 * `Layout` with a header and a capped content column, per the layout guide:
 * this is a document rather than a tool, so the region budget is one column
 * and the cap keeps a line of prose readable. The tables inside it are dense
 * and fill the column.
 *
 * The theme control lives here rather than on each page, because the mode is
 * the reader's and not the page's — the same reason the studio has one.
 */

interface FoundationsFrameProps {
  title: string;
  summary: string;
  children: ReactNode;
}

export function FoundationsFrame({
  title,
  summary,
  children,
}: FoundationsFrameProps) {
  return (
    <Layout
      contentWidth={960}
      height="auto"
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
