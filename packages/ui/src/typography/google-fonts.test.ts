import { describe, expect, it } from "vitest";
import {
  findGoogleFont,
  googleFonts,
  googleFontsHref,
  searchGoogleFonts,
  genericForCategory,
} from "./google-fonts";

describe("the catalogue", () => {
  it("has families, with weights and a thai flag", () => {
    const all = googleFonts();
    expect(all.length).toBeGreaterThan(1000);
    expect(all.every((font) => font.weights.length > 0)).toBe(true);
  });

  it("knows which writing systems a family covers", () => {
    /* A bilingual project that picks a family without the script falls back to
       a system font with no warning, so this is what the picker filters on.
       Thai is the case at hand; Arabic, Devanagari and Korean have the same
       problem. */
    const thai = googleFonts().filter((font) => font.scripts.includes("thai"));
    expect(thai.length).toBeGreaterThan(10);
    expect(thai.map((font) => font.family)).toContain("Sarabun");
    expect(findGoogleFont("Inter")?.scripts).not.toContain("thai");
  });

  it("covers scripts beyond Thai", () => {
    const all = googleFonts();
    ["arabic", "devanagari", "korean", "cyrillic"].forEach((script) => {
      expect(all.some((font) => font.scripts.includes(script))).toBe(true);
    });
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

  it("can restrict to a writing system", () => {
    const results = searchGoogleFonts("", { script: "thai", limit: 100 });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((font) => font.scripts.includes("thai"))).toBe(true);
  });

  it("honours the limit", () => {
    expect(searchGoogleFonts("a", { limit: 5 })).toHaveLength(5);
  });

  it("opens on the most popular families, not the alphabet", () => {
    /* It used to return the catalogue alphabetically, so the picker opened on
       ABeeZee and Abel — which made 1946 families look like a shortlist of
       fonts nobody asked for. */
    const results = searchGoogleFonts("   ");
    expect(results.length).toBeGreaterThan(0);
    expect(results.slice(0, 5).map((font) => font.family)).toContain("Roboto");
    expect(results[0]!.family).not.toBe("ABeeZee");
  });

  it("ranks the most used first within a match", () => {
    const results = searchGoogleFonts("noto", { limit: 10 });
    const ranks = results.map((font) => font.popularity);
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
  });

  it("puts popular families first when filtered by script", () => {
    const results = searchGoogleFonts("", { script: "thai", limit: 6 });
    expect(results.every((font) => font.scripts.includes("thai"))).toBe(true);
    expect(results.map((font) => font.family)).toContain("Sarabun");
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

describe("genericForCategory", () => {
  it("maps a category to the generic a stack should end in", () => {
    /* Appended automatically: without it, two failed loads leave the browser
       default, which may be a serif nobody chose. */
    expect(genericForCategory("Sans Serif")).toBe("sans-serif");
    expect(genericForCategory("Serif")).toBe("serif");
    expect(genericForCategory("Monospace")).toBe("monospace");
    expect(genericForCategory("Handwriting")).toBe("cursive");
    expect(genericForCategory("Display")).toBe("sans-serif");
  });

  it("does not mistake Sans Serif for a serif", () => {
    expect(genericForCategory("Sans Serif")).not.toBe("serif");
  });

  it("falls back to sans-serif for anything unknown", () => {
    expect(genericForCategory("")).toBe("sans-serif");
  });
});
