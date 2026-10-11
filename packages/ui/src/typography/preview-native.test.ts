import { describe, expect, it } from "vitest";
import { PREVIEW_BUTTON_IDS } from "./preview-shell";
import {
  PREVIEW_CARD_IDS,
  PREVIEW_CHIP_IDS,
  PREVIEW_DIVIDER_IDS,
  PREVIEW_INSPECT_FIELDS,
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
import {
  previewButtonAppearance,
  previewButtonLook,
  previewNativeStyle,
  previewVariantNative,
  withButtonVariant,
} from "./preview-native";

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

  it("hides the page's edge and draws no outline for a stroke taken away", () => {
    const declared = previewStyleDeclarations({ stroke: null }, [], "card");
    expect(declared.borderColor).toBe("transparent");
    expect(declared).not.toHaveProperty("outlineStyle");
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

  it("leaves the shadow an element had alone when an edge is drawn, since the edge is an outline", () => {
    const declared = previewStyleDeclarations({ stroke: edge }, [], "button", {
      hasShadow: true,
    });
    expect(declared.boxShadow).toBeUndefined();
    expect(declared.outlineColor).toBe("var(--color-border-default)");
    /* A shadow that is the person's is the box-shadow, with or without an edge. */
    expect(
      previewStyleDeclarations({ stroke: edge, shadow: "low" }, [], "button", {
        hasShadow: true,
      }).boxShadow,
    ).toBe("var(--shadow-low)");
    expect(
      previewStyleDeclarations({ stroke: edge, shadow: null }, [], "button", {
        hasShadow: true,
      }).boxShadow,
    ).toBe("none");
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
  it("gives a chip its copy, type, room, shape, fill, text colour and edge", () => {
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

describe("a closed eye on an edge or a shadow", () => {
  const edge = {
    tokenId: "border.default",
    position: "inside",
    weight: 2,
  } as const;

  it("is kept when it is closed, and is not when it is open", () => {
    const stored = { a: { isStrokeHidden: true, isShadowHidden: true } };
    expect(readPreviewStyles(stored)).toEqual(stored);
    expect(
      readPreviewStyles({
        a: { isStrokeHidden: false, isShadowHidden: "yes", opacity: 40 },
      }),
    ).toEqual({ a: { opacity: 40 } });
    expect(setPreviewStyle(undefined, "a", { isShadowHidden: true })).toEqual({
      a: { isShadowHidden: true },
    });
  });

  it("draws a chosen edge as nothing, and keeps it", () => {
    const style = { stroke: edge, isStrokeHidden: true } as const;
    const declared = previewStyleDeclarations(style, [], "card");
    expect(declared).not.toHaveProperty("outlineStyle");
    expect(declared.borderColor).toBe("transparent");
    /* Open again, the same edge is drawn, and the same size is kept. */
    const open = previewStyleDeclarations({ stroke: edge }, [], "card");
    expect(open).toMatchObject({
      outlineWidth: "2px",
      outlineColor: "var(--color-border-default)",
      outlineOffset: "-2px",
    });
    expect(open).not.toHaveProperty("borderTopWidth");
  });

  it("draws the edge the page had as nothing too", () => {
    const declared = previewStyleDeclarations(
      { isStrokeHidden: true },
      [],
      "button",
      { stroke: edge },
    );
    expect(declared.borderColor).toBe("transparent");
    expect(declared).not.toHaveProperty("outlineStyle");
    expect(declared.boxShadow).toBeUndefined();
  });

  it("draws an edge on one side as no border of that side", () => {
    const declared = previewStyleDeclarations(
      { stroke: { ...edge, side: "top" }, isStrokeHidden: true },
      [],
      "divider",
    );
    expect(declared.borderColor).toBe("transparent");
    expect(declared).not.toHaveProperty("borderTopStyle");
  });

  it("draws a chosen shadow as none, and leaves the edge", () => {
    const declared = previewStyleDeclarations(
      { stroke: edge, shadow: "low", isShadowHidden: true },
      [],
      "button",
      { hasShadow: true },
    );
    expect(declared.boxShadow).toBe("none");
    expect(declared.outlineColor).toBe("var(--color-border-default)");
  });

  it("draws the shadow the page had as none", () => {
    expect(
      previewStyleDeclarations({ isShadowHidden: true }, [], "button", {
        hasShadow: true,
      }).boxShadow,
    ).toBe("none");
  });

  it("hides the one and not the other", () => {
    const declared = previewStyleDeclarations(
      { stroke: edge, shadow: "low", isStrokeHidden: true },
      [],
      "card",
    );
    expect(declared.boxShadow).toBe("var(--shadow-low)");
    expect(declared).not.toHaveProperty("outlineStyle");
  });
});

describe("a button dressed the other way", () => {
  const edge = {
    tokenId: "border.default",
    position: "inside",
    weight: 1,
  } as const;

  it("is offered to buttons and to nothing else", () => {
    expect(PREVIEW_INSPECT_FIELDS.button).toContain("variant");
    for (const kind of ["text", "band", "card", "chip", "divider"] as const) {
      expect(PREVIEW_INSPECT_FIELDS[kind]).not.toContain("variant");
    }
  });

  it("reads how the page draws a button, the featured plan's as a filled one", () => {
    expect(previewButtonAppearance("landing-hero-cta")).toBe("contained");
    expect(previewButtonAppearance("landing-plan-2-cta")).toBe("contained");
    expect(previewButtonAppearance("landing-hero-ghost")).toBe("outlined");
  });

  it("gives each variant its own fill, edge and shadow, as tokens", () => {
    expect(previewVariantNative("contained")).toEqual({
      fill: "action.primary",
      shadow: "low",
    });
    expect(previewVariantNative("outlined")).toEqual({ stroke: edge });
    expect(
      previewNativeStyle("landing-hero-ghost", "button", "contained"),
    ).toEqual(previewVariantNative("contained"));
    expect(
      previewNativeStyle("landing-hero-cta", "button", "outlined"),
    ).toEqual(previewVariantNative("outlined"));
  });

  it("switches to the other pattern and drops what belonged to this one, keeping room and shape", () => {
    const set = {
      padding: { top: 4 },
      radius: { topLeft: "full" },
      fill: "surface.raised",
      labelColor: "fg.muted",
      stroke: edge,
      shadow: "med",
      isStrokeHidden: true,
      isShadowHidden: true,
    };
    expect(withButtonVariant(set, "landing-hero-cta", "outlined")).toEqual({
      padding: { top: 4 },
      radius: { topLeft: "full" },
      variant: "outlined",
    });
  });

  it("clears the variant when the page already draws it that way", () => {
    expect(
      withButtonVariant(
        { variant: "outlined", opacity: 50 },
        "landing-hero-cta",
        "contained",
      ),
    ).toEqual({ opacity: 50 });
    expect(withButtonVariant({}, "landing-hero-ghost", "outlined")).toEqual({});
  });

  it("keeps a variant that is valid, and drops one that is not", () => {
    expect(readPreviewStyles({ a: { variant: "outlined" } })).toEqual({
      a: { variant: "outlined" },
    });
    expect(readPreviewStyles({ a: { variant: "ghost", opacity: 30 } })).toEqual(
      {
        a: { opacity: 30 },
      },
    );
  });

  it("draws an outlined button as contained: filled, labelled to read, lightly shadowed, edgeless", () => {
    const declared = previewStyleDeclarations(
      { variant: "contained" },
      [],
      "button",
      previewNativeStyle("landing-hero-ghost", "button", "contained"),
    );
    expect(declared).toMatchObject({
      backgroundColor: "var(--color-action-primary)",
      color: "var(--color-fg-on-action)",
      boxShadow: "var(--shadow-low)",
      borderColor: "transparent",
    });
    expect(declared).not.toHaveProperty("outlineStyle");
  });

  it("draws a contained button as outlined: transparent, plain text, an edge, no shadow", () => {
    const declared = previewStyleDeclarations(
      { variant: "outlined" },
      [],
      "button",
      previewNativeStyle("landing-hero-cta", "button", "outlined"),
    );
    expect(declared).toMatchObject({
      backgroundColor: "transparent",
      color: "var(--color-fg-primary)",
      boxShadow: "none",
      outlineStyle: "solid",
      outlineWidth: "1px",
      outlineColor: "var(--color-border-default)",
      outlineOffset: "-1px",
      borderColor: "transparent",
    });
  });

  it("lets what is set on the button win over the variant's", () => {
    const declared = previewStyleDeclarations(
      {
        variant: "outlined",
        fill: "surface.raised",
        shadow: "high",
        labelColor: "fg.muted",
      },
      [],
      "button",
      previewNativeStyle("landing-hero-cta", "button", "outlined"),
    );
    expect(declared).toMatchObject({
      backgroundColor: "var(--color-surface-raised)",
      color: "var(--color-fg-muted)",
    });
    expect(declared.boxShadow).toBe("var(--shadow-high)");
    expect(declared.outlineColor).toBe("var(--color-border-default)");
  });

  it("draws nothing of a variant on what is not a button", () => {
    expect(
      previewStyleDeclarations({ variant: "outlined" }, [], "card", {}),
    ).toEqual({});
  });
});
