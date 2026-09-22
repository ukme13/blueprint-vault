import type { ReactNode } from "react";

/**
 * One section of a documentation page.
 *
 * The frame renders these and the on-page nav lists them, from one array —
 * the same shape as the route list a layer up, and for the same reason. A
 * table of contents written out beside the sections it describes is a second
 * answer to "what is on this page", and the two drift the first time somebody
 * adds a heading.
 *
 * `GuidanceBlock` from the content modules is already this shape, so a page
 * spreads its prose in and appends the sections that carry data.
 *
 * Here rather than in `packages/ui` because it describes this application's
 * pages rather than the design system: nothing outside the documentation has
 * a use for it, and the README's rule is to keep product code in its product
 * until a second one needs it.
 */
export interface PageSection {
  heading: string;
  /** Prose, as a content module writes it. */
  paragraphs?: string[];
  /** A table, a specimen — anything the page renders under the heading. */
  body?: ReactNode;
}

/**
 * A heading as an anchor: "What each step looks like" → "what-each-step-looks-like".
 *
 * The whole heading rather than the first few words of it. Truncating made
 * shorter fragments and cut mid-phrase — `#what-each-step-looks` — which reads
 * like a mistake rather than a shortening. An anchor is followed far more
 * often than it is typed, so length costs less than looking broken.
 *
 * A collision would need two headings on one page matching exactly, which is a
 * heading problem before it is an anchor one.
 */
export function headingSlug(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .split(/\s+/)
    .join("-");
}
