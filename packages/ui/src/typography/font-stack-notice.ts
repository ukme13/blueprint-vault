/**
 * Which note a font stack has earned.
 *
 * Three notes that used to be three conditions on the markup, where nothing
 * stopped two of them being true at once — and two were. A family typed by
 * hand is in no catalogue, so it earned "not a Google font", and its coverage
 * reads as false for every script, so it earned "has no Thai glyphs" as well.
 * The second is a claim about a font we know nothing about.
 *
 * One function returning one answer is what makes them exclusive, rather than
 * three conditions that have to be kept exclusive by hand.
 */
export type FontStackNotice =
  | "none"
  /** Not in the Google catalogue, so it is not loaded for the preview. */
  | "not-in-catalogue"
  /** Covers the chosen script on its own, so a fallback is optional. */
  | "covers-script"
  /** Known not to cover the chosen script, and nothing is set behind it. */
  | "missing-glyphs";

export interface FontStackNoticeInput {
  /** The primary family, or "" when nothing is chosen yet. */
  primary: string;
  /** Whether the primary is in the catalogue, which is where coverage is known. */
  isPrimaryKnown: boolean;
  /** Whether the primary renders from a file somebody handed us. */
  isPrimaryLocal: boolean;
  /** Whether the primary covers the chosen script. Only meaningful when known. */
  coversScript: boolean;
  /** Whether a fallback family is set behind it. */
  hasFallback: boolean;
}

export function fontStackNotice({
  primary,
  isPrimaryKnown,
  isPrimaryLocal,
  coversScript,
  hasFallback,
}: FontStackNoticeInput): FontStackNotice {
  if (!primary) return "none";

  /* An uploaded file is in no catalogue. Neither whether we load it — we do —
     nor which scripts it covers is something we can read off it, so there is
     nothing here we could say that would be true. */
  if (isPrimaryLocal) return "none";

  /* Said before coverage, because coverage is unknown for the same reason.
     The old markup said both, and the second one was guessing. */
  if (!isPrimaryKnown) return "not-in-catalogue";

  if (coversScript) return "covers-script";

  /* A fallback is the answer to this note, so it stops being worth making. */
  return hasFallback ? "none" : "missing-glyphs";
}
