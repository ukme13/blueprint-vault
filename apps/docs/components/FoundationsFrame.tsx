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
import { headingSlug, type PageSection } from "../lib/sections";
import { DocsNav } from "./DocsNav";
import { PageNav } from "./PageNav";
import { Prose } from "./Prose";
import { ThemeControl } from "./ThemeControl";

/**
 * The frame every documentation page sits in.
 *
 * Three regions, budgeted here rather than negotiated at render time: 260px of
 * site navigation, a content column that fills what is left, and 240px listing
 * what is on the page. The Button page settled the middle one — a specimen
 * board of six schemes by six variants had nothing to gain from a 960px cap
 * and a lot to lose, and the tables on every other page are the same argument.
 * Prose inside a filled column is handled where prose is: `Prose` caps its own
 * measure, so a paragraph stays readable while a table beside it spreads.
 *
 * The frame renders the sections rather than taking them as children, which is
 * what lets the on-page nav exist at all. One array, two readers — the same
 * shape as the route list, and the same reason: a table of contents written
 * out beside the sections it describes is a second answer to what is on this
 * page.
 *
 * The theme control lives here rather than on each page, because the mode is
 * the reader's and not the page's — the same reason the studio has one.
 *
 * See docs/roadmap/studio-guide.md.
 */

interface FoundationsFrameProps {
  title: string;
  summary: string;
  /** This page's own path, so the site nav can mark it. No leading slash. */
  path: string;
  /** Everything under the title, in order, headings included. */
  sections: readonly PageSection[];
}

export function FoundationsFrame({
  title,
  summary,
  path,
  sections,
}: FoundationsFrameProps) {
  return (
    <Layout
      end={
        <LayoutPanel hasDivider label="On this page" width={240}>
          <PageNav sections={sections} />
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
    >
      <LayoutContent padding={6}>
        <VStack gap={6}>
          <VStack gap={2}>
            <Heading level={1}>{title}</Heading>
            <Text as="p" color="secondary" display="block" type="large">
              {summary}
            </Text>
          </VStack>

          {sections.map((section) => {
            const id = headingSlug(section.heading);
            return (
              /* The id sits on the section rather than on the heading.
                 Astryx's Heading takes no id, and a section is the better
                 anchor anyway — jumping to it lands a reader at the top of
                 the block rather than on its first line. */
              <section
                aria-label={section.heading}
                id={id}
                key={section.heading}
              >
                <VStack gap={3}>
                  <Heading level={2}>{section.heading}</Heading>
                  {(section.paragraphs ?? []).map((paragraph) => (
                    <Prose key={paragraph}>{paragraph}</Prose>
                  ))}
                  {section.body}
                </VStack>
              </section>
            );
          })}
        </VStack>
      </LayoutContent>
    </Layout>
  );
}
