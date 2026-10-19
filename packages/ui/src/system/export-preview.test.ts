import { describe, expect, it } from "vitest";
import {
  EXPORT_PREVIEW_LIMITS,
  EXPORT_PREVIEW_MAX_CHARS,
  EXPORT_PREVIEW_MAX_LINES,
  exportPreviewExcerpt,
} from "./export-preview";

const lines = (count: number, line = "a: b;") =>
  Array.from({ length: count }, () => line).join("\n");

describe("the export preview excerpt", () => {
  it("leaves a short export whole", () => {
    const text = lines(10);
    expect(exportPreviewExcerpt(text)).toEqual({
      text,
      isTruncated: false,
      totalLines: 10,
      shownLines: 10,
    });
    expect(exportPreviewExcerpt("")).toMatchObject({
      isTruncated: false,
      totalLines: 1,
    });
  });

  it("leaves an export of exactly the cap whole", () => {
    const text = lines(EXPORT_PREVIEW_MAX_LINES);
    expect(exportPreviewExcerpt(text).isTruncated).toBe(false);
  });

  it("cuts a long export at the line cap, on a whole line", () => {
    const text = lines(EXPORT_PREVIEW_MAX_LINES + 1);
    const excerpt = exportPreviewExcerpt(text);
    expect(excerpt.isTruncated).toBe(true);
    expect(excerpt.shownLines).toBe(EXPORT_PREVIEW_MAX_LINES);
    expect(excerpt.totalLines).toBe(EXPORT_PREVIEW_MAX_LINES + 1);
    expect(excerpt.text.split("\n")).toHaveLength(EXPORT_PREVIEW_MAX_LINES);
    expect(text.startsWith(excerpt.text)).toBe(true);
  });

  it("counts the lines of the whole text, not of the excerpt", () => {
    const excerpt = exportPreviewExcerpt(lines(37_596));
    expect(excerpt.totalLines).toBe(37_596);
    expect(excerpt.shownLines).toBe(EXPORT_PREVIEW_MAX_LINES);
  });

  it("keeps what it draws under the character cap, ending on a whole line", () => {
    /* Few lines, each wide: the character cap is what stops it. */
    const wide = "x".repeat(1_000);
    const excerpt = exportPreviewExcerpt(lines(200, wide));
    expect(excerpt.isTruncated).toBe(true);
    expect(excerpt.text.length).toBeLessThanOrEqual(EXPORT_PREVIEW_MAX_CHARS);
    expect(excerpt.text.endsWith(wide)).toBe(true);
    expect(excerpt.shownLines).toBeLessThan(200);
  });

  it("cuts a single line longer than the cap where the cap falls", () => {
    const excerpt = exportPreviewExcerpt(
      "y".repeat(EXPORT_PREVIEW_MAX_CHARS * 3),
    );
    expect(excerpt.isTruncated).toBe(true);
    expect(excerpt.text).toHaveLength(EXPORT_PREVIEW_MAX_CHARS);
    expect(excerpt.shownLines).toBe(1);
    expect(excerpt.totalLines).toBe(1);
  });

  it("takes the caps as arguments", () => {
    expect(exportPreviewExcerpt(lines(5), 2, 1_000).text).toBe(lines(2));
    expect(exportPreviewExcerpt("abcdef", 10, 4).text).toBe("abcd");
  });

  it("draws a Markdown report whole, and cuts a long JSON one sooner than a file", () => {
    const { report, file } = EXPORT_PREVIEW_LIMITS;
    expect(report.maxLines).toBeLessThan(file.maxLines);
    /* About the size of the Markdown report: 930 lines, 104,000 characters. */
    const markdown = lines(930, "x".repeat(110));
    expect(
      exportPreviewExcerpt(markdown, report.maxLines, report.maxChars)
        .isTruncated,
    ).toBe(false);
    /* And a file of the same size is whole under the general cap too. */
    expect(
      exportPreviewExcerpt(markdown, file.maxLines, file.maxChars).isTruncated,
    ).toBe(false);
    const json = lines(37_596, '  "ratio": 3.84,');
    const excerpt = exportPreviewExcerpt(
      json,
      report.maxLines,
      report.maxChars,
    );
    expect(excerpt.isTruncated).toBe(true);
    expect(excerpt.shownLines).toBe(report.maxLines);
  });
});
