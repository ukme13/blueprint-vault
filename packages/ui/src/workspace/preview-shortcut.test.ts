import { describe, expect, it } from "vitest";
import {
  previewShortcutDestination,
  previewShortcutReturnPath,
} from "./preview-shortcut";

describe("previewShortcutDestination", () => {
  it("opens preview from a studio", () => {
    expect(previewShortcutDestination("/colour", null)).toBe("/preview");
    expect(previewShortcutDestination("/spacing", "/colour")).toBe("/preview");
  });

  it("returns to the studio that opened preview", () => {
    expect(previewShortcutDestination("/preview", "/typography")).toBe(
      "/typography",
    );
  });

  it("falls back to colour when preview has nowhere to return", () => {
    expect(previewShortcutDestination("/preview", null)).toBe("/colour");
    expect(previewShortcutDestination("/preview", "/")).toBe("/colour");
    expect(previewShortcutDestination("/preview", "/preview")).toBe("/colour");
  });
});

describe("previewShortcutReturnPath", () => {
  it("remembers the studio, not home or preview", () => {
    expect(previewShortcutReturnPath("/colour")).toBe("/colour");
    expect(previewShortcutReturnPath("/radius")).toBe("/radius");
    expect(previewShortcutReturnPath("/preview")).toBeNull();
    expect(previewShortcutReturnPath("/")).toBeNull();
  });
});
