import { describe, expect, it } from "vitest";
import {
  DEFAULT_PALETTE_VIEW,
  readPaletteView,
  writePaletteView,
  type PaletteViewPreferences,
} from "./palette-view";

const CUSTOM: PaletteViewPreferences = {
  simulation: "deuteranopia",
  isContrastModeOpen: true,
};

describe("readPaletteView", () => {
  it("returns the defaults when nothing is stored", () => {
    expect(readPaletteView(null)).toEqual(DEFAULT_PALETTE_VIEW);
    expect(readPaletteView("")).toEqual(DEFAULT_PALETTE_VIEW);
  });

  it("round-trips what was written", () => {
    expect(readPaletteView(writePaletteView(CUSTOM))).toEqual(CUSTOM);
  });

  it("survives anything that is not a stored preference", () => {
    /* Never throws. A view mode nobody can parse is worth less than the session
       it would interrupt — the opposite of how a project file is read, where a
       damaged document is worth reporting rather than silently replacing. */
    for (const raw of ["not json", "null", "[]", '"deuteranopia"', "42", "{"]) {
      expect(readPaletteView(raw), raw).toEqual(DEFAULT_PALETTE_VIEW);
    }
  });

  it("keeps the fields it understands and defaults the rest", () => {
    /* Per field rather than all-or-nothing, so a release that adds a third mode
       does not reset the two already stored. */
    expect(readPaletteView('{"simulation":"tritanopia"}')).toEqual({
      simulation: "tritanopia",
      isContrastModeOpen: false,
    });
    expect(readPaletteView('{"isContrastModeOpen":true}')).toEqual({
      simulation: "normal",
      isContrastModeOpen: true,
    });
  });

  it("rejects a simulation that is not one", () => {
    /* Including "normal" spelled wrong, and a deficiency that has since been
       renamed. Anything unrecognised falls back rather than reaching
       simulateColourVisionRgb, which has no matrix for it. */
    for (const simulation of ["", "Normal", "protanomaly", "none", 3, null]) {
      expect(
        readPaletteView(JSON.stringify({ simulation })).simulation,
        String(simulation),
      ).toBe("normal");
    }
  });

  it("rejects a contrast flag that is not a boolean", () => {
    for (const isContrastModeOpen of ["true", 1, null, {}]) {
      expect(
        readPaletteView(JSON.stringify({ isContrastModeOpen }))
          .isContrastModeOpen,
        String(isContrastModeOpen),
      ).toBe(false);
    }
  });

  it("accepts every simulation the studio can offer", () => {
    for (const simulation of [
      "normal",
      "protanopia",
      "deuteranopia",
      "tritanopia",
      "achromatopsia",
    ] as const) {
      expect(readPaletteView(JSON.stringify({ simulation })).simulation).toBe(
        simulation,
      );
    }
  });
});
