import { describe, expect, it } from "vitest";
import { PREVIEW_BUTTON_IDS } from "./preview-shell";
import {
  PREVIEW_CARD_IDS,
  PREVIEW_CHIP_IDS,
  PREVIEW_DIVIDER_IDS,
  clearPreviewStyle,
  isPreviewChip,
  isPreviewDivider,
  isPreviewSurface,
  previewInspectKind,
  previewStyleDeclarations,
  previewSurfaceLabel,
  readPreviewStyles,
  setPreviewStyle,
} from "./preview-styles";
import { previewButtonLook, previewNativeStyle } from "./preview-native";

describe("what the page draws before anything is changed", () => {
  it("says a contained button is filled and casts a shadow, with no edge", () => {
    expect(previewNativeStyle("landing-hero-cta", "button")).toEqual({
      fill: "action.primary",
      hasShadow: true,
    });
  });

  it("says an outlined button has an edge and no fill or shadow", () => {
    const native = previewNativeStyle("landing-hero-ghost", "button");
    expect(native.stroke).toEqual({
      tokenId: "border.default",
      position: "inside",
      weight: 1,
    });
    expect(native.fill).toBeUndefined();
    expect(native.hasShadow).toBeUndefined();
  });

  it("dresses the featured plan's button light on dark, with a shadow", () => {
    expect(previewButtonLook("landing-plan-2-cta")).toBe("inverted");
    expect(previewNativeStyle("landing-plan-2-cta", "button")).toEqual({
      fill: "surface.base",
      hasShadow: true,
    });
  });

  it("looks at every button, so none is missed", () => {
    for (const id of PREVIEW_BUTTON_IDS) {
      const native = previewNativeStyle(id, "button");
      expect(native.fill !== undefined || native.stroke !== undefined).toBe(
        true,
      );
    }
  });

  it("gives every card a fill and an edge, and the featured plan its own", () => {
    for (const id of PREVIEW_CARD_IDS) {
      expect(previewNativeStyle(id, "card").fill).toBeDefined();
      if (id !== "card-pricing-featured") {
        expect(previewNativeStyle(id, "card").stroke).toBeDefined();
      }
    }
    /* Its border is the colour of its fill: no edge to show. */
    expect(
      previewNativeStyle("card-pricing-featured", "card").stroke,
    ).toBeUndefined();
    expect(previewNativeStyle("card-pricing-featured", "card").fill).toBe(
      "fg.primary",
    );
    expect(
      previewNativeStyle("card-newsletter-field", "card").stroke?.tokenId,
    ).toBe("border.default");
  });

  it("draws the nav's divider along its bottom and the footer's along its top", () => {
    expect(previewNativeStyle("shell-nav", "band").stroke?.side).toBe("bottom");
    expect(previewNativeStyle("shell-footer", "band").stroke?.side).toBe("top");
    expect(previewNativeStyle("landing-hero", "band")).toEqual({});
    expect(
      previewNativeStyle("divider-footer-base", "divider").stroke?.side,
    ).toBe("top");
  });

  it("says nothing of text and chips, which have no token of their own", () => {
    expect(previewNativeStyle("landing-hero", "text")).toEqual({});
    expect(previewNativeStyle("landing-plan-2-tag", "chip")).toEqual({});
  });
});

describe("the chip, the divider and the newsletter field", () => {
  it("are told apart from text, from buttons and from each other", () => {
    expect(PREVIEW_CHIP_IDS).toContain("landing-plan-2-tag");
    expect(isPreviewChip("landing-plan-2-tag")).toBe(true);
    expect(previewInspectKind("landing-plan-2-tag")).toBe("chip");
    expect(previewInspectKind("divider-footer-base")).toBe("divider");
    expect(isPreviewDivider("divider-footer-base")).toBe(true);
    expect(previewInspectKind("card-newsletter-field")).toBe("card");
    expect(PREVIEW_DIVIDER_IDS).toContain("divider-footer-base");
    expect(isPreviewSurface("card-pricing")).toBe(true);
    expect(isPreviewSurface("divider-footer-base")).toBe(true);
    expect(isPreviewSurface("landing-hero")).toBe(false);
    expect(previewSurfaceLabel("card-newsletter-field")).toBe(
      "Newsletter field",
    );
    expect(previewSurfaceLabel("divider-footer-base")).toBe("Footer divider");
    expect(previewSurfaceLabel("landing-plan-2-tag")).toBe("Plan tag");
    expect(previewSurfaceLabel("landing-hero")).toBeNull();
  });

  it("fills a chip and sets its text apart, and derives nothing", () => {
    const declared = previewStyleDeclarations(
      { fill: "surface.raised", labelColor: "fg.primary" },
      [],
      "chip",
    );
    expect(declared).toEqual({
      backgroundColor: "var(--color-surface-raised)",
      color: "var(--color-fg-primary)",
    });
    expect(
      previewStyleDeclarations({ fill: "action.primary" }, [], "chip").color,
    ).toBeUndefined();
  });
});

describe("taking an edge or a shadow away", () => {
  const edge = {
    tokenId: "border.default",
    position: "inside",
    weight: 1,
  } as const;

  it("keeps a null as the person's choice of none, through the reader", () => {
    const stored = { a: { stroke: null, shadow: null } };
    expect(readPreviewStyles(stored)).toEqual(stored);
    expect(setPreviewStyle(undefined, "a", { stroke: null })).toEqual({
      a: { stroke: null },
    });
    expect(clearPreviewStyle({ a: { stroke: null } }, "a")).toEqual({});
  });

  it("draws no border and no ring for a stroke taken away", () => {
    const declared = previewStyleDeclarations({ stroke: null }, [], "card");
    expect(declared).toMatchObject({
      borderTopWidth: 0,
      borderRightWidth: 0,
      borderBottomWidth: 0,
      borderLeftWidth: 0,
    });
    expect(declared.boxShadow).toBeUndefined();
  });

  it("draws no shadow for one taken away, and the element's own for one never set", () => {
    expect(
      previewStyleDeclarations({ shadow: null }, [], "button").boxShadow,
    ).toBe("none");
    expect(
      previewStyleDeclarations({}, [], "button", { hasShadow: true }).boxShadow,
    ).toBeUndefined();
  });

  it("keeps the shadow an element had when a ring is drawn over it", () => {
    const declared = previewStyleDeclarations({ stroke: edge }, [], "button", {
      hasShadow: true,
    });
    expect(declared.boxShadow).toBe(
      "inset 0 0 0 1px var(--color-border-default), var(--tw-shadow, 0 0 #0000)",
    );
    /* Not when the shadow is the person's, or is taken away. */
    expect(
      previewStyleDeclarations({ stroke: edge, shadow: null }, [], "button", {
        hasShadow: true,
      }).boxShadow,
    ).toBe("inset 0 0 0 1px var(--color-border-default)");
    expect(
      previewStyleDeclarations({ stroke: edge, shadow: "low" }, [], "button", {
        hasShadow: true,
      }).boxShadow,
    ).toBe("inset 0 0 0 1px var(--color-border-default), var(--shadow-low)");
  });

  it("draws an edge on one side as a border of that side alone", () => {
    const declared = previewStyleDeclarations(
      { stroke: { ...edge, weight: 2, side: "bottom" } },
      [],
      "band",
    );
    expect(declared).toMatchObject({
      borderTopWidth: 0,
      borderRightWidth: 0,
      borderLeftWidth: 0,
      borderBottomWidth: 2,
      borderBottomStyle: "solid",
      borderBottomColor: "var(--color-border-default)",
    });
    expect(declared.boxShadow).toBeUndefined();
  });

  it("reads a side, and drops one that is not an edge", () => {
    expect(
      readPreviewStyles({ a: { stroke: { ...edge, side: "top" } } }).a?.stroke,
    ).toEqual({ ...edge, side: "top" });
    expect(
      readPreviewStyles({ a: { stroke: { ...edge, side: "left" } } }).a?.stroke,
    ).toEqual(edge);
  });
});

describe("what a chip and a divider offer", () => {
  it("gives a chip its copy, type, room, shape, fill, text colour and edge", async () => {
    const { PREVIEW_INSPECT_FIELDS } = await import("./preview-styles");
    expect(PREVIEW_INSPECT_FIELDS.chip).toEqual([
      "copy",
      "typography",
      "padding",
      "radius",
      "fill",
      "labelColor",
      "stroke",
    ]);
    expect(PREVIEW_INSPECT_FIELDS.divider).toEqual(["padding", "stroke"]);
  });
});
