import type { Metadata } from "next";
import { RADIUS_GUIDANCE } from "../../../content/scale";
import { FoundationsFrame } from "../../../components/FoundationsFrame";
import { RadiusSpecimen, RadiusTable } from "../../../components/RadiusScale";
import { readReferenceWorkspace } from "../../../lib/workspace";

export const metadata: Metadata = { title: "Radius" };

/**
 * The corner radii: what each is named for, what it is at this multiplier, and
 * what it looks like on a surface.
 */
export default function RadiusFoundationPage() {
  const { project } = readReferenceWorkspace();

  return (
    <FoundationsFrame
      path="foundations/radius"
      summary={`The corners ${project.name} uses, named for what they belong to rather than for how round they are.`}
      sections={[
        ...RADIUS_GUIDANCE,
        {
          heading: "The tokens",
          body: <RadiusTable scale={project.radius} />,
        },
        {
          heading: "Drawn on a surface",
          body: <RadiusSpecimen scale={project.radius} />,
        },
      ]}
      title="Radius"
    />
  );
}
