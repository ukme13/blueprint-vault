import { describe, expect, it } from "vitest";
import { seedWorkspaceProject } from "../workspace/seed-project";
import {
  PREVIEW_FILL_TOKEN_GROUPS,
  PREVIEW_PAGE_TOKEN,
  PREVIEW_SECTION_IDS,
  PREVIEW_SECTION_SEED_TOKEN,
  PREVIEW_TEXT_COLOR_GROUPS,
  previewBandFillToAdd,
  isPreviewSectionSeedFill,
  previewSectionFillStyle,
  previewTokenSelectorOptions,
  readPreviewSections,
  seedPreviewSections,
  updateSectionFill,
} from "./preview-sections";

describe("preview sections", () => {
  it("seeds the frozen ids with the CSS defaults", () => {
    const sections = seedPreviewSections();
    expect(sections.map((section) => section.id)).toEqual([
      ...PREVIEW_SECTION_IDS,
    ]);
    expect(sections.map((section) => section.id)).toContain("landing-quad");
    expect(
      sections.find((section) => section.id === "landing-quote")?.fill,
    ).toEqual({
      kind: "token",
      tokenId: "surface.raised",
    });
    /* The bands that sit on the page have no fill of their own. */
    expect(PREVIEW_SECTION_SEED_TOKEN["landing-hero"]).toBeNull();
    expect(
      sections.find((section) => section.id === "landing-hero")?.fill,
    ).toEqual({ kind: "none" });
    expect(
      sections.find((section) => section.id === "landing-quad")?.fill,
    ).toEqual({ kind: "none" });
  });

  it("fills a missing list from the seed and drops unknown ids", () => {
    expect(readPreviewSections(undefined)).toEqual(seedPreviewSections());
    const after = readPreviewSections([
      {
        id: "landing-hero",
        fill: { kind: "token", tokenId: "surface.subtle" },
      },
      {
        id: "landing-extra",
        fill: { kind: "token", tokenId: "surface.base" },
      },
    ]);
    expect(after).toHaveLength(PREVIEW_SECTION_IDS.length);
    expect(
      after.find((section) => section.id === "landing-hero")?.fill,
    ).toEqual({
      kind: "token",
      tokenId: "surface.subtle",
    });
    expect(
      after.find((section) => section.id === "landing-quad")?.fill,
    ).toEqual({ kind: "none" });
    expect(after.map((section) => section.id)).not.toContain("landing-extra");
  });

  it("gives a save from before the newsletter band a raised one, above the footer", () => {
    const olderSave = PREVIEW_SECTION_IDS.filter(
      (id) => id !== "landing-newsletter",
    ).map((id) => ({
      id,
      fill: { kind: "token" as const, tokenId: "surface.subtle" },
    }));
    const ids = readPreviewSections(olderSave).map((section) => section.id);
    expect(ids.slice(-3)).toEqual([
      "landing-cta",
      "landing-newsletter",
      "shell-footer",
    ]);
    expect(
      readPreviewSections(olderSave).find(
        (section) => section.id === "landing-newsletter",
      )?.fill,
    ).toEqual({ kind: "token", tokenId: "surface.raised" });
  });

  it("fills older saves without landing-quad with the seed default", () => {
    const olderSave = PREVIEW_SECTION_IDS.filter(
      (id) => id !== "landing-quad",
    ).map((id) => ({
      id,
      fill: { kind: "token" as const, tokenId: "surface.subtle" },
    }));
    const loaded = readPreviewSections(olderSave);
    expect(loaded.map((section) => section.id)).toEqual([
      ...PREVIEW_SECTION_IDS,
    ]);
    expect(
      loaded.find((section) => section.id === "landing-quad")?.fill,
    ).toEqual({ kind: "none" });
    expect(
      loaded.find((section) => section.id === "landing-hero")?.fill,
    ).toEqual({
      kind: "token",
      tokenId: "surface.subtle",
    });
  });

  it("keeps an image fill and paints a cover url", () => {
    const after = updateSectionFill(seedPreviewSections(), "landing-hero", {
      kind: "image",
      imageId: "img-1",
      fallbackTokenId: "surface.base",
    });
    expect(
      after.find((section) => section.id === "landing-hero")?.fill,
    ).toEqual({
      kind: "image",
      imageId: "img-1",
      fallbackTokenId: "surface.base",
    });
    expect(
      previewSectionFillStyle(
        { kind: "image", imageId: "img-1", fallbackTokenId: "surface.base" },
        "blob:hero",
      ),
    ).toMatchObject({
      backgroundColor: "var(--color-surface-base)",
      backgroundImage: 'url("blob:hero")',
      backgroundSize: "cover",
    });
  });

  it("lets the page show through a band with no fill", () => {
    const none = (isOpaque?: boolean) =>
      previewSectionFillStyle({ kind: "none" }, null, { isOpaque });
    expect(none()).toEqual({ backgroundColor: "transparent" });
    /* A band content passes under takes the page's colour, so it stays opaque. */
    expect(none(true)).toEqual({
      backgroundColor: "var(--preview-page, var(--color-surface-base))",
    });
  });

  it("paints a band given surface.base with it, whatever the page is", () => {
    const on = (tokenId: string, isOpaque?: boolean) =>
      previewSectionFillStyle({ kind: "token", tokenId }, null, { isOpaque });
    /* The page's own token is a fill like another: not the page's variable. */
    for (const isOpaque of [false, true]) {
      expect(on("surface.base", isOpaque)).toEqual({
        backgroundColor: "var(--color-surface-base)",
      });
      expect(on("surface.raised", isOpaque)).toEqual({
        backgroundColor: "var(--color-surface-raised)",
      });
    }
  });

  it("reads a stored none fill, and tells a seeded band from an edited one", () => {
    const hero = readPreviewSections([
      { id: "landing-hero", fill: { kind: "none" } },
    ]).find((section) => section.id === "landing-hero")!;
    expect(hero.fill).toEqual({ kind: "none" });
    expect(isPreviewSectionSeedFill(hero)).toBe(true);
    /* Choosing surface.base is an edit: it is no longer the band with none. */
    expect(
      isPreviewSectionSeedFill({
        id: "landing-hero",
        fill: { kind: "token", tokenId: "surface.base" },
      }),
    ).toBe(false);
    /* A band seeded on a surface is edited by losing it. */
    expect(
      isPreviewSectionSeedFill({ id: "landing-quote", fill: { kind: "none" } }),
    ).toBe(false);
  });

  it("names token pickers from the layer groups in requested order", () => {
    const tokens = seedWorkspaceProject("Test").semantics ?? [];
    const fill = previewTokenSelectorOptions(tokens, PREVIEW_FILL_TOKEN_GROUPS);
    expect(fill.map((group) => group.title)).toEqual(["Surfaces", "Actions"]);
    expect(fill.some((group) => group.title === "Foregrounds")).toBe(false);
    const text = previewTokenSelectorOptions(tokens, PREVIEW_TEXT_COLOR_GROUPS);
    expect(text.map((group) => group.title)).toEqual([
      "Foregrounds",
      "Actions",
      "Status",
    ]);
    expect(text.some((group) => group.title === "Surfaces")).toBe(false);
  });

  it("adds a fill that can be told from the page", () => {
    for (const id of PREVIEW_SECTION_IDS) {
      const token = previewBandFillToAdd(id);
      expect(token).not.toBe(PREVIEW_PAGE_TOKEN);
      expect(token).toBe(PREVIEW_SECTION_SEED_TOKEN[id] ?? "surface.raised");
    }
    /* A band seeded with a fill of its own gets that one back. */
    expect(previewBandFillToAdd("landing-quote")).toBe("surface.raised");
    expect(previewBandFillToAdd("landing-hero")).toBe("surface.raised");
  });
});
