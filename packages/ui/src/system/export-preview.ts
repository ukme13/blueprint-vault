/**
 * The most an export preview draws: lines, and characters.
 *
 * A preview is highlighted and numbered line by line in the page, and that
 * costs the main thread in proportion to what it is given. An accessibility
 * report in JSON is a million characters on thirty-seven thousand lines; drawn
 * whole it froze the browser. The cap is above every plain export (the CSS and
 * the project file are under three thousand lines), so only a long report is
 * cut, and the file that is downloaded is never cut.
 */
export const EXPORT_PREVIEW_MAX_LINES = 4_000;
export const EXPORT_PREVIEW_MAX_CHARS = 150_000;

/**
 * The caps for each kind of export.
 *
 * A file the system is written into (the CSS, the tokens, the project) is drawn
 * whole up to the general cap. A report is drawn from a tighter one: it is
 * measured, not read down, and its JSON runs to tens of thousands of lines. The
 * Markdown report, at about nine hundred lines, still fits whole.
 */
export const EXPORT_PREVIEW_LIMITS = {
  file: {
    maxLines: EXPORT_PREVIEW_MAX_LINES,
    maxChars: EXPORT_PREVIEW_MAX_CHARS,
  },
  report: { maxLines: 1_000, maxChars: 120_000 },
} as const;

export interface ExportPreviewExcerpt {
  /** What to draw: the whole text when it is short enough, else its start. */
  text: string;
  isTruncated: boolean;
  /** Lines in the whole text, and in `text`. */
  totalLines: number;
  shownLines: number;
}

/**
 * The start of an export, short enough to draw.
 *
 * It ends on a whole line, never part of one, unless a single line is longer
 * than the character cap (a minified file), where it is cut at the cap. The
 * text is walked once and never split into an array, so a megabyte costs a
 * scan and not a million small strings.
 */
export function exportPreviewExcerpt(
  text: string,
  maxLines: number = EXPORT_PREVIEW_MAX_LINES,
  maxChars: number = EXPORT_PREVIEW_MAX_CHARS,
): ExportPreviewExcerpt {
  let totalLines = 1;
  let cutAt = -1;

  for (
    let at = text.indexOf("\n");
    at !== -1;
    at = text.indexOf("\n", at + 1)
  ) {
    if (cutAt === -1 && (totalLines >= maxLines || at >= maxChars)) {
      cutAt = at;
    }
    totalLines += 1;
  }

  if (cutAt === -1 && text.length <= maxChars) {
    return { text, isTruncated: false, totalLines, shownLines: totalLines };
  }

  let end = cutAt === -1 ? text.length : cutAt;
  if (end > maxChars) {
    /* A line longer than the cap: the last whole line before it, if there is
       one, and else the line cut where the cap falls. */
    const before = text.lastIndexOf("\n", maxChars);
    end = before > 0 ? before : maxChars;
  }
  const shown = text.slice(0, end);
  return {
    text: shown,
    isTruncated: true,
    totalLines,
    shownLines: shown === "" ? 0 : shown.split("\n").length,
  };
}
