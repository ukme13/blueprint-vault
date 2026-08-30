import { describe, expect, it } from "vitest";
import {
  DEFAULT_PALETTE_VIEW,
  activeSimulation,
  readPaletteView,
  writePaletteView,
  type PaletteViewPreferences,
} from "./palette-view";

const CUSTOM: PaletteViewPreferences = {
  deficiency: "tritanopia",
  isSimulationOn: true,
  isContrastModeOpen: true,
};

describe("activeSimulation", () => {
  it("is normal vision while the chip is off", () => {
    /* The chip is the on/off, so "off" is a state of the control rather than a
       fifth thing in the list. The chosen deficiency is kept meanwhile, so
       turning it back on returns to the mode being used rather than making
       somebody choose again. */
    expect(activeSimulation({ ...CUSTOM, isSimulationOn: false })).toBe(
      "normal",
    );
  });

  it("is the chosen deficiency while it is on", () => {
    expect(activeSimulation(CUSTOM)).toBe("tritanopia");
  });

  it("defaults to the most common deficiency", () => {
    expect(DEFAULT_PALETTE_VIEW.deficiency).toBe("deuteranopia");
    expect(DEFAULT_PALETTE_VIEW.isSimulationOn).toBe(false);
  });
});

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
    for (const raw of ["not json", "null", "[]", '"tritanopia"', "42", "{"]) {
      expect(readPaletteView(raw), raw).toEqual(DEFAULT_PALETTE_VIEW);
    }
  });

  it("keeps the fields it understands and defaults the rest", () => {
    /* Per field rather than all-or-nothing, so a release that adds a fourth
       mode does not reset the three already stored. */
    expect(readPaletteView('{"deficiency":"protanopia"}')).toEqual({
      deficiency: "protanopia",
      isSimulationOn: false,
      isContrastModeOpen: false,
    });
    expect(readPaletteView('{"isContrastModeOpen":true}')).toEqual({
      deficiency: "deuteranopia",
      isSimulationOn: false,
      isContrastModeOpen: true,
    });
  });

  it("rejects a deficiency that is not one", () => {
    /* "normal" among them: it is a simulation but not a deficiency, and
       storing it here would make the chip's off state expressible two ways. */
    for (const deficiency of [
      "",
      "normal",
      "Deuteranopia",
      "protanomaly",
      3,
      null,
    ]) {
      expect(
        readPaletteView(JSON.stringify({ deficiency })).deficiency,
        String(deficiency),
      ).toBe("deuteranopia");
    }
  });

  it("rejects flags that are not booleans", () => {
    for (const value of ["true", 1, null, {}]) {
      const view = readPaletteView(
        JSON.stringify({ isSimulationOn: value, isContrastModeOpen: value }),
      );
      expect(view.isSimulationOn, String(value)).toBe(false);
      expect(view.isContrastModeOpen, String(value)).toBe(false);
    }
  });

  it("accepts every deficiency the chip can offer", () => {
    for (const deficiency of [
      "protanopia",
      "deuteranopia",
      "tritanopia",
      "achromatopsia",
    ] as const) {
      expect(readPaletteView(JSON.stringify({ deficiency })).deficiency).toBe(
        deficiency,
      );
    }
  });
});
