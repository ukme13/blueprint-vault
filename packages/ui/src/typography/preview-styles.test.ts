import { describe, expect, it } from "vitest";
import type { SemanticToken } from "../color/semantic";
import {
  clearPreviewStyle,
  isPreviewCard,
  PREVIEW_CARD_IDS,
  PREVIEW_CARD_LABEL,
  PREVIEW_INSPECT_FIELDS,
  previewButtonLabelOf,
  previewButtonLabelToken,
  previewInspectKind,
  previewInspectOffers,
  previewStyleKey,
  previewStyleDeclarations,
  previewStyleOf,
  readPadding,
  readPreviewStyles,
  readRadius,
  setPreviewStyle,
  withPadding,
  withRadius,
} from "./preview-styles";

const token = (id: string): SemanticToken => ({
  id,
  name: id,
  description: "",
  light: { trackId: "t", weight: 500 },
  dark: { trackId: "t", weight: 500 },
});

describe("what kind of element an id is", () => {
  it("is a band when told so, a button for a button, and text for the rest", () => {
    expect(previewInspectKind("landing-hero", true)).toBe("band");
    expect(previewInspectKind("shell-action")).toBe("button");
    expect(previewInspectKind("landing-title")).toBe("text");
    expect(previewInspectKind("shell-brand")).toBe("text");
  });

  it("is a card for the three groups of cards, which no slot or band shares", () => {
    expect(previewInspectKind("card-feature-card")).toBe("card");
    expect(previewInspectKind("card-quad-card")).toBe("card");
    expect(previewInspectKind("card-pricing")).toBe("card");
    expect(previewInspectKind("card-pricing-featured")).toBe("card");
    expect(isPreviewCard("card-pricing")).toBe(true);
    expect(PREVIEW_CARD_LABEL["card-pricing-featured"]).toBe("Featured plan");
    expect(isPreviewCard("landing-hero")).toBe(false);
    expect(PREVIEW_CARD_LABEL["card-pricing"]).toBe("Pricing cards");
    for (const id of PREVIEW_CARD_IDS) {
      expect(previewInspectKind(id, true)).toBe("band");
      expect(previewStyleKey(id)).toBe(id);
    }
  });

  it("tells a band from a slot that shares its id", () => {
    /* The quote is both: a band, and the text in it. */
    expect(previewInspectKind("landing-quote")).toBe("text");
    expect(previewInspectKind("landing-quote", true)).toBe("band");
    expect(previewStyleKey("landing-quote")).toBe("landing-quote");
    expect(previewStyleKey("landing-quote", true)).toBe("band:landing-quote");
    expect(previewStyleKey("shell-footer", true)).not.toBe(
      previewStyleKey("shell-footer"),
    );
  });

  it("offers each kind what the design gives it", () => {
    expect(PREVIEW_INSPECT_FIELDS.text).toEqual([
      "copy",
      "typography",
      "fill",
      "opacity",
    ]);
    expect(PREVIEW_INSPECT_FIELDS.button).toEqual([
      "copy",
      "typography",
      "variant",
      "padding",
      "radius",
      "fill",
      "labelColor",
      "stroke",
      "effects",
    ]);
    expect(PREVIEW_INSPECT_FIELDS.card).toEqual([
      "gap",
      "padding",
      "opacity",
      "radius",
      "fill",
      "stroke",
      "effects",
    ]);
    /* A band has no gap: nothing in it to put a space between. */
    expect(previewInspectOffers("band", "gap")).toBe(false);
    expect(previewInspectOffers("card", "gap")).toBe(true);
    expect(PREVIEW_INSPECT_FIELDS.band).toEqual([
      "padding",
      "opacity",
      "radius",
      "fill",
      "stroke",
      "effects",
    ]);
    expect(previewInspectOffers("button", "labelColor")).toBe(true);
    for (const kind of ["text", "band", "card"] as const) {
      expect(previewInspectOffers(kind, "labelColor")).toBe(false);
    }
    expect(previewInspectOffers("button", "gap")).toBe(false);
    expect(previewInspectOffers("button", "opacity")).toBe(false);
    expect(previewInspectOffers("band", "typography")).toBe(false);
    expect(previewInspectOffers("text", "stroke")).toBe(false);
  });
});

describe("readPreviewStyles", () => {
  it("is empty for nothing, and for what is not a map", () => {
    for (const value of [undefined, null, 4, "x", []]) {
      expect(readPreviewStyles(value)).toEqual({});
    }
  });

  it("keeps what is well formed", () => {
    const stored = {
      "landing-hero": {
        gap: 4,
        padding: { top: 8, bottom: 8 },
        opacity: 80,
        radius: { topLeft: "container" },
        stroke: { tokenId: "border.default", position: "outside", weight: 2 },
        shadow: "low",
      },
      "landing-hero-cta": { fill: "action.primary", labelColor: "fg.primary" },
    };
    expect(readPreviewStyles(stored)).toEqual(stored);
  });

  it("drops a label colour that is not an id", () => {
    expect(
      readPreviewStyles({
        a: { labelColor: 3, opacity: 40 },
        b: { labelColor: "" },
      }),
    ).toEqual({ a: { opacity: 40 } });
  });

  it("drops what cannot be read, and an element left with nothing", () => {
    expect(
      readPreviewStyles({
        a: { gap: -1, padding: { top: "x" }, radius: { topLeft: "" } },
        b: "nope",
        c: { shadow: 5 },
        d: { opacity: 40 },
      }),
    ).toEqual({ d: { opacity: 40 } });
  });

  it("clamps an opacity, and makes a stroke that is not one an inside 1px", () => {
    expect(readPreviewStyles({ a: { opacity: 240 } }).a?.opacity).toBe(100);
    expect(readPreviewStyles({ a: { opacity: -5 } }).a?.opacity).toBe(0);
    expect(
      readPreviewStyles({
        a: { stroke: { tokenId: "border.default", position: "x", weight: 17 } },
      }).a?.stroke,
    ).toEqual({ tokenId: "border.default", position: "inside", weight: 1 });
  });
});

describe("editing an element's style", () => {
  it("sets, reads and clears, leaving no empty entry", () => {
    const set = setPreviewStyle({}, "landing-hero", { gap: 2 });
    expect(previewStyleOf(set, "landing-hero")).toEqual({ gap: 2 });
    expect(previewStyleOf(set, "landing-cta")).toEqual({});
    expect(clearPreviewStyle(set, "landing-hero")).toEqual({});
    expect(setPreviewStyle(set, "landing-hero", {})).toEqual({});
  });

  it("leaves the other elements, and the map it was given, as they were", () => {
    const first = { "landing-cta": { opacity: 50 } };
    const next = setPreviewStyle(first, "landing-hero", { gap: 2 });
    expect(next["landing-cta"]).toEqual({ opacity: 50 });
    expect(first).toEqual({ "landing-cta": { opacity: 50 } });
  });
});

describe("padding", () => {
  it("sets an axis, a side or all four, and puts them back", () => {
    let style = withPadding({}, "x", 4);
    expect(style.padding).toEqual({ left: 4, right: 4 });
    style = withPadding(style, "y", 2);
    expect(style.padding).toEqual({ left: 4, right: 4, top: 2, bottom: 2 });
    style = withPadding(style, "top", 6);
    expect(style.padding?.top).toBe(6);
    expect(withPadding(style, "all", 1).padding).toEqual({
      top: 1,
      right: 1,
      bottom: 1,
      left: 1,
    });
    expect(withPadding(withPadding({}, "all", 3), "all", undefined)).toEqual(
      {},
    );
  });

  it("reads none, the same, or mixed", () => {
    expect(readPadding({}, "x")).toEqual({ kind: "none" });
    expect(readPadding(withPadding({}, "x", 4), "x")).toEqual({
      kind: "same",
      value: 4,
    });
    expect(readPadding(withPadding({}, "left", 4), "x")).toEqual({
      kind: "mixed",
    });
    const uneven = withPadding(withPadding({}, "x", 4), "top", 6);
    expect(readPadding(uneven, "all")).toEqual({ kind: "mixed" });
  });
});

describe("radius", () => {
  it("sets a corner or all four, and reads Mixed when they differ", () => {
    const all = withRadius({}, "all", "element");
    expect(readRadius(all, "all")).toEqual({ kind: "same", value: "element" });
    const mixed = withRadius(all, "topRight", "container");
    expect(readRadius(mixed, "all")).toEqual({ kind: "mixed" });
    expect(readRadius(mixed, "topLeft")).toEqual({
      kind: "same",
      value: "element",
    });
    expect(withRadius(mixed, "all", undefined)).toEqual({});
    expect(readRadius({}, "all")).toEqual({ kind: "none" });
  });
});

describe("previewButtonLabelToken", () => {
  it("is the role the seed measures a label against the fill with", () => {
    expect(previewButtonLabelToken("action.primary", [])).toBe("fg.on-action");
    expect(previewButtonLabelToken("status.success", [])).toBe("fg.on-success");
  });

  it("is a tone family's own label role when it has one", () => {
    expect(
      previewButtonLabelToken("action.accent", [token("fg.on-accent")]),
    ).toBe("fg.on-accent");
  });

  it("is ordinary text on a surface, which has no label role", () => {
    expect(previewButtonLabelToken("surface.raised", [])).toBe("fg.primary");
  });
});

describe("previewStyleDeclarations", () => {
  it("draws no gap where an element has nothing to space, whatever is stored", () => {
    for (const kind of ["band", "button", "text", "chip", "divider"] as const) {
      expect(previewStyleDeclarations({ gap: 4 }, [], kind)).toEqual({});
    }
    expect(previewStyleDeclarations({ gap: 4 }, [], "card").gap).toBe(
      "var(--spacing-4)",
    );
  });

  it("draws nothing for nothing", () => {
    expect(previewStyleDeclarations({})).toEqual({});
  });

  it("writes every length as a variable and opacity as a fraction", () => {
    expect(
      previewStyleDeclarations(
        {
          gap: 2.5,
          padding: { top: 4, left: 8 },
          opacity: 40,
          radius: { topLeft: "container", bottomRight: "full" },
        },
        [],
        "card",
      ),
    ).toEqual({
      gap: "var(--spacing-2-5)",
      paddingTop: "var(--spacing-4)",
      paddingLeft: "var(--spacing-8)",
      opacity: 0.4,
      borderTopLeftRadius: "var(--radius-container)",
      borderBottomRightRadius: "var(--radius-full)",
    });
  });

  it("draws a stroke as an outline, inside, outside or centred", () => {
    const stroke = (position: "inside" | "center" | "outside") =>
      previewStyleDeclarations({
        stroke: { tokenId: "border.default", position, weight: 2 },
      });
    expect(stroke("inside")).toMatchObject({
      outlineStyle: "solid",
      outlineWidth: "2px",
      outlineColor: "var(--color-border-default)",
      outlineOffset: "-2px",
    });
    expect(stroke("center").outlineOffset).toBe("-1px");
    expect(stroke("outside").outlineOffset).toBe("0px");
    /* The outline takes no room, and leaves the shadow to the shadow. */
    expect(stroke("inside").boxShadow).toBeUndefined();
  });

  it("keeps a stroke and a shadow apart: one in the outline, one in the box-shadow", () => {
    const declared = previewStyleDeclarations({
      shadow: "low",
      stroke: { tokenId: "border.default", position: "inside", weight: 1 },
    });
    expect(declared.boxShadow).toBe("var(--shadow-low)");
    expect(declared.outlineColor).toBe("var(--color-border-default)");
    expect(previewStyleDeclarations({ shadow: "med" }).boxShadow).toBe(
      "var(--shadow-med)",
    );
  });

  it("gives way the element's own border to a stroke by its colour, so the element keeps its size", () => {
    const stroke = {
      tokenId: "border.default",
      position: "inside",
      weight: 2,
    } as const;
    for (const kind of ["button", "card", "band"] as const) {
      const declared = previewStyleDeclarations({ stroke }, [], kind);
      expect(declared.borderColor).toBe("transparent");
      /* No width is changed: that is what changed the size. */
      for (const side of ["Top", "Right", "Bottom", "Left"]) {
        expect(declared).not.toHaveProperty(`border${side}Width`);
      }
    }
  });

  it("hides the page's own edge the same way when a stroke is taken away", () => {
    const declared = previewStyleDeclarations({ stroke: null }, [], "card");
    expect(declared.borderColor).toBe("transparent");
    expect(declared).not.toHaveProperty("outlineStyle");
    expect(declared).not.toHaveProperty("borderTopWidth");
  });

  it("leaves the element's own border alone with no stroke", () => {
    for (const kind of ["button", "card", "band"] as const) {
      const declared = previewStyleDeclarations(
        { shadow: "low", fill: "surface.raised" },
        [],
        kind,
      );
      expect(
        Object.keys(declared).some(
          (key) => key.startsWith("border") || key.startsWith("outline"),
        ),
      ).toBe(false);
    }
  });

  it("sets no border or outline shorthand beside the longhands it sets", () => {
    const declared = previewStyleDeclarations(
      { stroke: { tokenId: "border.default", position: "outside", weight: 1 } },
      [],
      "button",
    );
    for (const shorthand of ["border", "borderWidth", "outline"]) {
      expect(declared).not.toHaveProperty(shorthand);
    }
  });

  it("fills a button, and labels it so it reads", () => {
    const declared = previewStyleDeclarations(
      { fill: "action.primary" },
      [],
      "button",
    );
    expect(declared.backgroundColor).toBe("var(--color-action-primary)");
    expect(declared.color).toBe("var(--color-fg-on-action)");
  });

  it("labels a button with a colour of its own over the one its fill gives", () => {
    const chosen = previewStyleDeclarations(
      { fill: "action.primary", labelColor: "fg.primary" },
      [],
      "button",
    );
    expect(chosen.backgroundColor).toBe("var(--color-action-primary)");
    expect(chosen.color).toBe("var(--color-fg-primary)");

    /* With no fill the label is the only thing set. */
    expect(
      previewStyleDeclarations({ labelColor: "fg.secondary" }, [], "button"),
    ).toEqual({ color: "var(--color-fg-secondary)" });

    /* Taken away, the label is derived from the fill again. */
    const { labelColor, ...rest } = {
      fill: "action.primary",
      labelColor: "fg.primary",
    };
    void labelColor;
    expect(previewStyleDeclarations(rest, [], "button").color).toBe(
      "var(--color-fg-on-action)",
    );
  });

  it("draws a label colour only on a button", () => {
    for (const kind of ["text", "band", "card"] as const) {
      expect(
        previewStyleDeclarations({ labelColor: "fg.primary" }, [], kind),
      ).toEqual({});
    }
  });

  it("says which label a button has, and whether it was chosen", () => {
    expect(previewButtonLabelOf({}, [])).toBeNull();
    expect(previewButtonLabelOf({ fill: "action.primary" }, [])).toEqual({
      tokenId: "fg.on-action",
      isChosen: false,
    });
    expect(
      previewButtonLabelOf(
        { fill: "action.primary", labelColor: "fg.primary" },
        [],
      ),
    ).toEqual({ tokenId: "fg.primary", isChosen: true });
  });

  it("fills a card with its token and leaves its copy's colour alone", () => {
    const declared = previewStyleDeclarations(
      { fill: "surface.raised" },
      [],
      "card",
    );
    expect(declared).toEqual({
      backgroundColor: "var(--color-surface-raised)",
    });
  });

  it("leaves a band's fill and a text's colour to what draws them", () => {
    for (const kind of ["band", "text"] as const) {
      const declared = previewStyleDeclarations(
        { fill: "surface.raised" },
        [],
        kind,
      );
      expect(declared).toEqual({});
    }
  });
});
