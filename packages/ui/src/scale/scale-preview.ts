import { elevationVariableName, type ElevationScale } from "./elevation";
import { radiusVariableName, type RadiusScale } from "./radius";
import {
  spacingStepName,
  spacingVariableName,
  type SpacingScale,
} from "./spacing";

/**
 * Layout jobs the scale studio paints, so a step is judged as padding rather
 * than as a bar.
 *
 * Neighbouring steps look different as a ramp and often identical as a gap.
 * These scenes are the same argument the preview page makes for colour names:
 * a token the jobs do not use is a token the seed should not invent, and a
 * token they cannot resolve is a step somebody pruned that the layout still
 * needs.
 *
 * The jobs are data. The studio renders them; this file only says which tokens
 * each scene reaches for.
 *
 * See docs/roadmap/scale-studio.md.
 */

export type ScalePreviewFamily = "spacing" | "radius" | "elevation";

export type ScalePreviewToken =
  | { family: "spacing"; step: number }
  | { family: "radius"; id: string }
  | { family: "elevation"; id: string };

export interface ScalePreviewJob {
  id: string;
  name: string;
  description: string;
  tokens: readonly ScalePreviewToken[];
}

/** A `var(--spacing-4)` (or radius, or shadow) the jobs can paint with. */
export function scalePreviewValue(token: ScalePreviewToken): string {
  return `var(${scalePreviewVariable(token)})`;
}

export function scalePreviewVariable(token: ScalePreviewToken): string {
  if (token.family === "spacing") return spacingVariableName(token.step);
  if (token.family === "radius") return radiusVariableName(token.id);
  return elevationVariableName(token.id);
}

export function scalePreviewTokenId(token: ScalePreviewToken): string {
  return token.family === "spacing" ? spacingStepName(token.step) : token.id;
}

/**
 * The four scenes.
 *
 * A section gap, a card with something inside it, a form row, and the same
 * card at every elevation. Together they name padding, nested corners and a
 * resting shadow — the three families on one page, without leaving Scale.
 */
export const SCALE_PREVIEW_JOBS: readonly ScalePreviewJob[] = [
  {
    id: "section",
    name: "Section",
    description:
      "A heading and the space before what follows. Large steps look distinct as bars; they often do not as padding.",
    tokens: [
      { family: "spacing", step: 4 },
      { family: "spacing", step: 10 },
      { family: "spacing", step: 12 },
    ],
  },
  {
    id: "card",
    name: "Card",
    description:
      "A container holding a button and an inner chip. Padding, nested corners and a resting shadow, together.",
    tokens: [
      { family: "spacing", step: 1 },
      { family: "spacing", step: 2 },
      { family: "spacing", step: 3 },
      { family: "spacing", step: 4 },
      { family: "radius", id: "container" },
      { family: "radius", id: "element" },
      { family: "radius", id: "inner" },
      { family: "elevation", id: "low" },
    ],
  },
  {
    id: "form",
    name: "Form row",
    description:
      "An input beside a button. The gap and the element radius are the whole decision.",
    tokens: [
      { family: "spacing", step: 2 },
      { family: "spacing", step: 3 },
      { family: "spacing", step: 4 },
      { family: "spacing", step: 6 },
      { family: "radius", id: "container" },
      { family: "radius", id: "element" },
      { family: "elevation", id: "med" },
    ],
  },
  {
    id: "stack",
    name: "Elevation",
    description:
      "The same card at each level. If two look the same, one of them is unused.",
    tokens: [
      { family: "spacing", step: 4 },
      { family: "spacing", step: 6 },
      { family: "radius", id: "container" },
      { family: "elevation", id: "low" },
      { family: "elevation", id: "med" },
      { family: "elevation", id: "high" },
    ],
  },
];

export interface MissingScalePreviewToken {
  jobId: string;
  jobName: string;
  family: ScalePreviewFamily;
  id: string;
  variable: string;
}

/**
 * Tokens a job names that the current scale does not have.
 *
 * A prune is how a scale is edited; this is how the jobs answer back. Radius
 * and elevation cannot be pruned in the studio today, but a stored scale can
 * arrive without a level, and the warning is the same.
 */
export function missingScalePreviewTokens(
  jobs: readonly ScalePreviewJob[],
  scales: {
    spacing: SpacingScale;
    radius: RadiusScale;
    elevation: ElevationScale;
  },
): MissingScalePreviewToken[] {
  const steps = new Set(scales.spacing.steps);
  const radiusIds = new Set(scales.radius.tokens.map((token) => token.id));
  const elevationIds = new Set(
    scales.elevation.levels.map((level) => level.id),
  );

  const missing: MissingScalePreviewToken[] = [];
  for (const job of jobs) {
    for (const token of job.tokens) {
      const present =
        token.family === "spacing"
          ? steps.has(token.step)
          : token.family === "radius"
            ? radiusIds.has(token.id)
            : elevationIds.has(token.id);
      if (present) continue;
      missing.push({
        jobId: job.id,
        jobName: job.name,
        family: token.family,
        id: scalePreviewTokenId(token),
        variable: scalePreviewVariable(token),
      });
    }
  }
  return missing;
}
