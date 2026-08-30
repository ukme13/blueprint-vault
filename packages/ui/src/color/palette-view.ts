import {
  isColourVisionDeficiency,
  isColourVisionSeverity,
  type ColourVisionDeficiency,
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
  /**
   * Which deficiency the Vision chip shows while it is on.
   *
   * Kept even when the chip is off, so turning it back on returns to the mode
   * that was being used rather than making the choice again. That is why this
   * is a deficiency and not a `ColourVisionSimulation`: "off" is the chip's
   * state, not a fifth thing to choose from a list.
   */
  deficiency: ColourVisionDeficiency;
  /**
   * How far the deficiency is simulated, as Machado's parameter.
   *
   * 1.0 is dichromacy; below it is the anomalous trichromacy of the same cone,
   * which is both more common and the case the plan wanted this parameterised
   * for. Kept alongside the deficiency rather than per deficiency: it is one
   * dial, and remembering four of them would be answering a question nobody
   * asked.
   */
  severity: number;
  /** Whether the Vision chip is active. */
  isSimulationOn: boolean;
  /** Whether the WCAG contrast comparison panel is open. */
  isContrastModeOpen: boolean;
}

export const DEFAULT_PALETTE_VIEW: PaletteViewPreferences = {
  /* Deuteranopia is the most common deficiency, so it is the one worth landing
     on when somebody turns this on without a preference. */
  deficiency: "deuteranopia",
  severity: 1,
  isSimulationOn: false,
  isContrastModeOpen: false,
};

/** What to render through, given the chip's state. */
export function activeSimulation(
  view: PaletteViewPreferences,
): ColourVisionSimulation {
  return view.isSimulationOn ? view.deficiency : "normal";
}

/**
 * Read stored preferences, falling back per field rather than wholesale.
 *
 * Stored data, so this never throws: a preference nobody can parse is worth
 * less than the session it would interrupt. That is the opposite of how a
 * project file is read, and deliberately so — losing a view mode costs a click,
 * losing a project costs someone's work.
 *
 * Per field rather than all-or-nothing because the fields are independent. A
 * release that adds a fourth mode should not reset the three already stored.
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
    deficiency: isColourVisionDeficiency(value.deficiency)
      ? value.deficiency
      : DEFAULT_PALETTE_VIEW.deficiency,
    severity: isColourVisionSeverity(value.severity)
      ? value.severity
      : DEFAULT_PALETTE_VIEW.severity,
    isSimulationOn: readBoolean(
      value.isSimulationOn,
      DEFAULT_PALETTE_VIEW.isSimulationOn,
    ),
    isContrastModeOpen: readBoolean(
      value.isContrastModeOpen,
      DEFAULT_PALETTE_VIEW.isContrastModeOpen,
    ),
  };
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

export function writePaletteView(view: PaletteViewPreferences): string {
  return JSON.stringify(view);
}
