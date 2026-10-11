import { describe, expect, it } from "vitest";
import {
  previewInspectTitle,
  previewIsOverridden,
} from "./preview-inspect-target";
import { PREVIEW_SECTION_SEED_TOKEN } from "./preview-sections";

const block = { id: "landing-hero", roleId: "h1", text: "Hello" };

describe("previewInspectTitle", () => {
  it("names a band by its place, and a surface by what it is", () => {
    expect(previewInspectTitle("landing-hero", true)).toBe("Hero");
    expect(previewInspectTitle("card-pricing", false)).toBe("Pricing cards");
    expect(previewInspectTitle("divider-footer-base", false)).toBe(
      "Footer divider",
    );
    expect(previewInspectTitle("landing-plan-2-tag", false)).toBe("Plan tag");
  });

  it("names a slot by its group, which may be the generic title", () => {
    expect(typeof previewInspectTitle("landing-hero", false)).toBe("string");
    expect(previewInspectTitle("landing-hero", false).length).toBeGreaterThan(
      0,
    );
  });
});

describe("previewIsOverridden", () => {
  const none = {
    styles: {},
    styleKey: null,
    block: null,
    defaultBlock: null,
    section: null,
  };

  it("is false for nothing", () => {
    expect(previewIsOverridden(none)).toBe(false);
  });

  it("is true for a style kept under the element's key", () => {
    expect(
      previewIsOverridden({
        ...none,
        styles: { a: { opacity: 50 } },
        styleKey: "a",
      }),
    ).toBe(true);
    expect(
      previewIsOverridden({
        ...none,
        styles: { a: { opacity: 50 } },
        styleKey: "b",
      }),
    ).toBe(false);
  });

  it("is true for copy, type or colour that is not the seed's", () => {
    const base = { ...none, block, defaultBlock: block };
    expect(previewIsOverridden(base)).toBe(false);
    expect(
      previewIsOverridden({ ...base, block: { ...block, text: "Hi" } }),
    ).toBe(true);
    expect(
      previewIsOverridden({ ...base, block: { ...block, roleId: "h2" } }),
    ).toBe(true);
    expect(
      previewIsOverridden({
        ...base,
        block: { ...block, colorTokenId: "fg.muted" },
      }),
    ).toBe(true);
  });

  it("counts any colour as a change when the seed gives no block", () => {
    expect(
      previewIsOverridden({
        ...none,
        block: { ...block, colorTokenId: "fg.muted" },
      }),
    ).toBe(true);
    expect(previewIsOverridden({ ...none, block })).toBe(false);
  });

  it("is true for a band off its seed fill, or holding an image", () => {
    const seeded = {
      id: "landing-hero" as const,
      fill: {
        kind: "token" as const,
        tokenId: PREVIEW_SECTION_SEED_TOKEN["landing-hero"],
      },
    };
    expect(previewIsOverridden({ ...none, section: seeded })).toBe(false);
    expect(
      previewIsOverridden({
        ...none,
        section: {
          ...seeded,
          fill: { kind: "token", tokenId: "surface.raised" },
        },
      }),
    ).toBe(true);
    expect(
      previewIsOverridden({
        ...none,
        section: {
          ...seeded,
          fill: {
            kind: "image",
            imageId: "x",
            fallbackTokenId: "surface.base",
          },
        },
      }),
    ).toBe(true);
  });
});
