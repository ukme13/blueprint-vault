import { DEFAULT_RADIUS_TOKENS } from "../scale/radius";
import { defaultSpacingScale } from "../scale/spacing";
import { TYPE_SCALE_RATIO_PRESETS } from "../typography/presets";
import { TYPE_ROLE_PRESETS } from "../typography/role-presets";
import {
  SEED_PALETTE_TRACKS,
  SEED_TYPOGRAPHY,
  seedWorkspaceProject,
  type SeedPaletteTracksOverride,
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
 * Five starting points modelled on well-known product design systems. Each
 * seeds every slice: the seven colour tracks, the typeface, base size and
 * role groups, a type ratio per frame (gentler on a phone than a desktop,
 * the desktop one also the type system's), the spacing grid and density,
 * and the corners.
 */

/** GitHub Primer: Enterprise groups, a 4px grid, 6px corners. */
const PRIMER: WorkspacePreset = {
  id: "primer",
  name: "GitHub Primer",
  summary:
    "GitHub's design system. Primer blue, 4px grid, 6px radius, and Enterprise type groups.",
  paletteTracks: {
    primary: "#0969da",
    secondary: "#1a7f37",
    neutral: "#656d76",
    success: "#1a7f37",
    warning: "#9a6700",
    error: "#cf222e",
    info: "#0969da",
  },
  typography: {
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif",
    baseFontSizePx: 14,
    ratio: 1.25,
    stepCount: 9,
    rolePresetId: "enterprise",
    specimenText: "Where the world builds software",
  },
  previewDevices: [
    { id: "phone", ratio: 1.18 },
    { id: "tablet", ratio: 1.2 },
    { id: "desktop", ratio: 1.25 },
  ],
  spacing: { baseUnitPx: 4, density: 1 },
  radius: {
    multiplier: 1,
    tokens: [
      { id: "inner", basePx: 3 },
      { id: "element", basePx: 6 },
      { id: "container", basePx: 6 },
    ],
  },
};

/** Stripe: App UI groups, an 8px rhythm on a 4px unit, a perfect fourth. */
const STRIPE: WorkspacePreset = {
  id: "stripe",
  name: "Stripe Vibrant",
  summary:
    "Stripe's high-conversion fintech style. Blurple and teal, an 8px rhythm, App UI groups.",
  paletteTracks: {
    primary: "#635bff",
    secondary: "#00d4b2",
    neutral: "#425466",
    success: "#0570de",
    warning: "#f5a623",
    error: "#df1b41",
    info: "#635bff",
  },
  typography: {
    fontFamily:
      "sohne, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    baseFontSizePx: 16,
    ratio: 1.333,
    stepCount: 9,
    rolePresetId: "app-ui",
    specimenText: "Financial infrastructure for the internet",
  },
  previewDevices: [
    { id: "phone", ratio: 1.2 },
    { id: "tablet", ratio: 1.25 },
    { id: "desktop", ratio: 1.333 },
  ],
  /* The 4px unit the layout uses are written against; its 8px rhythm is step
     2 and up. On an 8px base, with density on top, every use came out 2.3
     times its size — a 64px section gap was 147px — and the page sprawled. */
  spacing: { baseUnitPx: 4, density: 1 },
  radius: {
    multiplier: 1,
    tokens: [
      { id: "inner", basePx: 4 },
      { id: "element", basePx: 8 },
      { id: "container", basePx: 12 },
    ],
  },
};

/** Linear: App UI groups, compact, a tight minor third over ten steps. */
const LINEAR: WorkspacePreset = {
  id: "linear",
  name: "Linear Studio",
  summary:
    "Linear's focused craft. Brand indigo and cyan, compact 4px grid, App UI groups.",
  paletteTracks: {
    primary: "#5e6ad2",
    secondary: "#26b5ce",
    neutral: "#8a8f98",
    success: "#27ae60",
    warning: "#f2c94c",
    error: "#eb5757",
    info: "#5e6ad2",
  },
  typography: {
    fontFamily:
      "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    baseFontSizePx: 14,
    ratio: 1.2,
    stepCount: 10,
    rolePresetId: "app-ui",
    specimenText: "Linear is a better way to build products",
  },
  previewDevices: [
    { id: "phone", ratio: 1.15 },
    { id: "tablet", ratio: 1.18 },
    { id: "desktop", ratio: 1.2 },
  ],
  spacing: { baseUnitPx: 4, density: 0.85 },
  radius: {
    multiplier: 1,
    tokens: [
      { id: "inner", basePx: 3 },
      { id: "element", basePx: 4 },
      { id: "container", basePx: 8 },
    ],
  },
};

/** Shopify Polaris: Enterprise groups, a balanced 4px grid. */
const POLARIS: WorkspacePreset = {
  id: "polaris",
  name: "Shopify Polaris",
  summary:
    "Shopify's commerce platform. Deep emerald and slate, balanced 4px grid, Enterprise groups.",
  paletteTracks: {
    primary: "#008060",
    secondary: "#002e25",
    neutral: "#6d7175",
    success: "#008060",
    warning: "#ffc453",
    error: "#d72c0d",
    info: "#2c6ecb",
  },
  typography: {
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'San Francisco', 'Segoe UI', Roboto, sans-serif",
    baseFontSizePx: 14,
    ratio: 1.2,
    stepCount: 9,
    rolePresetId: "enterprise",
    specimenText: "Making commerce better for everyone",
  },
  previewDevices: [
    { id: "phone", ratio: 1.15 },
    { id: "tablet", ratio: 1.18 },
    { id: "desktop", ratio: 1.2 },
  ],
  spacing: { baseUnitPx: 4, density: 1 },
  radius: {
    multiplier: 1,
    tokens: [
      { id: "inner", basePx: 2 },
      { id: "element", basePx: 4 },
      { id: "container", basePx: 8 },
    ],
  },
};

/** IBM Carbon: Enterprise groups, square corners, a 4px mini-unit. */
const CARBON: WorkspacePreset = {
  id: "carbon",
  name: "IBM Carbon",
  summary:
    "IBM's enterprise system. Carbon blue, IBM Plex Sans, sharp 0px corners, Enterprise groups.",
  paletteTracks: {
    primary: "#0f62fe",
    secondary: "#1192e8",
    neutral: "#525252",
    success: "#198038",
    warning: "#f1c21b",
    error: "#da1e28",
    info: "#0043ce",
  },
  typography: {
    fontFamily:
      "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    baseFontSizePx: 16,
    ratio: 1.25,
    stepCount: 9,
    rolePresetId: "enterprise",
    specimenText: "Let’s create something that changes everything",
  },
  previewDevices: [
    { id: "phone", ratio: 1.18 },
    { id: "tablet", ratio: 1.22 },
    { id: "desktop", ratio: 1.25 },
  ],
  /* A 4px mini-unit, as Carbon counts; its 8px layout steps are step 2 and
     up. On an 8px base every token doubled and the page sprawled. */
  spacing: { baseUnitPx: 4, density: 1 },
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
  return SWATCH_TRACK_IDS.map((id) => presetTrackHex(preset, id));
}

/**
 * The seed a preset starts one track on: its `paletteTracks` entry, then the
 * older primary and secondary fields, then the studio's own. The same order
 * `seedWorkspaceProject` reads them in.
 */
function presetTrackHex(
  preset: WorkspacePreset,
  id: keyof SeedPaletteTracksOverride,
): string {
  const field =
    id === "primary"
      ? preset.primarySeedHex
      : id === "secondary"
        ? preset.secondarySeedHex
        : undefined;
  return (
    preset.paletteTracks?.[id] ??
    field ??
    SEED_PALETTE_TRACKS.find((track) => track.id === id)!.seedHex
  );
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
  /** The type role groups it names its styles by: App UI, Enterprise… */
  roleGroups: string;
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
  const type = { ...SEED_TYPOGRAPHY, ...preset.typography };
  const lead = type.fontFamily
    .split(",")[0]!
    .trim()
    .replace(/^["']|["']$/g, "");
  const radiusPx = (id: string) => {
    const token = DEFAULT_RADIUS_TOKENS.find((each) => each.id === id)!;
    const px =
      preset.radius?.tokens?.find((each) => each.id === id)?.basePx ??
      token.basePx;
    return token.scales ? px * (preset.radius?.multiplier ?? 1) : px;
  };
  const named = TYPE_SCALE_RATIO_PRESETS.find(
    (each) => Math.abs(each.ratio - type.ratio) < 0.001,
  );
  return {
    primaryHex: presetTrackHex(preset, "primary"),
    secondaryHex: presetTrackHex(preset, "secondary"),
    neutralHex: presetTrackHex(preset, "neutral"),
    roleGroups:
      TYPE_ROLE_PRESETS.find(
        (each) => each.id === (type.rolePresetId ?? "minimal"),
      )?.label ?? "Minimal",
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
