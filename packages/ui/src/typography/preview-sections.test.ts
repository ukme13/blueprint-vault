import { describe, expect, it } from "vitest";
import { seedWorkspaceProject } from "../workspace/seed-project";
import {
  PREVIEW_FILL_TOKEN_GROUPS,
  PREVIEW_PAGE_TOKEN,
  PREVIEW_SECTION_IDS,
  PREVIEW_SECTION_SEED_TOKEN,
  PREVIEW_TEXT_COLOR_GROUPS,
  previewBandFillToAdd,
  previewBandHasNoFill,
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
    expect(
      sections.find((section) => section.id === "landing-hero")?.fill,
    ).toEqual({
      kind: "token",
      tokenId: PREVIEW_SECTION_SEED_TOKEN["landing-hero"],
    });
    expect(
      sections.find((section) => section.id === "landing-quad")?.fill,
    ).toEqual({
      kind: "token",
      tokenId: "surface.base",
    });
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
    ).toEqual({
      kind: "token",
      tokenId: "surface.base",
    });
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
    ).toEqual({
      kind: "token",
      tokenId: "surface.base",
    });
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
      /* On the page's own token the image has the page under it, not a colour. */
      backgroundColor: "transparent",
      backgroundImage: 'url("blob:hero")',
      backgroundSize: "cover",
    });
  });

  it("lets the page show through a band on the page's own token", () => {
    const on = (tokenId: string, isOpaque?: boolean) =>
      previewSectionFillStyle({ kind: "token", tokenId }, null, { isOpaque });
    expect(on("surface.base")).toEqual({ backgroundColor: "transparent" });
    /* A band content passes under takes the page's colour, so it stays opaque. */
    expect(on("surface.base", true)).toEqual({
      backgroundColor: "var(--preview-page, var(--color-surface-base))",
    });
    /* A band with a fill of its own keeps it, opaque or not. */
    for (const isOpaque of [false, true]) {
      expect(on("surface.raised", isOpaque)).toEqual({
        backgroundColor: "var(--color-surface-raised)",
      });
    }
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

  it("has no fill when a band is on the page's own token", () => {
    expect(
      previewBandHasNoFill({ kind: "token", tokenId: PREVIEW_PAGE_TOKEN }),
    ).toBe(true);
    expect(
      previewBandHasNoFill({ kind: "token", tokenId: "surface.raised" }),
    ).toBe(false);
    /* An image is laid over a colour, so the band is painted. */
    expect(
      previewBandHasNoFill({
        kind: "image",
        imageId: "a",
        fallbackTokenId: PREVIEW_PAGE_TOKEN,
      }),
    ).toBe(false);
  });

  it("adds a fill that is not the page's own, so the band is painted", () => {
    for (const id of PREVIEW_SECTION_IDS) {
      const token = previewBandFillToAdd(id);
      expect(token).not.toBe(PREVIEW_PAGE_TOKEN);
      expect(previewBandHasNoFill({ kind: "token", tokenId: token })).toBe(
        false,
      );
    }
    /* A band seeded with a fill of its own gets that one back. */
    expect(previewBandFillToAdd("landing-quote")).toBe("surface.raised");
    expect(previewBandFillToAdd("landing-hero")).toBe("surface.raised");
  });
});
