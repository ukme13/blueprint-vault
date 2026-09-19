import type { CSSProperties } from "react";
import styles from "./preview-colour-swatch.module.css";

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

  return (
    <i
      aria-hidden
      className={styles.previewColourSwatch}
      data-empty={swatchStyle ? undefined : "true"}
      style={swatchStyle}
    />
  );
}
