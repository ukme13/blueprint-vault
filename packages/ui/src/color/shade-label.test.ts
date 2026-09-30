import { describe, expect, it } from "vitest";
import {
  MAX_SHADE_LABEL_LENGTH,
  cleanShadeLabel,
  readShadeLabels,
  sanitizeShadeLabel,
  shadeExportComment,
  withShadeLabel,
} from "./shade-label";
import type { TrackAdjustments } from "./types";

const empty = (): TrackAdjustments => ({ anchors: {}, manualOverrides: {} });

/* Built from parts, so this file never holds a comment delimiter of its own. */
const OPEN = "/" + "*";
const CLOSE = "*" + "/";

describe("cleanShadeLabel", () => {
  it("keeps what somebody is typing, spaces included", () => {
    expect(cleanShadeLabel("brand ")).toBe("brand ");
    expect(cleanShadeLabel("  two words")).toBe("  two words");
  });

  it("takes out newlines and comment delimiters", () => {
    expect(cleanShadeLabel("a\nb\tc")).toBe("a b c");
    expect(cleanShadeLabel(`a ${CLOSE} b`)).toBe("a  b");
    expect(cleanShadeLabel(`${OPEN} a ${CLOSE}`)).toBe(" a ");
  });

  it("cannot be made to reassemble a delimiter from what is left", () => {
    /* Removing the middle pair joins the outer characters into a new one. */
    const attacks = [
      "*" + CLOSE + "/",
      "/" + OPEN + "*",
      OPEN + "*" + CLOSE + "/",
      "**" + CLOSE + "//",
    ];
    for (const attack of attacks) {
      const cleaned = cleanShadeLabel(attack);
      expect(cleaned).not.toContain(CLOSE);
      expect(cleaned).not.toContain(OPEN);
    }
  });

  it("caps the length", () => {
    expect(cleanShadeLabel("x".repeat(200))).toHaveLength(
      MAX_SHADE_LABEL_LENGTH,
    );
  });
});

describe("sanitizeShadeLabel", () => {
  it("trims and collapses, and reads a non-string as nothing", () => {
    expect(sanitizeShadeLabel("  brand   blue ")).toBe("brand blue");
    expect(sanitizeShadeLabel("   ")).toBe("");
    expect(sanitizeShadeLabel(42)).toBe("");
    expect(sanitizeShadeLabel(undefined)).toBe("");
  });
});

describe("readShadeLabels", () => {
  it("keeps clean nicknames on whole weights and drops the rest", () => {
    expect(
      readShadeLabels({ 500: "brand", 600: "  ", abc: "x", 700: 3, 800: "ok" }),
    ).toEqual({ 500: "brand", 800: "ok" });
  });

  it("is undefined when nothing is left, or the value is not a record", () => {
    expect(readShadeLabels({ 500: "" })).toBeUndefined();
    expect(readShadeLabels(undefined)).toBeUndefined();
    expect(readShadeLabels(["a"])).toBeUndefined();
    expect(readShadeLabels("brand")).toBeUndefined();
  });
});

describe("withShadeLabel", () => {
  it("sets a nickname, and keeps the anchors and the others", () => {
    const start: TrackAdjustments = {
      anchors: { 200: "#111111" },
      manualOverrides: {},
      labels: { 700: "dark" },
    };
    const next = withShadeLabel(start, 500, "brand");
    expect(next).toEqual({
      anchors: { 200: "#111111" },
      manualOverrides: {},
      labels: { 700: "dark", 500: "brand" },
    });
    /* Not written into the one it was given. */
    expect(start.labels).toEqual({ 700: "dark" });
  });

  it("keeps a trailing space while the field is being typed in", () => {
    expect(withShadeLabel(empty(), 500, "brand ").labels).toEqual({
      500: "brand ",
    });
  });

  it("clears a nickname, and leaves no labels behind when none remain", () => {
    const named = withShadeLabel(empty(), 500, "brand");
    const cleared = withShadeLabel(named, 500, "");
    expect(cleared).toEqual({ anchors: {}, manualOverrides: {} });
    expect("labels" in cleared).toBe(false);
    /* Only spaces is nothing either. */
    expect(withShadeLabel(named, 500, "   ")).toEqual(cleared);
  });
});

describe("shadeExportComment", () => {
  const adjustments = (labels?: Record<number, string>) => ({ labels });

  it("says main for the source and submain for a custom anchor", () => {
    expect(
      shadeExportComment({ weight: 500, anchorType: "source" }, adjustments()),
    ).toBe("main");
    expect(
      shadeExportComment({ weight: 700, anchorType: "custom" }, adjustments()),
    ).toBe("submain");
  });

  it("says nothing for any other shade", () => {
    expect(
      shadeExportComment({ weight: 300, anchorType: null }, adjustments()),
    ).toBeNull();
    expect(
      shadeExportComment({ weight: 300, anchorType: null }, undefined),
    ).toBeNull();
  });

  it("prefers a nickname, even over main and submain", () => {
    const named = adjustments({ 500: "brand", 700: "deep" });
    expect(
      shadeExportComment({ weight: 500, anchorType: "source" }, named),
    ).toBe("brand");
    expect(
      shadeExportComment({ weight: 700, anchorType: "custom" }, named),
    ).toBe("deep");
    expect(
      shadeExportComment(
        { weight: 100, anchorType: null },
        adjustments({ 100: "tint" }),
      ),
    ).toBe("tint");
  });

  it("falls back when the nickname is empty once cleaned", () => {
    expect(
      shadeExportComment(
        { weight: 500, anchorType: "source" },
        adjustments({ 500: "   " }),
      ),
    ).toBe("main");
  });

  it("cleans a nickname that arrives already dirty", () => {
    const comment = shadeExportComment(
      { weight: 500, anchorType: null },
      adjustments({ 500: `x ${CLOSE} body { display: none } ${OPEN}` }),
    );
    expect(comment).not.toContain(CLOSE);
    expect(comment).not.toContain(OPEN);
  });
});
