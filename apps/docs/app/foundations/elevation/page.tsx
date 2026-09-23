import type { Metadata } from "next";
import { ELEVATION_GUIDANCE } from "../../../content/scale";
import { FoundationsFrame } from "../../../components/FoundationsFrame";
import {
  ElevationSpecimen,
  ElevationTable,
} from "../../../components/ElevationScale";
import { readReferenceWorkspace } from "../../../lib/workspace";

export const metadata: Metadata = { title: "Elevation" };

/**
 * The elevation levels, each on a light ground and a dark one.
 *
 * Both grounds regardless of the reader's mode, because the thing being
 * described is that the colour does not change and the strength does. Seeing
 * one mode at a time would suggest the opposite.
 */
export default function ElevationFoundationPage() {
  const { project, palettes } = readReferenceWorkspace();
  const tokens = project.semantics ?? [];

  return (
    <FoundationsFrame
      path="foundations/elevation"
      summary={`How ${project.name} lifts a surface off the page, and why the shadow is the same colour in both modes.`}
      sections={[
        ...ELEVATION_GUIDANCE,
        {
          heading: "The levels",
          body: (
            <ElevationTable palettes={palettes} scale={project.elevation} />
          ),
        },
        {
          heading: "On a light ground and a dark one",
          body: (
            <ElevationSpecimen
              palettes={palettes}
              scale={project.elevation}
              tokens={tokens}
            />
          ),
        },
      ]}
      title="Elevation"
    />
  );
}
