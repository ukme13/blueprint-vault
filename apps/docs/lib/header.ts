/**
 * The header bar's height, in pixels.
 *
 * One number for both places that draw the bar, the foundation frame and the
 * Button page's layout, which each had their own 56. The stylesheet needs the
 * same value for the sticky offsets and scroll padding, as
 * `--docs-header-height` in globals.css; CSS cannot read this, so the two are
 * kept in step by hand, and each names the other.
 *
 * 56 for the bar plus 8 of extra space under the content.
 */
export const DOCS_HEADER_HEIGHT = 64;
