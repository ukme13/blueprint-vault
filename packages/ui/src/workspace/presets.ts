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
    /* Primer's own sizes, where a 1.25 ratio from 14px lands between them: the
       16px button and subtitle, the 14px and 12px controls the negative steps
       fall past, and desktop headings at Primer's 32, 24, 20 and 16. */
    roleOverrides: {
      "input-label-sm": { fontSizePx: 14 },
      "button-md": { fontSizePx: 16 },
      "subtitle-2": { fontSizePx: 16 },
      "table-header": { fontSizePx: 14 },
      "button-sm": { fontSizePx: 12 },
      "input-value-xs": { fontSizePx: 12 },
      tag: { fontSizePx: 12 },
      caption: { fontSizePx: 12 },
      code: { fontSizePx: 12 },
      h1: { fontSizePx: 32 },
      h2: { fontSizePx: 24 },
      h3: { fontSizePx: 20 },
      h4: { fontSizePx: 16 },
    },
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
      { id: "container", basePx: 12 },
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
    /* The 14px controls and subtext a 1.333 ratio from 16px skips, the 12px
       small UI the negative steps fall past, and Stripe's large headings. */
    roleOverrides: {
      label: { fontSizePx: 14 },
      "body-sm": { fontSizePx: 14 },
      "button-md": { fontSizePx: 14 },
      code: { fontSizePx: 14 },
      "button-sm": { fontSizePx: 12 },
      chip: { fontSizePx: 12 },
      caption: { fontSizePx: 12 },
      h1: { fontSizePx: 64 },
      h2: { fontSizePx: 48 },
      h3: { fontSizePx: 36 },
    },
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
    /* Linear's signature 13px compact sizes, and 12px small UI. */
    roleOverrides: {
      "body-sm": { fontSizePx: 13 },
      label: { fontSizePx: 13 },
      "button-md": { fontSizePx: 13 },
      "button-sm": { fontSizePx: 12 },
      chip: { fontSizePx: 12 },
      caption: { fontSizePx: 12 },
    },
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
    /* Polaris counts in single pixels: bodySm at 13px, and 12px small UI. */
    roleOverrides: {
      "body-2": { fontSizePx: 13 },
      "button-sm": { fontSizePx: 12 },
      caption: { fontSizePx: 12 },
    },
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
    /* Carbon's type set: the 14px compact sizes on its 4px mini-unit, the
       headings its ratio steps over (heading-04, -06, -07), and 12px small
       UI. */
    roleOverrides: {
      label: { fontSizePx: 14 },
      "input-value-sm": { fontSizePx: 14 },
      "input-label-sm": { fontSizePx: 14 },
      "body-2": { fontSizePx: 14 },
      "button-md": { fontSizePx: 14 },
      h4: { fontSizePx: 28 },
      h2: { fontSizePx: 42 },
      h1: { fontSizePx: 54 },
      "button-sm": { fontSizePx: 12 },
      "input-value-xs": { fontSizePx: 12 },
      caption: { fontSizePx: 12 },
      code: { fontSizePx: 12 },
    },
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

/** Medium Story: Editorial groups, 18px Charter serif, warm ink & green, breathable reading. */
const MEDIUM: WorkspacePreset = {
  id: "medium",
  name: "Medium Story",
  summary:
    "Long-form reading and editorial craft. Warm ink and green, 18px Charter serif, Editorial groups.",
  paletteTracks: {
    primary: "#1a8917",
    secondary: "#242424",
    neutral: "#6b6b6b",
    success: "#1a8917",
    warning: "#b58105",
    error: "#c93b2b",
    info: "#1a8917",
  },
  typography: {
    fontFamily: "Charter, 'Newsreader', 'Iowan Old Style', Georgia, serif",
    baseFontSizePx: 18,
    ratio: 1.25,
    stepCount: 9,
    rolePresetId: "editorial",
    specimenText: "Every story begins with a single sentence",
    /* Reading sizes a 1.25 ratio from 18px steps over: a 44px and 36px display, a 16px and 14px small body, and 22px pull quotes. */
    roleOverrides: {
      "display-1": { fontSizePx: 44 },
      "display-2": { fontSizePx: 36 },
      h1: { fontSizePx: 36 },
      h2: { fontSizePx: 30 },
      h3: { fontSizePx: 24 },
      h4: { fontSizePx: 20 },
      h5: { fontSizePx: 18 },
      h6: { fontSizePx: 16 },
      "body-md": { fontSizePx: 18 },
      "body-sm": { fontSizePx: 16 },
      "body-xs": { fontSizePx: 14 },
      quote: { fontSizePx: 22 },
      label: { fontSizePx: 14 },
      caption: { fontSizePx: 14 },
      overline: { fontSizePx: 12 },
    },
  },
  previewDevices: [
    { id: "phone", ratio: 1.18 },
    { id: "tablet", ratio: 1.2 },
    { id: "desktop", ratio: 1.25 },
  ],
  spacing: { baseUnitPx: 4, density: 1.1 },
  radius: {
    multiplier: 1,
    tokens: [
      { id: "inner", basePx: 3 },
      { id: "element", basePx: 4 },
      { id: "container", basePx: 8 },
    ],
  },
};

/** The Guardian: British editorial authority. Deep navy & Guardian yellow, Egyptian serif, crisp 2px corners. */
const GUARDIAN: WorkspacePreset = {
  id: "guardian",
  name: "The Guardian",
  summary:
    "British editorial authority. Deep navy & yellow, Egyptian serif, crisp 2px corners, Editorial groups.",
  paletteTracks: {
    primary: "#052962",
    secondary: "#ffe500",
    neutral: "#707070",
    success: "#22874d",
    warning: "#c70000",
    error: "#c70000",
    info: "#052962",
  },
  typography: {
    fontFamily:
      "'Guardian Egyptian Web', 'Playfair Display', Georgia, 'Times New Roman', serif",
    baseFontSizePx: 16,
    ratio: 1.333,
    stepCount: 9,
    rolePresetId: "editorial",
    specimenText: "News is what someone somewhere wants to suppress",
    /* The Guardian's headline and text sizes, which a perfect fourth from 16px leaps over: 52px and 40px displays, 36px to 15px headings, 14px and 13px text. */
    roleOverrides: {
      "display-1": { fontSizePx: 52 },
      "display-2": { fontSizePx: 40 },
      h1: { fontSizePx: 36 },
      h2: { fontSizePx: 28 },
      h3: { fontSizePx: 24 },
      h4: { fontSizePx: 20 },
      h5: { fontSizePx: 16 },
      h6: { fontSizePx: 15 },
      "body-md": { fontSizePx: 16 },
      "body-sm": { fontSizePx: 14 },
      "body-xs": { fontSizePx: 13 },
      quote: { fontSizePx: 24 },
      label: { fontSizePx: 14 },
      caption: { fontSizePx: 13 },
      overline: { fontSizePx: 12 },
    },
  },
  previewDevices: [
    { id: "phone", ratio: 1.2 },
    { id: "tablet", ratio: 1.25 },
    { id: "desktop", ratio: 1.333 },
  ],
  spacing: { baseUnitPx: 4, density: 1 },
  radius: {
    multiplier: 1,
    tokens: [
      { id: "inner", basePx: 0 },
      { id: "element", basePx: 2 },
      { id: "container", basePx: 4 },
    ],
  },
};

/** Notion Serif: Clean document flow, Lyon serif, slate & blue, modern 4px corners. */
const NOTION: WorkspacePreset = {
  id: "notion",
  name: "Notion Serif",
  summary:
    "Minimalist knowledge base. Slate and blue, Lyon serif, modern 4px corners, Editorial groups.",
  paletteTracks: {
    primary: "#2f3437",
    secondary: "#2383e2",
    neutral: "#787774",
    success: "#0f7b6c",
    warning: "#dfab01",
    error: "#eb5757",
    info: "#2383e2",
  },
  typography: {
    fontFamily:
      "'Lyon-Text', 'iA Writer Quattro', Georgia, 'Times New Roman', serif",
    baseFontSizePx: 16,
    ratio: 1.25,
    stepCount: 9,
    rolePresetId: "editorial",
    specimenText: "Organize your ideas, projects, and life",
    /* A document's sizes, where 1.25 from 16px misses the 30px and 24px headings and the 14px and 12px small text. */
    roleOverrides: {
      "display-1": { fontSizePx: 40 },
      "display-2": { fontSizePx: 32 },
      h1: { fontSizePx: 30 },
      h2: { fontSizePx: 24 },
      h3: { fontSizePx: 20 },
      h4: { fontSizePx: 18 },
      h5: { fontSizePx: 16 },
      h6: { fontSizePx: 14 },
      "body-md": { fontSizePx: 16 },
      "body-sm": { fontSizePx: 14 },
      "body-xs": { fontSizePx: 12 },
      quote: { fontSizePx: 18 },
      label: { fontSizePx: 14 },
      caption: { fontSizePx: 12 },
      overline: { fontSizePx: 12 },
    },
  },
  previewDevices: [
    { id: "phone", ratio: 1.18 },
    { id: "tablet", ratio: 1.2 },
    { id: "desktop", ratio: 1.25 },
  ],
  spacing: { baseUnitPx: 4, density: 0.95 },
  radius: {
    multiplier: 1,
    tokens: [
      { id: "inner", basePx: 3 },
      { id: "element", basePx: 4 },
      { id: "container", basePx: 6 },
    ],
  },
};

/** Every preset the create dialog offers, in the order it lists them. */
export const WORKSPACE_PRESETS: readonly WorkspacePreset[] = [
  PRIMER,
  STRIPE,
  LINEAR,
  POLARIS,
  CARBON,
  MEDIUM,
  GUARDIAN,
  NOTION,
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
