import { describe, expect, it } from "vitest";
import { defaultElevationScale } from "./elevation";
import { defaultRadiusScale } from "./radius";
import {
  SCALE_PREVIEW_JOBS,
  missingScalePreviewTokens,
  scalePreviewVariable,
} from "./scale-preview";
import { defaultSpacingScale } from "./spacing";

const defaults = {
  spacing: defaultSpacingScale(),
  radius: defaultRadiusScale(),
  elevation: defaultElevationScale(),
};

describe("SCALE_PREVIEW_JOBS", () => {
  it("only names tokens the seeded scale has", () => {
    /* The rule that kept the colour set honest, applied here: a job that
       reaches for --spacing-14 is inventing a step the seed does not ship. */
    expect(missingScalePreviewTokens(SCALE_PREVIEW_JOBS, defaults)).toEqual([]);
  });

  it("covers spacing, radius and elevation, so one tab judges all three", () => {
    const families = new Set(
      SCALE_PREVIEW_JOBS.flatMap((job) =>
        job.tokens.map((token) => token.family),
      ),
    );
    expect([...families].sort()).toEqual(["elevation", "radius", "spacing"]);
  });
});

describe("missingScalePreviewTokens", () => {
  it("flags a pruned step the section still uses", () => {
    const spacing = {
      ...defaults.spacing,
      steps: defaults.spacing.steps.filter((step) => step !== 10),
    };

    const missing = missingScalePreviewTokens(SCALE_PREVIEW_JOBS, {
      ...defaults,
      spacing,
    });

    expect(missing).toEqual([
      {
        jobId: "section",
        jobName: "Section",
        family: "spacing",
        id: "10",
        variable: "--spacing-10",
      },
    ]);
  });

  it("names a missing elevation level the same way", () => {
    const elevation = {
      ...defaults.elevation,
      levels: defaults.elevation.levels.filter((level) => level.id !== "high"),
    };

    const missing = missingScalePreviewTokens(SCALE_PREVIEW_JOBS, {
      ...defaults,
      elevation,
    });

    expect(missing.map((each) => each.variable)).toEqual(["--shadow-high"]);
    expect(scalePreviewVariable({ family: "elevation", id: "high" })).toBe(
      "--shadow-high",
    );
  });
});
