import {
  isColourVisionSimulation,
  type ColourVisionSimulation,
} from "./vision";

/*
 * How the palette is currently being looked at.
 *
 * A display preference, not part of the document — the same reasoning that
 * keeps `blueprint.colour-format.v1` out of the workspace. Two people opening
 * the same project should not inherit each other's simulation mode, and an
 * exported project file must not carry one.
 *
 * Both modes live under one key because they are one decision from the user's
 * side: how the preview is being read right now.
 */

export const PALETTE_VIEW_STORAGE_KEY = "blueprint.palette-view.v1";

export interface PaletteViewPreferences {
  /** Which colour-vision simulation the preview is rendered through. */
  simulation: ColourVisionSimulation;
  /** Whether the WCAG contrast comparison panel is open. */
  isContrastModeOpen: boolean;
}

export const DEFAULT_PALETTE_VIEW: PaletteViewPreferences = {
  simulation: "normal",
  isContrastModeOpen: false,
};

/**
 * Read stored preferences, falling back per field rather than wholesale.
 *
 * Stored data, so this never throws: a preference nobody can parse is worth
 * less than the session it would interrupt. That is the opposite of how a
 * project file is read, and deliberately so — losing a view mode costs a click,
 * losing a project costs someone's work.
 *
 * Per field rather than all-or-nothing because the two are independent. A
 * release that adds a third mode should not reset the two already stored.
 */
export function readPaletteView(raw: string | null): PaletteViewPreferences {
  if (!raw) return DEFAULT_PALETTE_VIEW;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return DEFAULT_PALETTE_VIEW;
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return DEFAULT_PALETTE_VIEW;
  }

  const value = parsed as Record<string, unknown>;

  return {
    simulation: isColourVisionSimulation(value.simulation)
      ? value.simulation
      : DEFAULT_PALETTE_VIEW.simulation,
    isContrastModeOpen:
      typeof value.isContrastModeOpen === "boolean"
        ? value.isContrastModeOpen
        : DEFAULT_PALETTE_VIEW.isContrastModeOpen,
  };
}

export function writePaletteView(view: PaletteViewPreferences): string {
  return JSON.stringify(view);
}
