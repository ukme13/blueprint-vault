import { DEFAULT_RADIUS_TOKENS } from "../scale/radius";
import { defaultSpacingScale } from "../scale/spacing";
import { TYPE_SCALE_RATIO_PRESETS } from "../typography/presets";
import {
  SEED_PALETTE_TRACKS,
  SEED_TYPOGRAPHY,
  seedWorkspaceProject,
  type SeedWorkspaceInput,
} from "./seed-project";
import type { WorkspaceProject } from "./types";

/**
 * A starting point for Home create.
 *
 * A preset is inputs, not a document. The tempting shape is a whole
 * `WorkspaceProject`, since that is what gets stored, but a workspace has ten
 * slices and most of them are derived or defaulted: `semantics` comes from the
 * palette, and spacing, radius, elevation, layout and preview devices all have
 * their own builders. A preset written out in full would copy all of that and
 * go stale the first time a slice gains a field.
 *
 * So a preset carries only what it changes, and `instantiate` hands it to the
 * same `seedWorkspaceProject` every other caller uses. A slice added there
 * reaches every preset without anybody editing this file.
 */
export type WorkspacePreset = SeedWorkspaceInput & {
  /** Stable across releases; the dialog stores it only for the open session. */
  id: string;
  name: string;
  summary: string;
};

/** The seed hexes a preset paints as swatches, in the order they are shown. */
const SWATCH_TRACK_IDS = ["primary", "secondary", "neutral"] as const;

/*
 * Five starting points modelled on well-known product design systems: their
 * brand colours, their typefaces and base sizes, a type ratio per frame
 * (gentler on a phone than on a desktop), their spacing grid and density,
 * and their corners. The desktop ratio is also the type system's own.
 */

/** GitHub Primer: a 14px system face, a 4px grid, 6px corners. */
const PRIMER: WorkspacePreset = {
  id: "primer",
  name: "GitHub Primer",
  summary:
    "Primer blue and success green, a 14px system sans at a major third, 6px corners.",
  primarySeedHex: "#0969da",
  secondarySeedHex: "#1a7f37",
  neutralSeedHex: "#656d76",
  typography: {
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', sans-serif",
    baseFontSizePx: 14,
    ratio: 1.25,
    stepCount: 9,
  },
  previewDevices: [
    { id: "phone", ratio: 1.18 },
    { id: "tablet", ratio: 1.2 },
    { id: "desktop", ratio: 1.25 },
  ],
  spacing: { baseUnitPx: 4, density: 1 },
  radius: { tokenPx: { element: 6, container: 6 } },
};

/** Stripe: an 8px grid, spacious, and a perfect fourth on a desktop. */
const STRIPE: WorkspacePreset = {
  id: "stripe",
  name: "Stripe Vibrant",
  summary:
    "Blurple and electric teal, Söhne at a perfect fourth, a spacious 8px grid.",
  primarySeedHex: "#635bff",
  secondarySeedHex: "#00d4b2",
  neutralSeedHex: "#425466",
  typography: {
    fontFamily:
      "sohne, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    baseFontSizePx: 16,
    ratio: 1.333,
    stepCount: 9,
  },
  previewDevices: [
    { id: "phone", ratio: 1.2 },
    { id: "tablet", ratio: 1.25 },
    { id: "desktop", ratio: 1.333 },
  ],
  spacing: { baseUnitPx: 8, density: 1.15 },
  radius: { tokenPx: { element: 8, container: 12 } },
};

/** Linear: dense, a tight minor third over ten steps. */
const LINEAR: WorkspacePreset = {
  id: "linear",
  name: "Linear Studio",
  summary:
    "Indigo and cyan, 14px Inter over a tight minor third, a compact 4px grid.",
  primarySeedHex: "#5e6ad2",
  secondarySeedHex: "#26b5ce",
  neutralSeedHex: "#8a8f98",
  typography: {
    fontFamily:
      "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    baseFontSizePx: 14,
    ratio: 1.2,
    stepCount: 10,
  },
  previewDevices: [
    { id: "phone", ratio: 1.15 },
    { id: "tablet", ratio: 1.18 },
    { id: "desktop", ratio: 1.2 },
  ],
  spacing: { baseUnitPx: 4, density: 0.85 },
  radius: { tokenPx: { element: 4, container: 8 } },
};

/** Shopify Polaris: merchant-grade, a balanced minor third. */
const POLARIS: WorkspacePreset = {
  id: "polaris",
  name: "Shopify Polaris",
  summary:
    "Commerce emerald and deep slate, a 14px system sans at a minor third.",
  primarySeedHex: "#008060",
  secondarySeedHex: "#002e25",
  neutralSeedHex: "#6d7175",
  typography: {
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    baseFontSizePx: 14,
    ratio: 1.2,
    stepCount: 9,
  },
  previewDevices: [
    { id: "phone", ratio: 1.15 },
    { id: "tablet", ratio: 1.18 },
    { id: "desktop", ratio: 1.2 },
  ],
  spacing: { baseUnitPx: 4, density: 1 },
  radius: { tokenPx: { element: 4, container: 8 } },
};

/** IBM Carbon: square corners throughout, on an 8px grid. */
const CARBON: WorkspacePreset = {
  id: "carbon",
  name: "IBM Carbon",
  summary:
    "Carbon blue and cyan, IBM Plex Sans at a major third, square corners.",
  primarySeedHex: "#0f62fe",
  secondarySeedHex: "#1192e8",
  neutralSeedHex: "#525252",
  typography: {
    fontFamily:
      "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    baseFontSizePx: 16,
    ratio: 1.25,
    stepCount: 9,
  },
  previewDevices: [
    { id: "phone", ratio: 1.18 },
    { id: "tablet", ratio: 1.22 },
    { id: "desktop", ratio: 1.25 },
  ],
  spacing: { baseUnitPx: 8, density: 1 },
  /* Every scaling corner to 0. A pill stays a pill: it does not scale. */
  radius: { multiplier: 0 },
};

/** Every preset the create dialog offers, in the order it lists them. */
export const WORKSPACE_PRESETS: readonly WorkspacePreset[] = [
  PRIMER,
  STRIPE,
  LINEAR,
  POLARIS,
  CARBON,
];

/** The one a freshly opened dialog starts on. */
export const DEFAULT_WORKSPACE_PRESET_ID = PRIMER.id;

/** The preset with this id, or `undefined` for an id nothing defines. */
export function findWorkspacePreset(id: string): WorkspacePreset | undefined {
  return WORKSPACE_PRESETS.find((preset) => preset.id === id);
}

/**
 * The seed colours to paint beside a preset's name.
 *
 * These are the seeds themselves, not generated shades, so the dialog can draw
 * them without building three whole systems on every keystroke. A seed is an
 * honest thing to show: it is the colour the person picked the preset for.
 */
export function workspacePresetSwatches(preset: WorkspacePreset): string[] {
  return SWATCH_TRACK_IDS.map((id) => {
    if (id === "primary" && preset.primarySeedHex) return preset.primarySeedHex;
    if (id === "secondary" && preset.secondarySeedHex) {
      return preset.secondarySeedHex;
    }
    if (id === "neutral" && preset.neutralSeedHex) return preset.neutralSeedHex;
    const track = SEED_PALETTE_TRACKS.find((seed) => seed.id === id);
    return track?.seedHex ?? "#000000";
  });
}

/** A complete workspace from a preset, named. */
export function instantiateWorkspacePreset(
  preset: WorkspacePreset,
  name: string,
): WorkspaceProject {
  return seedWorkspaceProject(name, preset);
}

/** What a preset starts a workspace with, every value filled in. */
export interface WorkspacePresetDetails {
  primaryHex: string;
  secondaryHex: string;
  neutralHex: string;
  /** The face the stack leads with, as a person would name it. */
  typeface: string;
  baseFontSizePx: number;
  ratio: number;
  /** The ratio's musical name, or null for one no preset names. */
  ratioName: string | null;
  stepCount: number;
  /** The spacing grid's base unit. */
  baseSpacingPx: number;
  /** The corners of a control and of a card, multiplier applied. */
  elementRadiusPx: number;
  containerRadiusPx: number;
}

/* A generic family, said in words rather than as a CSS keyword. */
const GENERIC_FAMILY_NAMES: Record<string, string> = {
  "-apple-system": "System sans",
  BlinkMacSystemFont: "System sans",
  "ui-sans-serif": "System sans",
  "system-ui": "System sans",
  "sans-serif": "Sans serif",
  "ui-serif": "System serif",
  serif: "Serif",
  "ui-monospace": "System mono",
  monospace: "Monospace",
};

/**
 * A preset described in full, for a details panel: its seeds and type with
 * the defaults it does not override filled in, so a preset that leaves the
 * neutral seed or the step count alone still shows what it will start with.
 */
export function workspacePresetDetails(
  preset: WorkspacePreset,
): WorkspacePresetDetails {
  const seed = (id: string) =>
    SEED_PALETTE_TRACKS.find((track) => track.id === id)!.seedHex;
  const type = { ...SEED_TYPOGRAPHY, ...preset.typography };
  const lead = type.fontFamily
    .split(",")[0]!
    .trim()
    .replace(/^["']|["']$/g, "");
  const radiusPx = (id: string) => {
    const token = DEFAULT_RADIUS_TOKENS.find((each) => each.id === id)!;
    const px = preset.radius?.tokenPx?.[id] ?? token.basePx;
    return token.scales ? px * (preset.radius?.multiplier ?? 1) : px;
  };
  const named = TYPE_SCALE_RATIO_PRESETS.find(
    (each) => Math.abs(each.ratio - type.ratio) < 0.001,
  );
  return {
    primaryHex: preset.primarySeedHex ?? seed("primary"),
    secondaryHex: preset.secondarySeedHex ?? seed("secondary"),
    neutralHex: preset.neutralSeedHex ?? seed("neutral"),
    typeface: GENERIC_FAMILY_NAMES[lead] ?? lead,
    baseFontSizePx: type.baseFontSizePx,
    ratio: type.ratio,
    ratioName: named?.name ?? null,
    stepCount: type.stepCount,
    baseSpacingPx:
      preset.spacing?.baseUnitPx ?? defaultSpacingScale().baseUnitPx,
    elementRadiusPx: radiusPx("element"),
    containerRadiusPx: radiusPx("container"),
  };
}
