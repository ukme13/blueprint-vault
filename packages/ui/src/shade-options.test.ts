import { describe, expect, it } from "vitest";
import {
  parseShadeOptionValue,
  shadeOptionSections,
  shadeOptionValue,
} from "./shade-options";

const tracks = [
  {
    id: "primary",
    name: "primary",
    shades: [
      { weight: 50, hex: "#fff" },
      { weight: 900, hex: "#111" },
    ],
  },
  { id: "neutral", name: "neutral", shades: [{ weight: 950, hex: "#000" }] },
];

describe("shade options", () => {
  it("round-trips a value", () => {
    const value = shadeOptionValue({ trackId: "primary", weight: 900 });
    expect(value).toBe("primary:900");
    expect(parseShadeOptionValue(value)).toEqual({
      trackId: "primary",
      weight: 900,
    });
  });

  it("splits on the last colon", () => {
    expect(parseShadeOptionValue("brand:accent:500")).toEqual({
      trackId: "brand:accent",
      weight: 500,
    });
  });

  it("rejects a value that is not a shade", () => {
    for (const value of ["", "primary", ":500", "primary:", "primary:dark"]) {
      expect(parseShadeOptionValue(value)).toBeNull();
    }
  });

  it("groups one section per track, labelled for search", () => {
    const sections = shadeOptionSections(tracks, (hex) => `swatch ${hex}`);
    expect(sections.map((section) => section.title)).toEqual([
      "primary",
      "neutral",
    ]);
    expect(sections[0]!.options).toEqual([
      { label: "primary 50", value: "primary:50", icon: "swatch #fff" },
      { label: "primary 900", value: "primary:900", icon: "swatch #111" },
    ]);
  });

  it("leaves the icon off when none is drawn", () => {
    expect(shadeOptionSections(tracks)[1]!.options[0]).toEqual({
      label: "neutral 950",
      value: "neutral:950",
    });
  });
});
