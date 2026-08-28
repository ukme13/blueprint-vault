import { describe, expect, it } from "vitest";
import {
  findGoogleFont,
  googleFonts,
  googleFontsHref,
  searchGoogleFonts,
} from "./google-fonts";

describe("the catalogue", () => {
  it("has families, with weights and a thai flag", () => {
    const all = googleFonts();
    expect(all.length).toBeGreaterThan(1000);
    expect(all.every((font) => font.weights.length > 0)).toBe(true);
  });

  it("knows which families ship Thai", () => {
    /* A bilingual project that picks a Latin-only family falls back to a system
       font with no warning, so this flag is what the picker filters on. */
    const thai = googleFonts().filter((font) => font.thai);
    expect(thai.length).toBeGreaterThan(10);
    expect(thai.map((font) => font.family)).toContain("Sarabun");
    expect(findGoogleFont("Inter")?.thai).toBe(false);
  });

  it("finds a family whatever the casing", () => {
    expect(findGoogleFont("inter")?.family).toBe("Inter");
    expect(findGoogleFont("  Inter ")?.family).toBe("Inter");
    expect(findGoogleFont("Not A Font")).toBeUndefined();
  });
});

describe("searchGoogleFonts", () => {
  it("puts families that start with the query first", () => {
    // Typing "not" should reach Noto before something that merely contains it.
    const results = searchGoogleFonts("not");
    expect(results[0]!.family.toLowerCase().startsWith("not")).toBe(true);
  });

  it("can restrict to families with Thai", () => {
    const results = searchGoogleFonts("", { thaiOnly: true, limit: 100 });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((font) => font.thai)).toBe(true);
  });

  it("honours the limit", () => {
    expect(searchGoogleFonts("a", { limit: 5 })).toHaveLength(5);
  });

  it("returns the head of the catalogue for an empty query", () => {
    expect(searchGoogleFonts("   ").length).toBeGreaterThan(0);
  });
});

describe("googleFontsHref", () => {
  it("builds a css2 url with the requested weights", () => {
    const href = googleFontsHref([{ family: "Inter", weights: [400, 700] }])!;
    expect(href).toContain("https://fonts.googleapis.com/css2?");
    expect(href).toContain("family=Inter:wght@400;700");
    expect(href).toContain("display=swap");
  });

  it("asks for no subset, because the api returns them all", () => {
    /* Verified against the live API: with a browser user agent it returns one
       @font-face per subset with a unicode-range, including thai, so the
       browser fetches only what the page uses. Naming a subset would be
       redundant, and naming the wrong one would drop glyphs. */
    const href = googleFontsHref([{ family: "Sarabun" }])!;
    expect(href).not.toContain("subset");
  });

  it("escapes a space as a plus, as the api expects", () => {
    const href = googleFontsHref([{ family: "Noto Sans Thai" }])!;
    expect(href).toContain("family=Noto+Sans+Thai");
    expect(href).not.toContain("%20");
  });

  it("drops a weight the family does not ship", () => {
    const inter = findGoogleFont("Inter")!;
    const href = googleFontsHref([{ family: "Inter", weights: [400, 12345] }])!;
    expect(href).toContain("400");
    expect(href).not.toContain("12345");
    expect(inter.weights).not.toContain(12345);
  });

  it("falls back to every weight when none of the asked-for ones exist", () => {
    const href = googleFontsHref([{ family: "Inter", weights: [12345] }])!;
    expect(href).toMatch(/wght@\d+/);
  });

  it("ignores a family that is not on Google", () => {
    expect(googleFontsHref([{ family: "Helvetica Neue" }])).toBeNull();
  });

  it("returns null when there is nothing to load", () => {
    // So a caller removes the tag rather than requesting an empty stylesheet.
    expect(googleFontsHref([])).toBeNull();
  });

  it("puts several families in one request", () => {
    const href = googleFontsHref([{ family: "Inter" }, { family: "Sarabun" }])!;
    expect(href.match(/family=/g)).toHaveLength(2);
  });
});
