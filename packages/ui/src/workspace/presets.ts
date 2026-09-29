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

/** GitHub Primer: accessible high-contrast open source system. */
const PRIMER: WorkspacePreset = {
  id: "primer",
  name: "GitHub Primer",
  summary: "Primer blue and success green, system sans at a major third.",
  primarySeedHex: "#0969da",
  secondarySeedHex: "#1a7f37",
  typography: {
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif",
    baseFontSizePx: 16,
    ratio: 1.25,
  },
};

/** Stripe Vibrant: electric blurple and teal accent. */
const STRIPE: WorkspacePreset = {
  id: "stripe",
  name: "Stripe Vibrant",
  summary: "Blurple and electric teal accent, modern sans at a major third.",
  primarySeedHex: "#635bff",
  secondarySeedHex: "#00d4b2",
  typography: {
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    baseFontSizePx: 16,
    ratio: 1.25,
  },
};

/** Linear Studio: sleek indigo and cyan over 10 tight steps. */
const LINEAR: WorkspacePreset = {
  id: "linear",
  name: "Linear Studio",
  summary: "Brand indigo and vibrant cyan, Inter over a tight minor third.",
  primarySeedHex: "#5e6ad2",
  secondarySeedHex: "#26b5ce",
  typography: {
    fontFamily:
      "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    baseFontSizePx: 16,
    ratio: 1.2,
    stepCount: 10,
  },
};

/** Shopify Polaris: merchant-grade emerald and deep slate. */
const POLARIS: WorkspacePreset = {
  id: "polaris",
  name: "Shopify Polaris",
  summary: "Commerce emerald and deep slate, balanced minor third.",
  primarySeedHex: "#008060",
  secondarySeedHex: "#002e25",
  typography: {
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    baseFontSizePx: 16,
    ratio: 1.2,
  },
};

/** IBM Carbon: open enterprise blue and cyan with IBM Plex Sans. */
const CARBON: WorkspacePreset = {
  id: "carbon",
  name: "IBM Carbon",
  summary: "Carbon blue and cyan, IBM Plex Sans at a major third.",
  primarySeedHex: "#0f62fe",
  secondarySeedHex: "#1192e8",
  typography: {
    fontFamily:
      "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    baseFontSizePx: 16,
    ratio: 1.25,
  },
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
  const named = TYPE_SCALE_RATIO_PRESETS.find(
    (each) => Math.abs(each.ratio - type.ratio) < 0.001,
  );
  return {
    primaryHex: preset.primarySeedHex ?? seed("primary"),
    secondaryHex: preset.secondarySeedHex ?? seed("secondary"),
    neutralHex: seed("neutral"),
    typeface: GENERIC_FAMILY_NAMES[lead] ?? lead,
    baseFontSizePx: type.baseFontSizePx,
    ratio: type.ratio,
    ratioName: named?.name ?? null,
    stepCount: type.stepCount,
  };
}
