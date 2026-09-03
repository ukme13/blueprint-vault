import {
  WCAG_CONTRAST,
  assessColourSimilarity,
  assessFocusContrast,
  assessNonTextContrast,
  assessTextContrast,
  contrastRatio,
  recommendTextColour,
  type ColourSimilarityResult,
  type FocusContrastResult,
  type NonTextContrastResult,
  type TextColourRecommendation,
  type TextContrastResult,
} from "./accessibility";
import {
  resolveSemantics,
  type ColourMode,
  type SemanticToken,
} from "./semantic";
import type { ColorTrack, ShadeItem } from "./types";
import {
  COLOUR_VISION_DEFICIENCIES,
  colourVisionLabel,
  simulateHex,
  type ColourVisionDeficiency,
  type ColourVisionSimulation,
} from "./vision";

/*
 * What the preview measures, and which shades it measures.
 *
 * The shades come from the semantic layer. They used to come from a table here
 * that named eleven roles and picked each one by a fraction along a track —
 * written before the layer existed, and kept afterwards behind a test asserting
 * the two agreed. Two lists that must agree are one list too many, and the test
 * only proved they had not diverged yet.
 *
 * So a check now names the tokens it needs, and is skipped when the layer does
 * not have them. A workspace whose owner deleted `status.info` gets no info
 * check rather than a crash or a colour nobody chose.
 *
 * See docs/roadmap/semantic-tokens.md and colour-vision-simulation.md.
 */

/** The ids the checks reach for. Named once so a rename is one edit. */
const TOKENS = {
  actionPrimary: "action.primary",
  actionSecondary: "action.secondary",
  surfaceBase: "surface.base",
  surfaceRaised: "surface.raised",
  borderDefault: "border.default",
  textPrimary: "fg.primary",
  textSecondary: "fg.secondary",
  focusRing: "focus.ring",
  statusSuccess: "status.success",
  statusWarning: "status.warning",
  statusError: "status.error",
  statusInfo: "status.info",
} as const;

/**
 * What a preview cannot do without.
 *
 * A surface to draw on, text to draw, something to act with, and a focus ring —
 * every check is built from at least one of these. Anything else is optional
 * and its check disappears with it.
 */
export const PREVIEW_REQUIRED_TOKENS: readonly string[] = [
  TOKENS.surfaceBase,
  TOKENS.textPrimary,
  TOKENS.actionPrimary,
  TOKENS.focusRing,
];

/**
 * The semantic layer resolved to shades, keyed by token id.
 *
 * A map rather than named fields, because the layer is editable: somebody can
 * rename `status.info` or delete it, and a struct with eleven required slots
 * cannot describe that.
 */
export type PreviewShades = Record<string, ShadeItem>;

/**
 * Resolve the layer against the palette.
 *
 * Null when the palette is empty or the layer is missing something every check
 * needs — see `PREVIEW_REQUIRED_TOKENS`. A caller gets nothing to render rather
 * than a preview built from whatever happened to resolve.
 *
 * Light mode, because this is the palette preview: the studio shows one palette
 * and the mode toggle belongs to the page that shows a whole system. The
 * parameter is here so the report can ask for the other one.
 */
export function previewShadesFor(
  tokens: SemanticToken[],
  tracks: ColorTrack[],
  mode: ColourMode = "light",
): PreviewShades | null {
  if (tracks.length === 0) return null;

  const byWeight = new Map(
    tracks.flatMap((track) =>
      track.shades.map(
        (shade) => [`${track.id}:${shade.weight}`, shade] as const,
      ),
    ),
  );

  const shades: PreviewShades = {};
  for (const resolved of resolveSemantics(tokens, mode, tracks)) {
    /* The resolver already fell back to a real track and weight, so this
       lookup cannot miss — but a shade the palette does not hold would be a
       colour nobody chose, so it is skipped rather than invented. */
    const shade = byWeight.get(`${resolved.trackId}:${resolved.weight}`);
    if (shade) shades[resolved.id] = shade;
  }

  const hasEverything = PREVIEW_REQUIRED_TOKENS.every((id) => id in shades);
  return hasEverything ? shades : null;
}

export function readableText(background: string): string {
  return recommendTextColour(background).colour;
}

/**
 * What a pair's contrast becomes once a deficiency is simulated.
 *
 * Deliberately carries a ratio and no verdict. WCAG defines its thresholds on
 * the actual colours, so a simulated pair cannot pass or fail AA — claiming it
 * could would be inventing a conformance result the standard does not grant.
 *
 * The ratio itself is still worth knowing, and WCAG 2 not modelling it is a
 * limitation of the standard rather than a reason to hide it: protanopia takes
 * most of red's luminance, so a red button that measures 4.8:1 genuinely reads
 * far weaker to a protanope than that number suggests.
 */
export interface SimulatedContrast {
  deficiency: ColourVisionDeficiency;
  severity: number;
  ratio: number;
  /**
   * The pair clears its threshold on the real palette and not once simulated.
   *
   * The actionable case, and the only one worth a warning: a pair that already
   * fails is reported by the ordinary verdict beside it.
   */
  weakens: boolean;
}

export interface TextCheck {
  label: string;
  foreground: string;
  background: string;
  result: TextContrastResult;
  /** The current view, when the Vision chip is on. */
  simulated: SimulatedContrast | null;
  /** Every deficiency this pair weakens under, whatever is being previewed. */
  weakensUnder: ColourVisionDeficiency[];
}

export interface NonTextCheck {
  label: string;
  foreground: string;
  background: string;
  result: NonTextContrastResult;
  countsTowardWarnings: boolean;
  simulated: SimulatedContrast | null;
  weakensUnder: ColourVisionDeficiency[];
}

/** How a view is being looked at, for the checks that depend on it. */
export interface SimulationView {
  simulation: ColourVisionSimulation;
  severity: number;
}

const NORMAL_VIEW: SimulationView = { simulation: "normal", severity: 1 };

function simulatedRatio(
  foreground: string,
  background: string,
  deficiency: ColourVisionDeficiency,
  severity: number,
): number {
  return contrastRatio(
    simulateHex(foreground, deficiency, severity),
    simulateHex(background, deficiency, severity),
  );
}

/**
 * The simulated contrast for one pair under the current view.
 *
 * Null under normal vision rather than a ratio equal to the real one, so a
 * caller cannot render a "simulated" figure that is simply the same number.
 *
 * Exported because the shade popover measures a pair the preview checks do not
 * cover — one shade against whatever it is being compared with. Computing it
 * there would give the studio two notions of what a simulated ratio is.
 */
export function simulatedContrast(
  foreground: string,
  background: string,
  view: SimulationView,
  realRatio: number,
  threshold: number,
): SimulatedContrast | null {
  if (view.simulation === "normal") return null;

  const ratio = simulatedRatio(
    foreground,
    background,
    view.simulation,
    view.severity,
  );

  return {
    deficiency: view.simulation,
    severity: view.severity,
    ratio,
    weakens: realRatio >= threshold && ratio < threshold,
  };
}

/**
 * Every deficiency that takes this pair below its threshold.
 *
 * Measured at full severity and independently of what is being previewed, the
 * same way semantic pairs are: a warning that only appears once you have
 * already chosen the right mode is one nobody finds.
 */
function weakensUnder(
  foreground: string,
  background: string,
  realRatio: number,
  threshold: number,
): ColourVisionDeficiency[] {
  if (realRatio < threshold) return [];

  return COLOUR_VISION_DEFICIENCIES.filter(
    (deficiency) =>
      simulatedRatio(foreground, background, deficiency, 1) < threshold,
  );
}

export interface TextColourCheck {
  label: string;
  background: string;
  recommendation: TextColourRecommendation;
}

/**
 * One sample: what is drawn, on what.
 *
 * `readable` means the foreground is whichever of black or white reads on the
 * background — a label on a filled button, where the token is the fill and the
 * text is chosen for it rather than picked from the layer.
 */
interface TextSample {
  label: string;
  foreground: string;
  background: string;
  readable?: boolean;
}

const TEXT_SAMPLES: readonly TextSample[] = [
  {
    label: "Primary action text",
    foreground: TOKENS.actionPrimary,
    background: TOKENS.actionPrimary,
    readable: true,
  },
  {
    label: "Body text",
    foreground: TOKENS.textPrimary,
    background: TOKENS.surfaceBase,
  },
  {
    label: "Supporting text",
    foreground: TOKENS.textSecondary,
    background: TOKENS.surfaceBase,
  },
  {
    label: "Primary link",
    foreground: TOKENS.actionPrimary,
    background: TOKENS.surfaceBase,
  },
  {
    label: "Success status text",
    foreground: TOKENS.statusSuccess,
    background: TOKENS.surfaceBase,
  },
  {
    label: "Warning status text",
    foreground: TOKENS.statusWarning,
    background: TOKENS.surfaceBase,
  },
  {
    label: "Error action text",
    foreground: TOKENS.statusError,
    background: TOKENS.statusError,
    readable: true,
  },
];

export function assessTextChecks(
  shades: PreviewShades,
  view: SimulationView = NORMAL_VIEW,
): TextCheck[] {
  return TEXT_SAMPLES.flatMap((sample) => {
    const background = shades[sample.background];
    const source = shades[sample.foreground];
    /* A sample whose tokens the layer does not have is left out rather than
       substituted. A check against a colour nobody chose is worse than one
       check fewer. */
    if (!background || !source) return [];

    const foreground = sample.readable
      ? readableText(background.hex)
      : source.hex;
    const check = {
      label: sample.label,
      foreground,
      background: background.hex,
    };

    const result = assessTextContrast(check.foreground, check.background);
    /* Normal-text AA throughout. These samples have no size of their own — the
       report is where a size-aware verdict lives, because that is where the
       type scale is. */
    const threshold = WCAG_CONTRAST.normalTextAA;

    return [
      {
        ...check,
        result,
        simulated: simulatedContrast(
          check.foreground,
          check.background,
          view,
          result.ratio,
          threshold,
        ),
        weakensUnder: weakensUnder(
          check.foreground,
          check.background,
          result.ratio,
          threshold,
        ),
      },
    ];
  });
}

/** The filled surfaces a label sits on, and what colour that label should be. */
const TEXT_COLOUR_CHOICES: ReadonlyArray<{ label: string; token: string }> = [
  { label: "Primary action", token: TOKENS.actionPrimary },
  { label: "Success action", token: TOKENS.statusSuccess },
  { label: "Warning action", token: TOKENS.statusWarning },
  { label: "Error action", token: TOKENS.statusError },
];

export function assessTextColourChoices(
  shades: PreviewShades,
): TextColourCheck[] {
  return TEXT_COLOUR_CHOICES.flatMap((choice) => {
    const shade = shades[choice.token];
    if (!shade) return [];
    return [
      {
        label: choice.label,
        background: shade.hex,
        recommendation: recommendTextColour(shade.hex),
      },
    ];
  });
}

export function assessNonTextChecks(
  shades: PreviewShades,
  view: SimulationView = NORMAL_VIEW,
): NonTextCheck[] {
  const samples: Array<{
    label: string;
    foreground: string;
    background: string;
    countsTowardWarnings: boolean;
  }> = [
    {
      label: "Secondary button border",
      foreground: TOKENS.actionSecondary,
      background: TOKENS.surfaceBase,
      countsTowardWarnings: true,
    },
    {
      label: "Soft surface boundary",
      foreground: TOKENS.surfaceRaised,
      background: TOKENS.surfaceBase,
      countsTowardWarnings: false,
    },
  ];

  return samples.flatMap((sample) => {
    const foreground = shades[sample.foreground];
    const background = shades[sample.background];
    if (!foreground || !background) return [];
    const check = {
      ...sample,
      foreground: foreground.hex,
      background: background.hex,
    };
    const result = assessNonTextContrast(check.foreground, check.background);
    const threshold = WCAG_CONTRAST.nonText;

    const assessed = {
      ...check,
      result,
      simulated: simulatedContrast(
        check.foreground,
        check.background,
        view,
        result.ratio,
        threshold,
      ),
      /* Only where the boundary carries meaning. A decorative surface that
         weakens under simulation is not something to go and fix. */
      weakensUnder: check.countsTowardWarnings
        ? weakensUnder(
            check.foreground,
            check.background,
            result.ratio,
            threshold,
          )
        : [],
    };
    return [assessed];
  });
}

export function assessFocusCheck(shades: PreviewShades): FocusContrastResult {
  /* Both are required tokens, so this cannot be reached without them. */
  return assessFocusContrast(
    shades[TOKENS.focusRing]!.hex,
    shades[TOKENS.textPrimary]!.hex,
    shades[TOKENS.textPrimary]!.hex,
  );
}

/**
 * Which tokens have to be told apart by colour.
 *
 * A rule rather than a list. The one that was here named four pairs by hand and
 * missed `status.success` against `status.info` — green against blue, which is
 * exactly what tritanopia brings together. Hand-written lists miss the case
 * nobody thought of, which is the case worth checking.
 *
 * The groups are the ones that signal by colour: a status badge says what it
 * means with its fill, and an action says which of two buttons to press. Any
 * two of those can appear side by side, so every pair among them is measured.
 * Everything else — a surface, a border, body text — is told apart by position
 * or by the words on it.
 */
const SIGNALLING_GROUPS = ["status", "action"];

/**
 * The action tokens that are states of one control rather than controls.
 *
 * `action.hover` is `action.primary` under the pointer. Nobody reads the two
 * side by side and has to tell them apart, and neither is ever next to a
 * status badge as a signal — so pairing them would add rows to the report that
 * measure nothing anyone sees. Kept out of the grid, not out of the layer:
 * each is still a colour with a foreground on it, and the surface checks
 * cover that.
 */
const ACTION_STATES = new Set(["action.hover", "action.active"]);

function signalsByColour(id: string): boolean {
  return SIGNALLING_GROUPS.includes(group(id)) && !ACTION_STATES.has(id);
}

function group(id: string): string {
  return id.split(".")[0] ?? id;
}

/** `status.success` reads as `success` once its group has been said. */
function shortName(id: string): string {
  const parts = id.split(".");
  return parts[parts.length - 1] ?? id;
}

function pairLabel(first: string, second: string): string {
  const lead = shortName(first);
  return `${lead.charAt(0).toUpperCase()}${lead.slice(1)} and ${shortName(second)}`;
}

/**
 * Every pair of signalling tokens present in the layer.
 *
 * Ordered by the layer rather than alphabetically, so the report reads in the
 * order somebody arranged their tokens.
 */
export function semanticPairIds(
  shades: PreviewShades,
): Array<[string, string]> {
  const signalling = Object.keys(shades).filter(signalsByColour);

  return signalling.flatMap((first, at) =>
    signalling
      .slice(at + 1)
      .map((second) => [first, second] as [string, string]),
  );
}

export interface SimulatedSimilarity {
  deficiency: ColourVisionDeficiency;
  result: ColourSimilarityResult;
}

export interface SemanticPairCheck {
  label: string;
  first: ShadeItem;
  second: ShadeItem;
  /** How the pair reads to normal colour vision. */
  result: ColourSimilarityResult;
  /** The same check under each deficiency. */
  simulated: SimulatedSimilarity[];
  /**
   * The deficiencies where this pair collapses but normal vision is fine.
   *
   * The actionable set, and the reason this is worth surfacing at all: a pair
   * that is already too similar shows up in the normal-vision warning, and
   * repeating it per deficiency would bury the ones only some people cannot
   * tell apart.
   */
  collapsesUnder: ColourVisionDeficiency[];
}

export function assessSemanticPairs(
  shades: PreviewShades,
): SemanticPairCheck[] {
  return semanticPairIds(shades).map(([first, second]) => {
    const label = pairLabel(first, second);
    const firstShade = shades[first]!;
    const secondShade = shades[second]!;
    const result = assessColourSimilarity(firstShade.hex, secondShade.hex);

    const simulated = COLOUR_VISION_DEFICIENCIES.map((deficiency) => ({
      deficiency,
      result: assessColourSimilarity(
        simulateHex(firstShade.hex, deficiency),
        simulateHex(secondShade.hex, deficiency),
      ),
    }));

    return {
      label,
      first: firstShade,
      second: secondShade,
      result,
      simulated,
      collapsesUnder: result.isTooSimilar
        ? []
        : simulated
            .filter((entry) => entry.result.isTooSimilar)
            .map((entry) => entry.deficiency),
    };
  });
}

/**
 * What to tell someone about a pair, and what to do about it.
 *
 * Alongside `assessColourSimilarity`'s own summaries rather than in the
 * component, so the wording is testable and the two sentences stay in the same
 * voice. Every one of them ends with the same advice, because the fix for two
 * colours that cannot be told apart is never to nudge a hue — it is to stop
 * relying on colour alone to carry the meaning.
 */
export function describeSemanticPair(check: SemanticPairCheck): string {
  if (check.result.isTooSimilar) return check.result.summary;
  if (check.collapsesUnder.length === 0) return check.result.summary;

  const names = check.collapsesUnder.map(colourVisionLabel);
  const listed =
    names.length === 1
      ? names[0]!
      : `${names.slice(0, -1).join(", ")} and ${names.at(-1)!}`;

  return `Distinct to normal colour vision, but too close under ${listed}. Pair these with text or an icon so the difference does not rest on colour.`;
}

export interface PreviewAssessment {
  shades: PreviewShades;
  textChecks: TextCheck[];
  textColourChoices: TextColourCheck[];
  nonTextChecks: NonTextCheck[];
  focusCheck: FocusContrastResult;
  semanticPairs: SemanticPairCheck[];
  issueCount: number;
}

/** Everything the preview reports, for one palette. */
export function assessPreview(
  shades: PreviewShades,
  view: SimulationView = NORMAL_VIEW,
): PreviewAssessment {
  const textChecks = assessTextChecks(shades, view);
  const nonTextChecks = assessNonTextChecks(shades, view);
  const focusCheck = assessFocusCheck(shades);
  const semanticPairs = assessSemanticPairs(shades);

  const issueCount =
    textChecks.filter((check) => check.result.status !== "pass").length +
    nonTextChecks.filter(
      (check) => check.countsTowardWarnings && !check.result.passes,
    ).length +
    (focusCheck.status === "fail" ? 1 : 0) +
    semanticPairs.filter((check) => check.result.isTooSimilar).length +
    /* Each of these counts once, however many deficiencies it applies to — a
       pair is one thing to go and fix, not four. */
    semanticPairs.filter((check) => check.collapsesUnder.length > 0).length +
    textChecks.filter((check) => check.weakensUnder.length > 0).length +
    nonTextChecks.filter((check) => check.weakensUnder.length > 0).length;

  return {
    shades,
    textChecks,
    textColourChoices: assessTextColourChoices(shades),
    nonTextChecks,
    focusCheck,
    semanticPairs,
    issueCount,
  };
}
