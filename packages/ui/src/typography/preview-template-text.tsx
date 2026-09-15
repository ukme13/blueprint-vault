import type { ReactNode } from "react";
import type { PreviewLanguage } from "./preview-template-shared";

/**
 * Mark canned Thai so the browser can hyphenate and announce it. Studio
 * specimen text is whatever the user typed, so it is left unmarked.
 */
export function localizeCopy(
  lang: PreviewLanguage,
  text: string | undefined,
  value: string,
): ReactNode {
  if (text || lang !== "th") return value;
  return <span lang="th">{value}</span>;
}
