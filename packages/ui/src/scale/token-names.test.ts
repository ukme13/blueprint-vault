import { describe, expect, it } from "vitest";
import { tokenIdFromName, tokenNameKey, uniqueTokenName } from "./token-names";

describe("token names", () => {
  it("makes an id from a name", () => {
    expect(tokenIdFromName("  Hero Inset! ")).toBe("hero-inset");
    expect(tokenIdFromName("***")).toBe("");
  });

  it("reads a name the same in any case, order or separator", () => {
    const key = tokenNameKey("Input radius");
    expect(tokenNameKey("radius input")).toBe(key);
    expect(tokenNameKey("RADIUS-INPUT")).toBe(key);
    expect(tokenNameKey("Input radius 2")).not.toBe(key);
  });

  it("keeps a free name as asked", () => {
    expect(
      uniqueTokenName("Hero inset", { ids: ["gap"], names: ["Gap"] }, "use"),
    ).toEqual({ id: "hero-inset", name: "Hero inset" });
  });

  it("numbers a name that reads as a taken name or id", () => {
    const taken = { ids: ["radius-input"], names: ["Input radius"] };
    expect(uniqueTokenName("radius input", taken, "use")).toEqual({
      id: "radius-input-2",
      name: "radius input 2",
    });
    expect(uniqueTokenName("Input Radius", taken, "use").name).toBe(
      "Input Radius 2",
    );
  });

  it("takes the lowest free number", () => {
    const taken = { ids: ["float", "float-2"], names: ["Float", "Float 2"] };
    expect(uniqueTokenName("Float", taken, "level").id).toBe("float-3");
  });

  it("falls back to the given id for a name with no letters", () => {
    expect(uniqueTokenName("***", { ids: [], names: [] }, "level").id).toBe(
      "level",
    );
  });
});
