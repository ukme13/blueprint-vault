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
}

export function Swatch({ hex, label }: SwatchProps) {
  return (
    <span
      aria-label={`${label}, ${hex}`}
      className="inline-block size-6 rounded border border-border-default align-middle"
      role="img"
      style={{ backgroundColor: hex }}
      title={hex}
    />
  );
}
