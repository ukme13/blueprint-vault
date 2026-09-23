import { describe, expect, it } from "vitest";
import {
  contrastDraftToOpen,
  DEFAULT_CONTRAST_SETTINGS,
  DEFAULT_PALETTE_VIEW,
  DEFAULT_VISION_SETTINGS,
  visionDraftToOpen,
  visionSettingsOf,
  withVisionSettings,
  type PaletteViewPreferences,
} from "./palette-view";

/*
 * What the phone's settings sheets commit.
 *
 * On a phone, WCAG 2 and Vision open a bottom sheet with Reset, Cancel and
 * Apply, so the view has to be settable in one step rather than toggled into
 * place. These are the functions Apply goes through.
 */

const ON: PaletteViewPreferences = {
  deficiency: "protanopia",
  severity: 0.6,
  isSimulationOn: true,
  isContrastModeOpen: true,
};

describe("applying Vision settings", () => {
  it("sets all three at once, and nothing else", () => {
    const next = withVisionSettings(DEFAULT_PALETTE_VIEW, {
      isSimulationOn: true,
      deficiency: "tritanopia",
      severity: 0.3,
    });

    expect(next).toEqual({
      ...DEFAULT_PALETTE_VIEW,
      isSimulationOn: true,
      deficiency: "tritanopia",
      severity: 0.3,
    });
    /* Contrast mode belongs to the other sheet. */
    expect(next.isContrastModeOpen).toBe(
      DEFAULT_PALETTE_VIEW.isContrastModeOpen,
    );
  });

  it("turns the simulation off without forgetting what it was set to", () => {
    /* Off is a switch, not a reset: the next time it goes on it should be
       the deficiency and severity somebody chose. */
    const next = withVisionSettings(ON, {
      ...visionSettingsOf(ON),
      isSimulationOn: false,
    });

    expect(next.isSimulationOn).toBe(false);
    expect(next.deficiency).toBe("protanopia");
    expect(next.severity).toBe(0.6);
  });

  it("keeps what the view had rather than committing a value it cannot use", () => {
    /* Apply should never change something the reader did not touch — and a
       severity the studio does not offer, or a deficiency with no matrix, is
       nothing the reader could have chosen. */
    const next = withVisionSettings(ON, {
      isSimulationOn: true,
      deficiency: "normal" as never,
      severity: 0.35,
    });

    expect(next.deficiency).toBe("protanopia");
    expect(next.severity).toBe(0.6);
  });

  it("round-trips a view through its own settings unchanged", () => {
    expect(withVisionSettings(ON, visionSettingsOf(ON))).toEqual(ON);
  });
});

describe("opening a sheet", () => {
  it("starts the Vision draft on, whatever the chip was", () => {
    /* Tapping Vision is asking to use it. A draft that opened off would make
       Apply do nothing on the first visit. */
    const draft = visionDraftToOpen(DEFAULT_PALETTE_VIEW);

    expect(DEFAULT_PALETTE_VIEW.isSimulationOn).toBe(false);
    expect(draft.isSimulationOn).toBe(true);
    expect(draft.deficiency).toBe(DEFAULT_PALETTE_VIEW.deficiency);
  });

  it("starts the WCAG draft on, keeping the target", () => {
    const draft = contrastDraftToOpen({
      isOn: false,
      target: "black",
      customColour: "#123456",
    });

    expect(draft).toEqual({
      isOn: true,
      target: "black",
      customColour: "#123456",
    });
  });
});

describe("what Reset goes back to", () => {
  it("is how a fresh studio starts, for both sheets", () => {
    expect(DEFAULT_VISION_SETTINGS).toEqual(
      visionSettingsOf(DEFAULT_PALETTE_VIEW),
    );
    expect(DEFAULT_CONTRAST_SETTINGS.isOn).toBe(
      DEFAULT_PALETTE_VIEW.isContrastModeOpen,
    );
    expect(DEFAULT_CONTRAST_SETTINGS.target).toBe("white");
  });
});
