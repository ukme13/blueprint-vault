/**
 * The header bar's height, in pixels.
 *
 * One number for both places that draw the bar, the foundation frame and the
 * Button page's layout, which each had their own 56. The stylesheet needs the
 * same value for the sticky offsets and scroll padding, as
 * `--docs-header-height` in globals.css; CSS cannot read this, so the two are
 * kept in step by hand, and each names the other.
 *
 * 68: Astryx's 16px above, the 28px logo, and 24px below, which is the same
 * 16 plus the 8 of extra space asked for under the content. It was 64 first,
 * on the arithmetic "56 plus 8", and CI measured 16 above and only 20 below:
 * with 16px of Astryx padding each side and 8 more of ours, a 64px bar left
 * a 24px row, and the 28px logo overflowed it downwards, eating half the
 * extra space. At 68 the row is exactly the logo's height.
 */
export const DOCS_HEADER_HEIGHT = 68;
