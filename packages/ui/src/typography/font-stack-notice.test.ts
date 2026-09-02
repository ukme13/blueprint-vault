import { describe, expect, it } from "vitest";
import {
  fontStackNotice,
  type FontStackNoticeInput,
} from "./font-stack-notice";

/** A catalogue font that covers the script and has nothing behind it. */
const base: FontStackNoticeInput = {
  primary: "Noto Sans Thai",
  isPrimaryKnown: true,
  isPrimaryLocal: false,
  coversScript: true,
  hasFallback: false,
};

describe("which note a stack has earned", () => {
  it("says nothing before a font is chosen", () => {
    expect(fontStackNotice({ ...base, primary: "" })).toBe("none");
  });

  it("says nothing about an uploaded file", () => {
    /* Not in the catalogue and not readable from the file: we cannot say we
       failed to load it, because we did load it, and we cannot say which
       scripts it covers. */
    expect(
      fontStackNotice({
        ...base,
        isPrimaryKnown: false,
        isPrimaryLocal: true,
        coversScript: false,
      }),
    ).toBe("none");
  });

  it("reports a family it cannot load, and stops there", () => {
    /* The bug this replaced: an unknown family reads as covering nothing, so
       the old markup also claimed it had no glyphs for the script. Coverage
       is unknown, not absent, and the two are not the same note. */
    expect(
      fontStackNotice({
        ...base,
        primary: "Helvetica Neue",
        isPrimaryKnown: false,
        coversScript: false,
      }),
    ).toBe("not-in-catalogue");
  });

  it("says a fallback is optional when the primary covers the script", () => {
    expect(fontStackNotice(base)).toBe("covers-script");
  });

  it("warns when a known family does not cover the script", () => {
    expect(fontStackNotice({ ...base, coversScript: false })).toBe(
      "missing-glyphs",
    );
  });

  it("stops warning once a fallback is behind it", () => {
    expect(
      fontStackNotice({ ...base, coversScript: false, hasFallback: true }),
    ).toBe("none");
  });

  it("still says a fallback is optional when one is set anyway", () => {
    /* Setting a fallback you did not need is allowed, and the note explains
       why the field is empty-able rather than telling anybody off. */
    expect(fontStackNotice({ ...base, hasFallback: true })).toBe(
      "covers-script",
    );
  });
});
