import type { ColorTrackInput } from "../color/types";
import { defaultElevationScale } from "../scale/elevation";
import { defaultLayoutTokens } from "../scale/layout-tokens";
import { defaultRadiusScale } from "../scale/radius";
import { defaultSpacingScale } from "../scale/spacing";
import { defaultPreviewDevices } from "../typography/preview-devices";
import {
  seedPreviewDocument,
  seedPreviewLanding,
  seedPreviewShell,
} from "../typography/preview-document";
import { seedPreviewSections } from "../typography/preview-sections";
import { ROOT_FONT_SIZE_PX } from "../typography/types";
import { defaultSystem } from "../typography/system";
import { splitFontFamily } from "../typography/migrate";
import { defaultLightnessValues } from "./palette-project";
import { semanticsForPalette } from "./semantics";
import { normalizeButtonSchemes } from "../button-tones";
import {
  DEFAULT_PREVIEW_TEMPLATE,
  DEFAULT_SPECIMEN_TEXT,
  DEFAULT_TYPE_SCALE_UNIT,
} from "./typography-project";
import type { PaletteProjectData } from "../color/export";
import { withPaletteSlice, withTypographySlice } from "./workspace";
import type { TypographyProjectData, WorkspaceProject } from "./types";

/**
 * A whole workspace, seeded — every slice filled, nothing null.
 *
 * `emptyWorkspace` is the other one, and the difference matters: it leaves
 * both studios' slices null because a workspace nobody has opened must land on
 * Home rather than on somebody else's defaults. This one is for the callers
 * that need a complete system without a person: Home create, the docs app's
 * reference workspace, and any test or fixture that would otherwise assemble
 * six defaults by hand and drift from the studio while doing it.
 *
 * The values are the ones Home create starts from. They live here rather than
 * in the app for the reason every rule in this package does — a second copy of
 * the default track list is a second thing to keep in step — and because a
 * script with no browser has to be able to build one.
 */

/**
 * The six tracks a new palette starts with.
 *
 * `primary` carries the seed somebody picked; the other five are the semantic
 * roles every system ends up needing, in the hues the studio has always used.
 */
export const SEED_PALETTE_TRACKS: readonly ColorTrackInput[] = [
  { id: "primary", name: "primary", seedHex: "#7646ab" },
  /* Teal, a long way round the wheel from the default purple. A second brand
     colour that arrives looking like a shade of the first teaches nobody what
     it is for, and the studio's job here is to show that the two tones are
     independent rather than to guess somebody's brand. */
  { id: "secondary", name: "secondary", seedHex: "#0f9d8f" },
  { id: "neutral", name: "neutral", seedHex: "#737373" },
  { id: "success", name: "success", seedHex: "#2f7d32" },
  { id: "warning", name: "warning", seedHex: "#b87503" },
  { id: "error", name: "error", seedHex: "#b02b1b" },
  { id: "info", name: "info", seedHex: "#2878b8" },
];

/**
 * The seven tracks, with the two brand colours moved onto chosen seeds.
 *
 * Both are the person's to choose. `secondary` is not a shade of `primary`
 * or a derived complement: it is a second brand colour, and a system that
 * derived it would be inventing a decision that belongs to whoever owns the
 * brand. It defaults to the seed above when nobody says otherwise.
 */
export function seedPaletteTracks(
  primarySeedHex: string,
  secondarySeedHex?: string,
): ColorTrackInput[] {
  return SEED_PALETTE_TRACKS.map((track) => {
    if (track.id === "primary") return { ...track, seedHex: primarySeedHex };
    if (track.id === "secondary" && secondarySeedHex !== undefined) {
      return { ...track, seedHex: secondarySeedHex };
    }
    return { ...track };
  });
}

/** The palette slice a new project starts with. */
export function seedPaletteProject(
  primarySeedHex = SEED_PALETTE_TRACKS[0]!.seedHex,
  secondarySeedHex?: string,
): PaletteProjectData {
  return {
    tracks: seedPaletteTracks(primarySeedHex, secondarySeedHex),
    lightnessPattern: "custom",
    lightnessValues: defaultLightnessValues("custom"),
  };
}

/** The four numbers and one string that decide a starting type system. */
export type SeedTypographyInput = {
  fontFamily: string;
  baseFontSizePx: number;
  ratio: number;
  stepCount: number;
};

/** What Home create offers for type before anybody changes it. */
export const SEED_TYPOGRAPHY: SeedTypographyInput = {
  fontFamily: "Inter, ui-sans-serif, system-ui",
  baseFontSizePx: 16,
  /* Major Third. The preset the ratio selector opens on. */
  ratio: 1.25,
  stepCount: 9,
};

/**
 * The typography slice a new project starts with.
 *
 * `overrides` carries only what a preset changes; anything it leaves out falls
 * back to `SEED_TYPOGRAPHY`, so a preset never restates the default.
 */
export function seedTypographyProject(
  name: string,
  overrides: Partial<SeedTypographyInput> = {},
): TypographyProjectData {
  const input = { ...SEED_TYPOGRAPHY, ...overrides };
  const system = defaultSystem(
    name,
    splitFontFamily(input.fontFamily),
    input.baseFontSizePx,
    input.ratio,
    input.stepCount,
  );
  return {
    system,
    unit: DEFAULT_TYPE_SCALE_UNIT,
    specimenText: DEFAULT_SPECIMEN_TEXT,
    previewDocument: seedPreviewDocument(system),
    previewShell: seedPreviewShell(system),
    previewLanding: seedPreviewLanding(system),
    previewSections: seedPreviewSections(),
    template: DEFAULT_PREVIEW_TEMPLATE,
    remRootPx: ROOT_FONT_SIZE_PX,
  };
}

/**
 * Every slice, filled from the studio's own defaults.
 *
 * Deterministic: the same name gives the same bytes, which is what lets a
 * generated export be committed and compared rather than regenerated and
 * trusted.
 */
/**
 * What a preset is allowed to change about a starting system.
 *
 * Colour and type only. Spacing, radius and elevation have no-argument
 * builders, and parameterising them to serve two presets is a bigger change
 * than this earns; a preset that wanted denser spacing needs that work first.
 */
export type SeedWorkspaceInput = {
  primarySeedHex?: string;
  secondarySeedHex?: string;
  typography?: Partial<SeedTypographyInput>;
};

export function seedWorkspaceProject(
  name: string,
  input: SeedWorkspaceInput = {},
): WorkspaceProject {
  const palette = seedPaletteProject(
    input.primarySeedHex,
    input.secondarySeedHex,
  );
  const typography = { ...SEED_TYPOGRAPHY, ...input.typography };

  return {
    name,
    palette,
    semantics: semanticsForPalette(palette),
    removedSeedRoles: [],
    buttonSchemes: normalizeButtonSchemes(undefined),
    spacing: defaultSpacingScale(),
    radius: defaultRadiusScale(),
    elevation: defaultElevationScale(),
    previewDevices: defaultPreviewDevices(typography.ratio),
    layout: defaultLayoutTokens(),
    typography: seedTypographyProject(name, input.typography),
  };
}

/**
 * Open Colour in an existing workspace that never got a palette.
 *
 * Home create fills every slice. This is only for a leftover half-document,
 * and it must not replace the type scale that is already there.
 */
export function withSeededPaletteSlice(
  current: WorkspaceProject,
): WorkspaceProject {
  if (current.palette) return current;
  return withPaletteSlice(current, seedPaletteProject());
}

/**
 * Open Typography in an existing workspace that never got a type scale.
 *
 * Same leftover case as `withSeededPaletteSlice`, the other way around.
 */
export function withSeededTypographySlice(
  current: WorkspaceProject,
): WorkspaceProject {
  if (current.typography) return current;
  return withTypographySlice(current, seedTypographyProject(current.name));
}
