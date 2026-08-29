import { describe, expect, it } from "vitest";
import {
  ALLOWED_FONT_EXTENSIONS,
  FALLBACK_LOCAL_FONT_FAMILY,
  MAX_FONT_FILE_BYTES,
  localFontFamilyName,
  rejectFontFile,
} from "./local-font";

describe("localFontFamilyName", () => {
  it("drops the extension and keeps the rest", () => {
    expect(localFontFamilyName("Brand-Regular.woff2")).toBe("Brand-Regular");
    expect(localFontFamilyName("Brand.woff")).toBe("Brand");
    expect(localFontFamilyName("Brand.ttf")).toBe("Brand");
    expect(localFontFamilyName("Brand.otf")).toBe("Brand");
  });

  it("keeps weights apart rather than tidying them away", () => {
    // Someone uploading several weights needs them to stay separate families.
    expect(localFontFamilyName("Brand-Bold.woff2")).not.toBe(
      localFontFamilyName("Brand-Regular.woff2"),
    );
  });

  it("leaves a name that is not a font extension alone", () => {
    expect(localFontFamilyName("Brand.v2.woff2")).toBe("Brand.v2");
    expect(localFontFamilyName("no-extension")).toBe("no-extension");
  });

  it("removes what would end the name early in a CSS stack", () => {
    // A stack is comma separated and families are quoted.
    expect(localFontFamilyName('Bra"nd,Bold.woff2')).toBe("Bra nd Bold");
    expect(localFontFamilyName("O'Brien.woff2")).toBe("O Brien");
  });

  it("collapses the whitespace that leaves behind", () => {
    expect(localFontFamilyName("Brand   Display.woff2")).toBe("Brand Display");
    expect(localFontFamilyName("  Brand.woff2  ")).toBe("Brand");
  });

  it("names a file that has nothing usable left", () => {
    expect(localFontFamilyName(".woff2")).toBe(FALLBACK_LOCAL_FONT_FAMILY);
    expect(localFontFamilyName('",;.woff2')).toBe(FALLBACK_LOCAL_FONT_FAMILY);
  });

  it("gives the same file the same name every time", () => {
    // The project stores the name and the file store is keyed by font id, so a
    // name that drifted would leave the two unable to find each other.
    const first = localFontFamilyName("Brand-Regular.woff2");
    const second = localFontFamilyName("Brand-Regular.woff2");
    expect(first).toBe(second);
  });
});

describe("rejectFontFile", () => {
  const ok = { name: "Brand-Regular.woff2", size: 28_000 };

  it("accepts the formats a desktop licence holder actually has", () => {
    for (const extension of ALLOWED_FONT_EXTENSIONS) {
      expect(
        rejectFontFile({ name: `Brand.${extension}`, size: 28_000 }),
      ).toBeNull();
    }
  });

  it("refuses a file that is not a font, and says what to choose", () => {
    const reason = rejectFontFile({ name: "holiday.mp4", size: 1_000 });
    expect(reason).toContain("holiday.mp4");
    expect(reason).toContain("woff2");
  });

  it("refuses a file with no extension at all", () => {
    expect(rejectFontFile({ name: "Brand", size: 1_000 })).not.toBeNull();
  });

  it("does not care about case", () => {
    expect(rejectFontFile({ name: "Brand.WOFF2", size: 28_000 })).toBeNull();
    expect(rejectFontFile({ name: "Brand.OTF", size: 28_000 })).toBeNull();
  });

  it("refuses an empty file", () => {
    const reason = rejectFontFile({ ...ok, size: 0 });
    expect(reason).toContain("empty");
  });

  it("accepts a CJK-sized font, which is why the cap is generous", () => {
    // Noto Sans CJK as an otf is around sixteen megabytes.
    expect(
      rejectFontFile({ name: "NotoSansCJK.otf", size: 16 * 1024 * 1024 }),
    ).toBeNull();
  });

  it("refuses something too large to be a font, and says why", () => {
    const reason = rejectFontFile({
      name: "Brand.woff2",
      size: MAX_FONT_FILE_BYTES + 1,
    });
    expect(reason).toContain("32MB");
    expect(reason).toContain("probably not one");
  });

  it("accepts a file exactly at the cap", () => {
    expect(
      rejectFontFile({ name: "Brand.woff2", size: MAX_FONT_FILE_BYTES }),
    ).toBeNull();
  });

  it("checks the extension, not the reported type", () => {
    /* Browsers disagree about the MIME type for a font and often report an
       empty string for otf and ttf, so the name is the only reliable signal. */
    expect(rejectFontFile({ name: "Brand.otf", size: 28_000 })).toBeNull();
  });
});
