import type { CSSProperties } from "react";
import { SquareSlash } from "lucide-react";
import styles from "./preview-colour-swatch.module.css";

/** A preview colour's swatch; with no colour, the "Default" mark. */
export function PreviewColourSwatch({
  hex,
  variable,
}: {
  hex?: string | null;
  variable?: string | null;
}) {
  const swatchStyle = hex
    ? ({ "--preview-swatch": hex } as CSSProperties)
    : variable
      ? ({ "--preview-swatch": `var(${variable})` } as CSSProperties)
      : undefined;

  if (!swatchStyle) {
    return (
      <SquareSlash
        aria-hidden
        className={styles.previewColourDefault}
        data-empty="true"
      />
    );
  }
  return (
    <i aria-hidden className={styles.previewColourSwatch} style={swatchStyle} />
  );
}
