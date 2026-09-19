import { describe, expect, it } from "vitest";
import { seedWorkspaceProject } from "../workspace/seed-project";
import {
  PREVIEW_FILL_TOKEN_GROUPS,
  PREVIEW_SECTION_IDS,
  PREVIEW_SECTION_SEED_TOKEN,
  PREVIEW_TEXT_COLOR_GROUPS,
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
      backgroundColor: "var(--color-surface-base)",
      backgroundImage: 'url("blob:hero")',
      backgroundSize: "cover",
    });
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
});
