import { gradeContrast, type ContrastJob } from "./accessibility-standard";
import type { ContrastStandard } from "./palette-view";
import {
  resolveSemantic,
  type ColourMode,
  type SemanticToken,
} from "./semantic";
import type { ColorTrack } from "./types";

/**
 * The accessibility sandbox: a small hero whose colours can each be picked,
 * and a verdict on the pair that the selection makes.
 *
 * Every part of the hero that takes a colour is a target. A target holds one
 * colour, either a semantic role, which follows the theme, or a primitive
 * shade, which does not. What the sandbox measures is decided here, so the
 * card on screen and the tests read the same rules.
 */
export const SANDBOX_TARGETS = [
  "background",
  "badgeFill",
  "badgeText",
  "heading",
  "body",
  "buttonFill",
  "buttonText",
] as const;

export type SandboxTarget = (typeof SANDBOX_TARGETS)[number];

export const SANDBOX_TARGET_LABELS: Record<SandboxTarget, string> = {
  background: "Background",
  badgeFill: "Badge Fill",
  badgeText: "Badge Text",
  heading: "Heading Text",
  body: "Body Text",
  buttonFill: "Button Fill",
  buttonText: "Button Text",
};

/** A colour a target holds: a role of the layer, or a shade of a track. */
export type SandboxColour =
  | { kind: "semantic"; id: string }
  | { kind: "primitive"; trackId: string; weight: number };

export type SandboxColours = Record<SandboxTarget, SandboxColour>;

/** The hero as it opens: every part on a role, so it follows the theme. */
export const DEFAULT_SANDBOX_COLOURS: SandboxColours = {
  background: { kind: "semantic", id: "surface.subtle" },
  badgeFill: { kind: "semantic", id: "surface.raised" },
  badgeText: { kind: "semantic", id: "fg.accent" },
  heading: { kind: "semantic", id: "fg.primary" },
  body: { kind: "semantic", id: "fg.secondary" },
  buttonFill: { kind: "semantic", id: "action.primary" },
  buttonText: { kind: "semantic", id: "fg.on-action" },
};

/** The page the hero sits on, which a fill is measured against. */
export const SANDBOX_PAGE_ROLE = "surface.base";

/** A colour as the sandbox shows it. */
export interface ResolvedSandboxColour {
  hex: string;
  name: string;
  /** The track and weight it comes to, for the shade ramp to light. */
  trackId: string;
  weight: number;
}

/**
 * A colour's hex in a mode.
 *
 * A role is resolved through the layer in the mode asked for, which is how one
 * assignment is light in light and dark in dark. A shade is the shade, in both.
 * Null for a role the layer no longer has or a track that is gone.
 */
export function resolveSandboxColour(
  colour: SandboxColour,
  tokens: readonly SemanticToken[],
  tracks: ColorTrack[],
  mode: ColourMode,
): ResolvedSandboxColour | null {
  if (colour.kind === "primitive") {
    const track = tracks.find((each) => each.id === colour.trackId);
    const shade = track?.shades.find((each) => each.weight === colour.weight);
    return track && shade
      ? {
          hex: shade.hex,
          name: `${track.name} ${shade.weight}`,
          trackId: track.id,
          weight: shade.weight,
        }
      : null;
  }
  const token = tokens.find((each) => each.id === colour.id);
  const resolved = token ? resolveSemantic(token, mode, tracks) : null;
  return token && resolved
    ? {
        hex: resolved.hex,
        name: token.name,
        trackId: resolved.trackId,
        weight: resolved.weight,
      }
    : null;
}

/** The hexes of every target, and of the page, in a mode. Null if one is gone. */
export function resolveSandbox(
  colours: SandboxColours,
  tokens: readonly SemanticToken[],
  tracks: ColorTrack[],
  mode: ColourMode,
): { hexes: Record<SandboxTarget, string>; page: string } | null {
  const hexes = {} as Record<SandboxTarget, string>;
  for (const target of SANDBOX_TARGETS) {
    const resolved = resolveSandboxColour(
      colours[target],
      tokens,
      tracks,
      mode,
    );
    if (!resolved) return null;
    hexes[target] = resolved.hex;
  }
  const page = resolveSandboxColour(
    { kind: "semantic", id: SANDBOX_PAGE_ROLE },
    tokens,
    tracks,
    mode,
  );
  return page ? { hexes, page: page.hex } : null;
}

/**
 * Hand a target a new colour: `SandboxColours -> SandboxColours`.
 *
 * Choosing a colour for the background keeps the hero's other parts as they
 * are; it is the person's job to see whether they still read.
 */
export function assignSandboxColour(
  colours: SandboxColours,
  target: SandboxTarget,
  colour: SandboxColour,
): SandboxColours {
  return { ...colours, [target]: colour };
}

/** One line of the card: a pair, its figure, and whether it does the job. */
export interface SandboxRow {
  label: "Text on Fill" | "Fill on Page";
  value: string;
  grade: string;
  /** Null where there is no requirement to meet: an advisory figure. */
  passes: boolean | null;
}

/** The parts a target stands for: its text, its fill, and what is behind it. */
interface Pairing {
  text: SandboxTarget;
  fill: SandboxTarget;
  /** What the fill sits on: another target, or the page itself. */
  behind: SandboxTarget | "page";
  /** The job the text does, which sets the line it has to clear. */
  job: ContrastJob;
  /** Whether the fill is a component, and so has a line to clear. */
  fillIsComponent: boolean;
}

const PAIRINGS: Record<SandboxTarget, Pairing> = {
  background: {
    text: "body",
    fill: "background",
    behind: "page",
    job: "body",
    fillIsComponent: false,
  },
  heading: {
    text: "heading",
    fill: "background",
    behind: "page",
    job: "large",
    fillIsComponent: false,
  },
  body: {
    text: "body",
    fill: "background",
    behind: "page",
    job: "body",
    fillIsComponent: false,
  },
  badgeFill: {
    text: "badgeText",
    fill: "badgeFill",
    behind: "background",
    job: "body",
    fillIsComponent: true,
  },
  badgeText: {
    text: "badgeText",
    fill: "badgeFill",
    behind: "background",
    job: "body",
    fillIsComponent: true,
  },
  buttonFill: {
    text: "buttonText",
    fill: "buttonFill",
    behind: "background",
    job: "body",
    fillIsComponent: true,
  },
  buttonText: {
    text: "buttonText",
    fill: "buttonFill",
    behind: "background",
    job: "body",
    fillIsComponent: true,
  },
};

/**
 * The card for a selected target: its text on its fill, and its fill on what
 * is behind it.
 *
 * Text is judged for the job it does (a heading is large text, the rest body
 * text) and a component's fill as a UI component. A background is not a
 * component: it has no line to clear against the page, so that figure is
 * given and not judged.
 */
export function assessSandboxTarget(
  standard: ContrastStandard,
  target: SandboxTarget,
  hexes: Record<SandboxTarget, string>,
  page: string,
): SandboxRow[] {
  const pairing = PAIRINGS[target];
  const text = hexes[pairing.text];
  const fill = hexes[pairing.fill];
  const behind = pairing.behind === "page" ? page : hexes[pairing.behind];

  const onFill = gradeContrast(standard, pairing.job, text, fill);
  const onPage = gradeContrast(standard, "ui", fill, behind);
  return [
    {
      label: "Text on Fill",
      value: onFill.value,
      grade: onFill.grade,
      passes: onFill.passes,
    },
    {
      label: "Fill on Page",
      value: onPage.value,
      grade: pairing.fillIsComponent ? onPage.grade : "Advisory",
      passes: pairing.fillIsComponent ? onPage.passes : null,
    },
  ];
}
