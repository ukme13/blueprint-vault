import { describe, expect, it } from "vitest";
import { findSheetOption, sheetOptionGroups } from "./selector-sheet";

const options = [
  { value: "none", label: "Default" },
  {
    type: "section" as const,
    title: "Primary",
    options: [
      { value: "p:50", label: "Primary 50" },
      { value: "p:900", label: "Primary 900" },
    ],
  },
  { type: "divider" as const },
  "loose",
  {
    type: "section" as const,
    title: "Neutral",
    options: [{ value: "n:50", label: "Neutral 50" }],
  },
];

describe("sheetOptionGroups", () => {
  it("keeps sections under their titles and loose options in order", () => {
    expect(
      sheetOptionGroups(options).map((group) => [
        group.title,
        group.options.map((option) => option.value),
      ]),
    ).toEqual([
      [undefined, ["none"]],
      ["Primary", ["p:50", "p:900"]],
      [undefined, ["loose"]],
      ["Neutral", ["n:50"]],
    ]);
  });

  it("narrows by label or value, ignoring case, and drops emptied groups", () => {
    expect(
      sheetOptionGroups(options, "  PRIMARY 9").map((group) => [
        group.title,
        group.options.map((option) => option.value),
      ]),
    ).toEqual([["Primary", ["p:900"]]]);
    expect(sheetOptionGroups(options, "n:5")[0]!.title).toBe("Neutral");
  });

  it("gives a plain string option its own text as a label", () => {
    expect(sheetOptionGroups(["loose"])[0]!.options[0]).toEqual({
      value: "loose",
      label: "loose",
    });
  });
});

describe("findSheetOption", () => {
  it("finds an option inside a section", () => {
    expect(findSheetOption(options, "p:900")?.label).toBe("Primary 900");
  });

  it("finds nothing for no value or an unknown one", () => {
    expect(findSheetOption(options, undefined)).toBeUndefined();
    expect(findSheetOption(options, "gone")).toBeUndefined();
  });
});
