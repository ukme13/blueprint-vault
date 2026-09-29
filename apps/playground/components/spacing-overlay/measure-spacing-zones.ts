import {
  gapBands,
  paddingBands,
  type OverlayRect,
  type SpacingBand,
} from "@blueprint/ui";
import styles from "../preview/landing.module.css";

/** The layout uses the landing reads, the two a badge can rebind. */
export type LayoutUseId = "inset-container" | "gap-section";

export interface SpacingZone {
  key: string;
  kind: "inset" | "gap";
  band: SpacingBand;
  /** The layout use this space is sized by, when it is one. */
  use: LayoutUseId | null;
  /** One tag per element and kind, on its first band, not one per band. */
  hasBadge: boolean;
}

/* Space inside a control is the control's own, not the page's layout. */
const SKIP =
  "button, a, input, textarea, select, label, svg, [data-spacing-overlay]";

function px(value: string): number {
  const number = parseFloat(value);
  return Number.isFinite(number) ? number : 0;
}

/**
 * Every padding and gap on the landing, measured from the DOM and placed in
 * the site's own scrolled coordinates, so an overlay laid inside the site
 * scrolls with it.
 *
 * Which layout use a space belongs to is read from the landing's classes:
 * a `.wrap` or the nav's inner row is padded by Container inset; a band of
 * the page, the footer included, is padded by Section gap; the hero and the
 * split sections are spaced by it. Everything else is drawn and tagged, and
 * is not the workspace's to change here.
 */
export function measureSpacingZones(site: HTMLElement): SpacingZone[] {
  const origin = site.getBoundingClientRect();
  const local = (rect: DOMRect): OverlayRect => ({
    x: rect.left - origin.left + site.scrollLeft,
    y: rect.top - origin.top + site.scrollTop,
    width: rect.width,
    height: rect.height,
  });
  const zones: SpacingZone[] = [];

  site.querySelectorAll<HTMLElement>("*").forEach((element, index) => {
    if (element.closest(SKIP)) return;
    const css = getComputedStyle(element);
    if (css.display === "none" || css.display === "contents") return;
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const box = local(rect);
    const classes = element.classList;

    const insetUse: LayoutUseId | null =
      classes.contains(styles.wrap!) || classes.contains(styles.navInner!)
        ? "inset-container"
        : element.parentElement?.classList.contains(styles.main!) ||
            classes.contains(styles.footer!)
          ? "gap-section"
          : null;
    const insets = paddingBands(box, {
      top: px(css.paddingTop),
      right: px(css.paddingRight),
      bottom: px(css.paddingBottom),
      left: px(css.paddingLeft),
    });
    insets.forEach((band, side) => {
      /* A wrap's inset is its inline padding; a band's is its block. */
      const use =
        insetUse === "inset-container"
          ? band.axis === "inline"
            ? insetUse
            : null
          : insetUse === "gap-section" && band.axis === "block"
            ? insetUse
            : null;
      zones.push({
        key: `${index}-inset-${side}`,
        kind: "inset",
        band,
        use,
        hasBadge: side === 0,
      });
    });

    if (!/flex|grid/.test(css.display)) return;
    const children = [...element.children].filter((child) => {
      const style = getComputedStyle(child);
      const size = child.getBoundingClientRect();
      return (
        style.position !== "absolute" &&
        style.position !== "fixed" &&
        size.width > 0 &&
        size.height > 0
      );
    });
    if (children.length < 2) return;
    const content: OverlayRect = {
      x: box.x + px(css.borderLeftWidth) + px(css.paddingLeft),
      y: box.y + px(css.borderTopWidth) + px(css.paddingTop),
      width:
        box.width -
        px(css.borderLeftWidth) -
        px(css.borderRightWidth) -
        px(css.paddingLeft) -
        px(css.paddingRight),
      height: box.height,
    };
    const gapUse: LayoutUseId | null =
      classes.contains(styles.hero!) || classes.contains(styles.split!)
        ? "gap-section"
        : null;
    gapBands(
      content,
      children.map((child) => local(child.getBoundingClientRect())),
      px(css.rowGap),
      px(css.columnGap),
    ).forEach((band, position) => {
      zones.push({
        key: `${index}-gap-${position}`,
        kind: "gap",
        band,
        use: gapUse,
        hasBadge: position === 0,
      });
    });
  });

  return zones;
}
