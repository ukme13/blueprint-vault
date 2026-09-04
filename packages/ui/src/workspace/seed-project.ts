import type { ColorTrackInput } from "../color/types";
import { defaultElevationScale } from "../scale/elevation";
import { defaultRadiusScale } from "../scale/radius";
import { defaultSpacingScale } from "../scale/spacing";
import { defaultSystem } from "../typography/system";
import { splitFontFamily } from "../typography/migrate";
import { defaultLightnessValues } from "./palette-project";
import { semanticsForPalette } from "./semantics";
import {
  DEFAULT_PREVIEW_TEMPLATE,
  DEFAULT_SPECIMEN_TEXT,
  DEFAULT_TYPE_SCALE_UNIT,
} from "./typography-project";
import type { PaletteProjectData } from "../color/export";
import type { WorkspaceProject } from "./types";

/**
 * A whole workspace, seeded — every slice filled, nothing null.
 *
 * `emptyWorkspace` is the other one, and the difference matters: it leaves
 * both studios' slices null because a workspace nobody has opened must land on
 * the creation screen rather than on somebody else's defaults. This one is for
 * the callers that need a complete system without a person: the docs app's
 * reference workspace, and any test or fixture that would otherwise assemble
 * six defaults by hand and drift from the studio while doing it.
 *
 * The values are the ones the studio's own creation screens start from. They
 * live here rather than in the app for the reason every rule in this package
 * does — a second copy of the default track list is a second thing to keep in
 * step — and because a script with no browser has to be able to build one.
 */

/**
 * The six tracks a new palette starts with.
 *
 * `primary` carries the seed somebody picked; the other five are the semantic
 * roles every system ends up needing, in the hues the studio has always used.
 */
export const SEED_PALETTE_TRACKS: readonly ColorTrackInput[] = [
  { id: "primary", name: "primary", seedHex: "#7646ab" },
  { id: "neutral", name: "neutral", seedHex: "#737373" },
  { id: "success", name: "success", seedHex: "#2f7d32" },
  { id: "warning", name: "warning", seedHex: "#b87503" },
  { id: "error", name: "error", seedHex: "#b02b1b" },
  { id: "info", name: "info", seedHex: "#2878b8" },
];

/** The six tracks, with `primary` moved onto a chosen seed colour. */
export function seedPaletteTracks(primarySeedHex: string): ColorTrackInput[] {
  return SEED_PALETTE_TRACKS.map((track) =>
    track.id === "primary"
      ? { ...track, seedHex: primarySeedHex }
      : { ...track },
  );
}

/** The palette slice a new project starts with. */
export function seedPaletteProject(
  primarySeedHex = SEED_PALETTE_TRACKS[0]!.seedHex,
): PaletteProjectData {
  return {
    tracks: seedPaletteTracks(primarySeedHex),
    lightnessPattern: "custom",
    lightnessValues: defaultLightnessValues("custom"),
  };
}

/** What the typography creation screen offers before anybody changes it. */
const SEED_TYPOGRAPHY = {
  fontFamily: "Geist Sans, ui-sans-serif, system-ui",
  baseFontSizePx: 16,
  /* Major Third. The preset the ratio selector opens on. */
  ratio: 1.25,
  stepCount: 9,
};

/**
 * Every slice, filled from the studio's own defaults.
 *
 * Deterministic: the same name gives the same bytes, which is what lets a
 * generated export be committed and compared rather than regenerated and
 * trusted.
 */
export function seedWorkspaceProject(name: string): WorkspaceProject {
  const palette = seedPaletteProject();

  return {
    name,
    palette,
    semantics: semanticsForPalette(palette),
    spacing: defaultSpacingScale(),
    radius: defaultRadiusScale(),
    elevation: defaultElevationScale(),
    typography: {
      system: defaultSystem(
        name,
        splitFontFamily(SEED_TYPOGRAPHY.fontFamily),
        SEED_TYPOGRAPHY.baseFontSizePx,
        SEED_TYPOGRAPHY.ratio,
        SEED_TYPOGRAPHY.stepCount,
      ),
      unit: DEFAULT_TYPE_SCALE_UNIT,
      specimenText: DEFAULT_SPECIMEN_TEXT,
      template: DEFAULT_PREVIEW_TEMPLATE,
    },
  };
}
