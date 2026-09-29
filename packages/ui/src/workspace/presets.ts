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

/**
 * The studio's own starting system, unchanged.
 *
 * It carries no overrides on purpose. It is what create has always produced,
 * so choosing it changes nothing, and a test holds it byte-identical to
 * `seedWorkspaceProject(name)` so the default cannot drift behind the control.
 */
const BLUEPRINT: WorkspacePreset = {
  id: "blueprint",
  name: "Blueprint seed",
  summary: "The studio's own system. Violet and teal, Inter at a major third.",
};

/**
 * Warm, print-leaning. Terracotta against a muted forest green, a serif face,
 * and a wider ratio so the headings carry a page rather than a screen.
 */
const EDITORIAL: WorkspacePreset = {
  id: "editorial",
  name: "Warm editorial",
  summary:
    "Terracotta and forest green, a serif face, and a wider perfect fourth.",
  primarySeedHex: "#b4532a",
  secondarySeedHex: "#3f6f5f",
  typography: {
    fontFamily: "Iowan Old Style, Georgia, ui-serif, serif",
    baseFontSizePx: 17,
    /* Perfect Fourth. */
    ratio: 1.333,
  },
};

/**
 * Cool and dense. Steel blue against rose, the platform's own sans, and a
 * tight ratio over more steps, which is the shape a tool with a lot on screen
 * tends to want.
 */
const UTILITY: WorkspacePreset = {
  id: "utility",
  name: "Cool utility",
  summary:
    "Steel blue and rose, a system sans, and a tight minor third over ten steps.",
  primarySeedHex: "#2f6f9f",
  secondarySeedHex: "#c2456a",
  typography: {
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif",
    /* Minor Third. */
    ratio: 1.2,
    stepCount: 10,
  },
};

/** Every preset the create dialog offers, in the order it lists them. */
export const WORKSPACE_PRESETS: readonly WorkspacePreset[] = [
  BLUEPRINT,
  EDITORIAL,
  UTILITY,
];

/** The one a freshly opened dialog starts on. */
export const DEFAULT_WORKSPACE_PRESET_ID = BLUEPRINT.id;

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
 * the defaults it does not override filled in. Blueprint overrides nothing,
 * and reads as the studio's own violet, teal and Inter at a Major Third.
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
