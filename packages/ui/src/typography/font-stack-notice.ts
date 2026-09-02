/**
 * Whether the preview can render a family at all.
 *
 * The studio loads Google families and files somebody uploaded. A family that
 * is neither — typed by hand, or carried in from an older project — still
 * belongs in the stack and still applies wherever it is installed. It just
 * will not change anything on this screen, and a field that silently does
 * nothing reads as broken.
 *
 * Nothing here asks what a family covers. CSS falls back per glyph, so a
 * stack needs no script detection to work, and a designer choosing a fallback
 * is testing something — a check that thinks it knows better is a check in
 * the way.
 */
export interface PreviewableFamily {
  /** The family, or "" when nothing is chosen yet. */
  family: string;
  /** Whether it is in the Google catalogue. */
  isInCatalogue: boolean;
  /** Whether it renders from a file somebody handed us. */
  isLocal: boolean;
}

export function canPreviewFamily({
  family,
  isInCatalogue,
  isLocal,
}: PreviewableFamily): boolean {
  /* An empty slot is not a family that failed to load. */
  if (!family) return true;
  return isInCatalogue || isLocal;
}
