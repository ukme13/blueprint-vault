import type { ColorTrackInput } from "../color/types";
import {
  defaultElevationScale,
  normalizeElevationScale,
  type ElevationScale,
} from "../scale/elevation";
import { defaultLayoutTokens } from "../scale/layout-tokens";
import {
  defaultRadiusScale,
  normalizeRadiusScale,
  type RadiusToken,
} from "../scale/radius";
import {
  defaultSpacingPreviewSettings,
  defaultSpacingScale,
  normalizeSpacingScale,
  type SpacingScale,
} from "../scale/spacing";
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
import {
  applyTypeRolePreset,
  type TypeRolePresetId,
} from "../typography/role-presets";
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

/** A seed per track a starting system sets, by track id. */
export type SeedPaletteTracksOverride = Partial<
  Record<
    | "primary"
    | "secondary"
    | "neutral"
    | "success"
    | "warning"
    | "error"
    | "info",
    string
  >
>;

/**
 * The seven tracks, each on a chosen seed where one is given.
 *
 * `secondary` is not a shade of `primary` or a derived complement: it is a
 * second brand colour, and a system that derived it would be inventing a
 * decision that belongs to whoever owns the brand. The status tracks move
 * only when a starting system names them; otherwise they keep the studio's
 * hues.
 */
export function seedPaletteTracks(
  primarySeedHex: string,
  secondarySeedHex?: string,
  overrides: SeedPaletteTracksOverride = {},
): ColorTrackInput[] {
  return SEED_PALETTE_TRACKS.map((track) => {
    if (track.id === "primary") return { ...track, seedHex: primarySeedHex };
    const seedHex =
      overrides[track.id as keyof SeedPaletteTracksOverride] ??
      (track.id === "secondary" ? secondarySeedHex : undefined);
    return seedHex === undefined ? { ...track } : { ...track, seedHex };
  });
}

/** The palette slice a new project starts with. */
export function seedPaletteProject(
  primarySeedHex = SEED_PALETTE_TRACKS[0]!.seedHex,
  secondarySeedHex?: string,
  overrides: SeedPaletteTracksOverride = {},
): PaletteProjectData {
  return {
    tracks: seedPaletteTracks(primarySeedHex, secondarySeedHex, overrides),
    lightnessPattern: "custom",
    lightnessValues: defaultLightnessValues("custom"),
  };
}

/**
 * What decides a starting type system: four numbers and a face, and
 * optionally the role groups it names its styles by and the line its
 * specimen shows.
 */
export type SeedTypographyInput = {
  fontFamily: string;
  baseFontSizePx: number;
  ratio: number;
  stepCount: number;
  /** App UI, Enterprise, Editorial; Minimal is the default system's own. */
  rolePresetId?: TypeRolePresetId;
  specimenText?: string;
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
  const base = defaultSystem(
    name,
    splitFontFamily(input.fontFamily),
    input.baseFontSizePx,
    input.ratio,
    input.stepCount,
  );
  /* The default system is already Minimal's groups. */
  const system =
    input.rolePresetId && input.rolePresetId !== "minimal"
      ? applyTypeRolePreset(base, input.rolePresetId)
      : base;
  return {
    system,
    unit: DEFAULT_TYPE_SCALE_UNIT,
    specimenText: input.specimenText ?? DEFAULT_SPECIMEN_TEXT,
    previewDocument: seedPreviewDocument(system),
    previewShell: seedPreviewShell(system),
    previewLanding: seedPreviewLanding(system),
    previewSections: seedPreviewSections(),
    template: DEFAULT_PREVIEW_TEMPLATE,
    remRootPx: ROOT_FONT_SIZE_PX,
  };
}

/**
 * Radius as a starting system states it: a multiplier, and the named corners
 * it changes, by id. Only what a token gives is changed, so a corner keeps
 * its name and description, and a corner left out keeps its default.
 */
export type SeedRadiusInput = {
  multiplier?: number;
  tokens?: readonly (Partial<RadiusToken> & { id: string })[];
};

/**
 * What a starting system changes from the studio's own. Anything left out
 * is the default; every slice is normalized, so a value out of bounds is
 * clamped rather than stored.
 */
export type SeedWorkspaceInput = {
  primarySeedHex?: string;
  secondarySeedHex?: string;
  /** Any of the seven tracks; wins over the two fields above. */
  paletteTracks?: SeedPaletteTracksOverride;
  typography?: Partial<SeedTypographyInput>;
  spacing?: Partial<SpacingScale>;
  radius?: SeedRadiusInput;
  elevation?: Partial<ElevationScale>;
  /** A type-scale ratio per frame, by id: phone, tablet, desktop. */
  previewDevices?: readonly { id: string; ratio: number }[];
};

function seedSpacing(input: Partial<SpacingScale> = {}): SpacingScale {
  return normalizeSpacingScale({ ...defaultSpacingScale(), ...input });
}

function seedRadius({ multiplier, tokens = [] }: SeedRadiusInput = {}) {
  const base = defaultRadiusScale();
  return normalizeRadiusScale({
    multiplier: multiplier ?? base.multiplier,
    tokens: base.tokens.map((token) => ({
      ...token,
      ...tokens.find((each) => each.id === token.id),
    })),
  });
}

function seedElevation(input: Partial<ElevationScale> = {}): ElevationScale {
  return normalizeElevationScale({ ...defaultElevationScale(), ...input });
}

/**
 * Every slice, from the studio's own defaults and whatever a starting system
 * changes: seven tracks, type with its role groups, a ratio per frame,
 * spacing, corners and shadows.
 *
 * Deterministic: the same name and input give the same bytes, which is what
 * lets a generated export be committed and compared rather than regenerated
 * and trusted.
 */
export function seedWorkspaceProject(
  name: string,
  input: SeedWorkspaceInput = {},
): WorkspaceProject {
  const palette = seedPaletteProject(
    input.paletteTracks?.primary ?? input.primarySeedHex,
    input.paletteTracks?.secondary ?? input.secondarySeedHex,
    input.paletteTracks,
  );
  const typography = { ...SEED_TYPOGRAPHY, ...input.typography };
  /* The frames the studio always has, each on the preset's own ratio where
     it sets one: a phone steps more gently than a desktop. */
  const previewDevices = defaultPreviewDevices(typography.ratio).map(
    (device) => ({
      ...device,
      ratio:
        input.previewDevices?.find((each) => each.id === device.id)?.ratio ??
        device.ratio,
    }),
  );

  return {
    name,
    palette,
    semantics: semanticsForPalette(palette),
    removedSeedRoles: [],
    buttonSchemes: normalizeButtonSchemes(undefined),
    spacing: seedSpacing(input.spacing),
    spacingPreview: defaultSpacingPreviewSettings(),
    radius: seedRadius(input.radius),
    elevation: seedElevation(input.elevation),
    previewDevices,
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
