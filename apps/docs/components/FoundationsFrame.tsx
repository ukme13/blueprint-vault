import { Heading } from "@astryxdesign/core/Heading";
import {
  Layout,
  LayoutContent,
  LayoutHeader,
  LayoutPanel,
} from "@astryxdesign/core/Layout";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { docsRouteGroups } from "@blueprint/ui/docs-routes";
import { docsAudience } from "../lib/audience";
import { headingSlug, type PageSection } from "../lib/sections";
import { DocsNav } from "./DocsNav";
import { PageNav } from "./PageNav";
import { Prose } from "./Prose";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

/**
 * The frame every documentation page sits in.
 *
 * Four regions and a footer: a 56px header, 260px of site navigation, a
 * content column, and 240px listing what is on this page. Astryx's `Layout`
 * has a slot for each; the sticking and the breakpoints are in `globals.css`,
 * because those are the parts `Layout` leaves open.
 *
 * The page scrolls, not a box inside it. `height="auto"` lets the shell grow
 * and the document own the scrollbar, which is what makes `scroll-behavior:
 * smooth` mean anything — a fragment link inside a scroll container is the
 * container's business and the declaration on `html` never reaches it. The
 * header and the two nav columns stick; everything else moves.
 *
 * So the footer is inside the content column rather than in a slot of its own.
 * A footer in a region is a bar pinned under the page; a footer at the end of
 * the reading is the end of the reading.
 *
 * The content column is capped and the prose inside it is capped again —
 * tighter. A measure is a count of characters and belongs to the paragraph; a
 * token table with both modes across it wants every pixel the column has. One
 * cap over both is what made the old 960 frame wrong in two directions at
 * once.
 *
 * The frame renders the sections rather than taking them as children, which is
 * what lets the on-page nav exist at all. One array, two readers — a table of
 * contents written out beside the sections it describes drifts from them.
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
  const groups = docsRouteGroups(docsAudience());

  return (
    <Layout
      end={
        <LayoutPanel className="toc-panel" label="On this page" width={240}>
          {/* Strings only. A section carries a rendered `body`, and a node
              cannot cross into a client component. */}
          <PageNav headings={sections.map((section) => section.heading)} />
        </LayoutPanel>
      }
      header={
        <LayoutHeader hasDivider height={56}>
          <SiteHeader />
        </LayoutHeader>
      }
      height="auto"
      start={
        <LayoutPanel
          className="sidebar-panel"
          hasDivider
          label="Documentation"
          width={260}
        >
          <DocsNav currentPath={path} groups={groups} />
        </LayoutPanel>
      }
    >
      {/* A main landmark, which this frame did without: the content region
          rendered as an unnamed box, so a screen-reader user had a header,
          two navs and a footer with no way to say "skip to the content". */}
      <LayoutContent label={title} padding={6} role="main">
        <div className="doc-column">
          {/* 8 between sections and 4 within, which is 32px and 16px on this
              scale — the reference's two spacings, and far enough apart that
              a paragraph break reads as smaller than a section break. The
              first pass used 24 and 12 and ran the two together. */}
          <VStack gap={8}>
            <header className="page-head">
              <VStack gap={2}>
                <Heading level={1}>{title}</Heading>
                <Text as="p" color="secondary" display="block" type="large">
                  {summary}
                </Text>
              </VStack>
            </header>

            {sections.map((section) => {
              const id = headingSlug(section.heading);
              return (
                /* The id sits on the section rather than on the heading.
                   Astryx's Heading takes no id, and a section is the better
                   anchor anyway — jumping to it lands a reader at the top of
                   the block rather than on its first line. It is also what the
                   scroll spy observes. */
                <section
                  aria-label={section.heading}
                  id={id}
                  key={section.heading}
                >
                  <VStack gap={4}>
                    <Heading level={2}>{section.heading}</Heading>
                    {(section.paragraphs ?? []).map((paragraph) => (
                      <Prose key={paragraph}>{paragraph}</Prose>
                    ))}
                    {section.body}
                  </VStack>
                </section>
              );
            })}

            <SiteFooter groups={groups} />
          </VStack>
        </div>
      </LayoutContent>
    </Layout>
  );
}
