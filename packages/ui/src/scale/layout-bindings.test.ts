import { describe, expect, it } from "vitest";
import {
  bindLayoutSlot,
  boundLayoutToken,
  layoutBindingVariables,
} from "./layout-bindings";
import type { LayoutToken } from "./layout-tokens";

const layoutUse = (
  id: string,
  value: string | undefined,
  kind: LayoutToken["kind"] = "spacing",
): LayoutToken => ({
  id,
  name: id,
  description: "",
  kind,
  byDevice: value === undefined ? {} : { desktop: value },
});

const layout = [
  layoutUse("inset", "10"),
  layoutUse("gap", "8"),
  layoutUse("wide", "20px"),
  layoutUse("corner", "6", "radius"),
];

describe("boundLayoutToken", () => {
  it("is the slot's own use until it is bound", () => {
    expect(boundLayoutToken(layout, {}, "inset")?.id).toBe("inset");
  });

  it("is the use the slot is bound to", () => {
    expect(boundLayoutToken(layout, { inset: "gap" }, "inset")?.id).toBe("gap");
  });

  it("falls back to its own when the bound use is gone or another kind", () => {
    expect(boundLayoutToken(layout, { inset: "nope" }, "inset")?.id).toBe(
      "inset",
    );
    expect(boundLayoutToken(layout, { inset: "corner" }, "inset")?.id).toBe(
      "inset",
    );
  });
});

describe("bindLayoutSlot", () => {
  it("binds a slot without touching the others", () => {
    expect(bindLayoutSlot({ gap: "wide" }, "inset", "gap")).toEqual({
      gap: "wide",
      inset: "gap",
    });
  });

  it("clears a slot bound back to its own use", () => {
    expect(bindLayoutSlot({ inset: "gap" }, "inset", "inset")).toEqual({});
  });
});

describe("layoutBindingVariables", () => {
  it("is empty when nothing is bound", () => {
    expect(layoutBindingVariables(layout, {}, "desktop")).toEqual({});
  });

  it("sets a bound slot to the size of the use it is bound to", () => {
    expect(layoutBindingVariables(layout, { inset: "gap" }, "desktop")).toEqual(
      { "--inset": "var(--spacing-8)" },
    );
    expect(
      layoutBindingVariables(layout, { inset: "wide" }, "desktop"),
    ).toEqual({ "--inset": "20px" });
  });

  it("does not loop for two slots bound to each other", () => {
    expect(
      layoutBindingVariables(layout, { inset: "gap", gap: "inset" }, "desktop"),
    ).toEqual({ "--inset": "var(--spacing-8)", "--gap": "var(--spacing-10)" });
  });

  it("leaves a slot alone when the bound use has no size on the frame", () => {
    expect(layoutBindingVariables(layout, { inset: "gap" }, "phone")).toEqual(
      {},
    );
  });
});
