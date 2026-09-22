import { BlueprintWordmark } from "@blueprint/ui";
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
export function SiteHeader() {
  return (
    <div className="site-header">
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

      <div className="site-header-actions">
        <ThemeControl />
      </div>
    </div>
  );
}
