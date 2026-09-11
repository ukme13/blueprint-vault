import { describe, expect, it } from "vitest";
import { fluidEmClamp, fluidLengthClamp, fluidUnitlessClamp } from "./fluid";

describe("fluidLengthClamp", () => {
  it("interpolates 14px at 375 to 18px at 768", () => {
    expect(fluidLengthClamp(375, 14, 768, 18, "px")).toBe(
      "clamp(14px, calc(14px + 4px * (100vw - 375px) / 393px), 18px)",
    );
  });

  it("keeps the value unit when exporting rem, and the viewport in px", () => {
    expect(fluidLengthClamp(375, 16, 768, 24, "rem")).toBe(
      "clamp(1rem, calc(1rem + 0.5rem * (100vw - 375px) / 393px), 1.5rem)",
    );
  });

  it("divides rem by a configured root", () => {
    expect(fluidLengthClamp(375, 18, 768, 18, "rem", 18)).toBe("1rem");
  });

  it("puts the smaller size first when type shrinks as the viewport grows", () => {
    expect(fluidLengthClamp(375, 24, 768, 16, "px")).toBe(
      "clamp(16px, calc(24px - 8px * (100vw - 375px) / 393px), 24px)",
    );
  });

  it("returns a static value when the sizes match", () => {
    expect(fluidLengthClamp(375, 16, 768, 16, "px")).toBe("16px");
  });
});

describe("fluidUnitlessClamp", () => {
  it("interpolates a line-height ratio without giving it a unit", () => {
    expect(fluidUnitlessClamp(375, 2, 768, 1.1)).toBe(
      "clamp(1.1, calc(2 - 0.9 * (100vw - 375px) / 393px), 2)",
    );
  });
});

describe("fluidEmClamp", () => {
  it("interpolates tracking already converted to em", () => {
    expect(fluidEmClamp(375, -0.0208, 768, 0)).toBe(
      "clamp(-0.0208em, calc(-0.0208em + 0.0208em * (100vw - 375px) / 393px), 0em)",
    );
  });
});
