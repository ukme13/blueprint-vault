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
 * This lived inside PalettePreview, which made it a component that computed
 * rather than rendered, and put the one interesting decision in the file least
 * able to test it: which shades of two semantic tracks are the ones worth
 * comparing.
 *
 * See docs/roadmap/colour-vision-simulation.md.
 */

/** Where along a track a role sits, as a fraction of its length. */
function shadeAt(track: ColorTrack, progress: number): ShadeItem {
  const index = Math.round((track.shades.length - 1) * progress);
  return track.shades[index]!;
}

export interface PreviewShades {
  primaryAction: ShadeItem;
  primarySoft: ShadeItem;
  primaryFocus: ShadeItem;
  secondaryAction: ShadeItem;
  neutralLight: ShadeItem;
  neutralMid: ShadeItem;
  neutralDark: ShadeItem;
  successAction: ShadeItem;
  warningAction: ShadeItem;
  errorAction: ShadeItem;
  infoAction: ShadeItem;
}

/**
 * The shades a component would actually put together.
 *
 * Every track falls back to primary rather than to nothing, so a project with
 * only one track still previews. That is why this returns null only for an
 * empty palette.
 */
export function selectPreviewShades(
  tracks: ColorTrack[],
): PreviewShades | null {
  if (tracks.length === 0) return null;

  const named = (name: string, fallback: ColorTrack) =>
    tracks.find((track) => track.name === name) ?? fallback;

  const primary = named("primary", tracks[0]!);
  const neutral = named("neutral", primary);
  const secondary = named("secondary", neutral);
  const success = named("success", primary);
  const warning = named("warning", primary);
  const error = named("error", primary);
  const info = named("info", primary);

  return {
    primaryAction: shadeAt(primary, 0.55),
    primarySoft: shadeAt(primary, 0.12),
    /* The focus ring is a named weight where one exists, because 300 is the
       shade the focus token is documented against. */
    primaryFocus:
      primary.shades.find((shade) => shade.weight === 300) ??
      shadeAt(primary, 0.32),
    secondaryAction: shadeAt(secondary, 0.48),
    neutralLight: shadeAt(neutral, 0.08),
    neutralMid: shadeAt(neutral, 0.48),
    neutralDark: shadeAt(neutral, 0.9),
    successAction: shadeAt(success, 0.55),
    warningAction: shadeAt(warning, 0.45),
    errorAction: shadeAt(error, 0.55),
    infoAction: shadeAt(info, 0.55),
  };
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
 */
function simulatedContrast(
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

export function assessTextChecks(
  shades: PreviewShades,
  view: SimulationView = NORMAL_VIEW,
): TextCheck[] {
  const {
    primaryAction,
    neutralLight,
    neutralMid,
    neutralDark,
    successAction,
    warningAction,
    errorAction,
  } = shades;

  return [
    {
      label: "Primary action text",
      foreground: readableText(primaryAction.hex),
      background: primaryAction.hex,
    },
    {
      label: "Body text",
      foreground: neutralDark.hex,
      background: neutralLight.hex,
    },
    {
      label: "Supporting text",
      foreground: neutralMid.hex,
      background: neutralLight.hex,
    },
    {
      label: "Primary link",
      foreground: primaryAction.hex,
      background: neutralLight.hex,
    },
    {
      label: "Success status text",
      foreground: successAction.hex,
      background: neutralLight.hex,
    },
    {
      label: "Warning status text",
      foreground: warningAction.hex,
      background: neutralLight.hex,
    },
    {
      label: "Error action text",
      foreground: readableText(errorAction.hex),
      background: errorAction.hex,
    },
  ].map((check) => {
    const result = assessTextContrast(check.foreground, check.background);
    /* Normal-text AA throughout. These samples have no size of their own — the
       report is where a size-aware verdict lives, because that is where the
       type scale is. */
    const threshold = WCAG_CONTRAST.normalTextAA;

    return {
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
    };
  });
}

export function assessTextColourChoices(
  shades: PreviewShades,
): TextColourCheck[] {
  return [
    { label: "Primary action", background: shades.primaryAction.hex },
    { label: "Success action", background: shades.successAction.hex },
    { label: "Warning action", background: shades.warningAction.hex },
    { label: "Error action", background: shades.errorAction.hex },
  ].map((check) => ({
    ...check,
    recommendation: recommendTextColour(check.background),
  }));
}

export function assessNonTextChecks(
  shades: PreviewShades,
  view: SimulationView = NORMAL_VIEW,
): NonTextCheck[] {
  const { secondaryAction, primarySoft, neutralLight } = shades;

  return [
    {
      label: "Secondary button border",
      foreground: secondaryAction.hex,
      background: neutralLight.hex,
      countsTowardWarnings: true,
    },
    {
      label: "Soft surface boundary",
      foreground: primarySoft.hex,
      background: neutralLight.hex,
      countsTowardWarnings: false,
    },
  ].map((check) => {
    const result = assessNonTextContrast(check.foreground, check.background);
    const threshold = WCAG_CONTRAST.nonText;

    return {
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
  });
}

export function assessFocusCheck(shades: PreviewShades): FocusContrastResult {
  return assessFocusContrast(
    shades.primaryFocus.hex,
    shades.neutralDark.hex,
    shades.neutralDark.hex,
  );
}

/*
 * The semantic pairs, and the shades of them that are compared.
 *
 * Two tracks are twenty shades each, so comparing every combination is 190
 * numbers per deficiency and almost all noise. These are the pairs a component
 * actually puts together — a success badge beside an error one — at the action
 * shade each would use. The choice was already being made here before
 * simulation existed; simulation reuses it rather than inventing a second
 * notion of which shades matter.
 */
const SEMANTIC_PAIRS: Array<{
  label: string;
  first: keyof PreviewShades;
  second: keyof PreviewShades;
}> = [
  {
    label: "Success and warning",
    first: "successAction",
    second: "warningAction",
  },
  { label: "Success and error", first: "successAction", second: "errorAction" },
  { label: "Warning and error", first: "warningAction", second: "errorAction" },
  { label: "Primary and info", first: "primaryAction", second: "infoAction" },
];

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
  return SEMANTIC_PAIRS.map(({ label, first, second }) => {
    const firstShade = shades[first];
    const secondShade = shades[second];
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
