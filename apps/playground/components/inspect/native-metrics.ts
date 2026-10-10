import { CONTROL_INSET_STYLE } from "../preview/Inspectable";

/**
 * The room and shape an element of the page is drawn with before the
 * inspector changes anything, in pixels.
 *
 * Read from the page itself, since a padding is a step of a scale and a radius
 * a token of another, and what they come to depends on the system being
 * looked at. Read from a twin of the element with its inline style taken off,
 * so a value the person has set does not hide the one it replaced: the twin
 * sits beside the element for the moment it takes to read, and is gone before
 * anything is drawn.
 */
export interface NativeMetrics {
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  gap?: number;
  radiusTopLeft?: number;
  radiusTopRight?: number;
  radiusBottomRight?: number;
  radiusBottomLeft?: number;
}

const px = (value: string): number | undefined => {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : undefined;
};

export function readNativeMetrics(
  id: string,
  isBand: boolean,
): NativeMetrics | null {
  if (typeof document === "undefined") return null;
  const element = document.querySelector<HTMLElement>(
    isBand ? `[data-preview-section="${id}"]` : `[data-preview-slot="${id}"]`,
  );
  if (!element?.parentNode) return null;

  const twin = element.cloneNode(false) as HTMLElement;
  twin.removeAttribute("style");
  twin.removeAttribute("id");
  twin.removeAttribute("data-preview-slot");
  twin.removeAttribute("data-preview-section");
  twin.setAttribute("aria-hidden", "true");
  /* A button's own insets are set in line, as the page sets them. */
  if (element.tagName === "BUTTON") {
    Object.assign(twin.style, CONTROL_INSET_STYLE);
  }
  twin.style.position = "absolute";
  twin.style.visibility = "hidden";
  twin.style.pointerEvents = "none";
  element.after(twin);
  try {
    const computed = getComputedStyle(twin);
    return {
      paddingTop: px(computed.paddingTop),
      paddingRight: px(computed.paddingRight),
      paddingBottom: px(computed.paddingBottom),
      paddingLeft: px(computed.paddingLeft),
      gap: px(computed.rowGap),
      radiusTopLeft: px(computed.borderTopLeftRadius),
      radiusTopRight: px(computed.borderTopRightRadius),
      radiusBottomRight: px(computed.borderBottomRightRadius),
      radiusBottomLeft: px(computed.borderBottomLeftRadius),
    };
  } finally {
    twin.remove();
  }
}

/** What a group of sides come to: one size, or the sizes that disagree. */
export function describePx(
  values: readonly (number | undefined)[],
): string | undefined {
  const known = values.filter((value): value is number => value !== undefined);
  if (known.length === 0) return undefined;
  const distinct = [...new Set(known)];
  return `${distinct.join(" / ")}px`;
}
