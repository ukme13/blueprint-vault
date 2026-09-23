import { alphaPercent } from "@blueprint/ui";

/**
 * A colour, shown.
 *
 * The one place on these pages that carries a literal colour value, and it
 * carries it as data rather than as a style somebody wrote: the hex arrives
 * from the workspace and goes straight onto the element. Stage 4's scanner
 * will look for hardcoded values in this app, and this is the shape that
 * should survive it — a value passed in, never a value typed.
 *
 * The border is a semantic role so a swatch of the page's own background
 * still reads as a swatch.
 */
interface SwatchProps {
  hex: string;
  /** What it is, for somebody who cannot see it. */
  label: string;
  /**
   * How much of it there is, 0 to 1, and 1 when it is not given.
   *
   * A transparent swatch is drawn over a checker and laid on at its own
   * opacity, so what is on the page is what the colour does. Drawn opaque it
   * would be a different colour from the one the row names, which is the whole
   * failure this prop exists to stop.
   */
  alpha?: number;
}

export function Swatch({ hex, label, alpha = 1 }: SwatchProps) {
  const transparent = alpha < 1;
  /* The percentage goes in the name and the tooltip, not only in the paint.
     A checker says "there is transparency here" to somebody who can see it and
     nothing at all to somebody who cannot. */
  const described = transparent ? `${hex} at ${alphaPercent(alpha)}` : hex;

  return (
    <span
      aria-label={`${label}, ${described}`}
      className="swatch inline-block size-6 shrink-0 overflow-hidden rounded-inner border border-border-default align-middle"
      data-transparent={transparent || undefined}
      role="img"
      title={described}
    >
      <span
        className="block size-full"
        style={{ backgroundColor: hex, opacity: alpha }}
      />
    </span>
  );
}
