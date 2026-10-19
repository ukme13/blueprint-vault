/**
 * The most an export preview draws: lines, and characters.
 *
 * A preview is highlighted and numbered line by line in the page, and that
 * costs the main thread in proportion to what it is given. An accessibility
 * report in JSON is a million characters on thirty-seven thousand lines; drawn
 * whole it froze the browser. The cap is far above what anyone reads in a
 * preview, and the file that is downloaded is never cut.
 */
export const EXPORT_PREVIEW_MAX_LINES = 500;
export const EXPORT_PREVIEW_MAX_CHARS = 60_000;

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
