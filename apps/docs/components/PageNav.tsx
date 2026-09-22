import { List } from "@astryxdesign/core/List";
import { Item } from "@astryxdesign/core/Item";
import { headingSlug, type PageSection } from "../lib/sections";

/**
 * What is on this page, as links.
 *
 * Built from the same array the frame renders the sections from, so a heading
 * cannot appear in one and not the other. Rows rather than cards, per the
 * layout guide: this is dense navigation, not a set of widgets.
 *
 * No scroll spy, and no item marked current. Marking one would take a client
 * component watching the viewport, and a wrong highlight is worse than none —
 * a reader who has scrolled past three headings and is told they are still in
 * the first learns to stop trusting the column. Worth adding later; not worth
 * faking now.
 *
 * Plain fragment anchors, which work in a handover opened from a folder. The
 * relativiser in `scripts/handover.ts` rewrites absolute paths and leaves a
 * `#` alone, so these behave the same served or unserved.
 */

interface PageNavProps {
  sections: readonly PageSection[];
}

export function PageNav({ sections }: PageNavProps) {
  if (sections.length === 0) return null;

  return (
    <nav aria-label="On this page">
      <List density="compact" header="On this page">
        {sections.map((section) => (
          <Item
            as="li"
            href={`#${headingSlug(section.heading)}`}
            key={section.heading}
            label={section.heading}
          />
        ))}
      </List>
    </nav>
  );
}
