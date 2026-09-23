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

/* ---- what the phone's settings sheets edit ----

   On a phone, WCAG 2 and Vision open a bottom sheet rather than toggling in
   place, and the sheet edits a draft that only Apply commits. That needs a
   way to set everything the sheet shows in one step: the context only had
   toggles, and "turn this on with these options" built out of toggles depends
   on what was already on, which is how a sheet ends up switching something
   off by applying it. */

/** What the Vision sheet edits: everything the chip carries. */
export interface VisionSettings {
  isSimulationOn: boolean;
  deficiency: ColourVisionDeficiency;
  severity: number;
}

export function visionSettingsOf(view: PaletteViewPreferences): VisionSettings {
  return {
    isSimulationOn: view.isSimulationOn,
    deficiency: view.deficiency,
    severity: view.severity,
  };
}

/**
 * A view with the Vision settings replaced.
 *
 * Through the same guards a stored view goes through, so a sheet cannot commit
 * a severity the studio does not offer or a deficiency it has no matrix for.
 * An unusable value keeps what the view already had rather than falling to a
 * default — Apply should never change something the reader did not touch.
 */
export function withVisionSettings(
  view: PaletteViewPreferences,
  settings: VisionSettings,
): PaletteViewPreferences {
  return {
    ...view,
    isSimulationOn: settings.isSimulationOn,
    deficiency: isColourVisionDeficiency(settings.deficiency)
      ? settings.deficiency
      : view.deficiency,
    severity: isColourVisionSeverity(settings.severity)
      ? settings.severity
      : view.severity,
  };
}

/** Where Reset takes the Vision sheet: how a fresh studio starts. */
export const DEFAULT_VISION_SETTINGS: VisionSettings =
  visionSettingsOf(DEFAULT_PALETTE_VIEW);

/**
 * The draft a Vision sheet opens with.
 *
 * On, whatever the chip was. Tapping Vision is asking to use it; a sheet that
 * opened with its switch off would make Apply do nothing on the first visit,
 * which is the one moment it has to work.
 */
export function visionDraftToOpen(
  view: PaletteViewPreferences,
): VisionSettings {
  return { ...visionSettingsOf(view), isSimulationOn: true };
}

/** What the WCAG contrast is measured against. */
export type ContrastTarget = "white" | "black" | "custom";

/** What the WCAG sheet edits. */
export interface ContrastSettings {
  isOn: boolean;
  target: ContrastTarget;
  /** Used when `target` is `custom`, and kept when it is not. */
  customColour: string;
}

/** Where Reset takes the WCAG sheet, and what a studio opens with. */
export const DEFAULT_CONTRAST_SETTINGS: ContrastSettings = {
  isOn: DEFAULT_PALETTE_VIEW.isContrastModeOpen,
  target: "white",
  customColour: "#7646ab",
};

/** The draft a WCAG sheet opens with — on, for the reason Vision's is. */
export function contrastDraftToOpen(
  settings: ContrastSettings,
): ContrastSettings {
  return { ...settings, isOn: true };
}
