import {
  gapBands,
  paddingBands,
  type OverlayRect,
  type SpacingBand,
} from "@blueprint/ui";
import styles from "../preview/landing.module.css";

/** The layout uses the landing reads: the ones a badge can rebind. */
export type LayoutUseId =
  | "inset-container"
  | "inset-section"
  | "gap-section"
  | "gap-grid"
  | "gap-nav"
  | "inset-card";

/**
 * Which use pads an element, and on which sides: a wrap's inset is its
 * inline padding; a band of the page (each child of main, and the footer)
 * its block padding; a card's all four.
 */
const INSET_USES: readonly {
  matches: (element: Element) => boolean;
  use: LayoutUseId;
  axis: "inline" | "block" | "both";
}[] = [
  {
    matches: (element) => hasAny(element, [styles.wrap, styles.navInner]),
    use: "inset-container",
    axis: "inline",
  },
  {
    matches: (element) =>
      hasAny(element, [styles.footer]) ||
      hasAny(element.parentElement, [styles.main]),
    use: "inset-section",
    axis: "block",
  },
  {
    matches: (element) => hasAny(element, [styles.card, styles.plan]),
    use: "inset-card",
    axis: "both",
  },
];

/** Which use spaces an element's children, by its landing class. */
const GAP_USES: readonly {
  classes: readonly (string | undefined)[];
  use: LayoutUseId;
}[] = [
  { classes: [styles.hero, styles.split], use: "gap-section" },
  { classes: [styles.cols], use: "gap-grid" },
  { classes: [styles.navInner, styles.navLinks], use: "gap-nav" },
];

function hasAny(
  element: Element | null,
  classes: readonly (string | undefined)[],
): boolean {
  return classes.some((name) => !!name && !!element?.classList.contains(name));
}

/** The use padding this side of the element, if one does. */
function insetUseOf(
  element: Element,
  axis: "inline" | "block",
): LayoutUseId | null {
  const match = INSET_USES.find(
    (each) =>
      (each.axis === "both" || each.axis === axis) && each.matches(element),
  );
  return match?.use ?? null;
}

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
 * Which layout use a space belongs to is read from the landing's classes,
 * in the two tables above. Everything else is drawn and tagged with its
 * size and step, and is not a layout use.
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

    const insets = paddingBands(box, {
      top: px(css.paddingTop),
      right: px(css.paddingRight),
      bottom: px(css.paddingBottom),
      left: px(css.paddingLeft),
    });
    insets.forEach((band, side) => {
      const use = insetUseOf(element, band.axis);
      zones.push({
        key: `${index}-inset-${side}`,
        kind: "inset",
        band,
        use,
        hasBadge: side === 0,
      });
    });

    if (!/flex|grid/.test(css.display)) return;
    /* Each child measured once: laid out in flow, with a box. */
    const children = [...element.children]
      .filter(
        (child) => !/absolute|fixed/.test(getComputedStyle(child).position),
      )
      .map((child) => child.getBoundingClientRect())
      .filter((size) => size.width > 0 && size.height > 0);
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
    const gapUse =
      GAP_USES.find((each) => hasAny(element, each.classes))?.use ?? null;
    gapBands(
      content,
      children.map(local),
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
