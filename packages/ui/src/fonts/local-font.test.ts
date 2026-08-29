import { describe, expect, it } from "vitest";
import { FALLBACK_LOCAL_FONT_FAMILY, localFontFamilyName } from "./local-font";

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
