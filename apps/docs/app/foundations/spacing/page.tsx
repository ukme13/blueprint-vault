import type { Metadata } from "next";
import { SPACING_GUIDANCE } from "../../../content/scale";
import { FoundationsFrame } from "../../../components/FoundationsFrame";
import {
  SpacingSpecimen,
  SpacingTable,
} from "../../../components/SpacingScale";
import { readReferenceWorkspace } from "../../../lib/workspace";

export const metadata: Metadata = { title: "Spacing" };

/**
 * The spacing scale: the rule that made it, every step, and what each looks
 * like.
 *
 * The same shape as the colour and typography pages, rendered from the
 * workspace file at build time. Change the base unit in the reference
 * workspace and every number and every bar moves.
 */
export default function SpacingFoundationPage() {
  const { project } = readReferenceWorkspace();

  return (
    <FoundationsFrame
      path="foundations/spacing"
      summary={`The rhythm ${project.name} lays out on, and the names a developer installs it under.`}
      sections={[
        ...SPACING_GUIDANCE,
        {
          heading: "The steps",
          body: <SpacingTable scale={project.spacing} />,
        },
        {
          heading: "What each step looks like",
          body: <SpacingSpecimen scale={project.spacing} />,
        },
      ]}
      title="Spacing"
    />
  );
}
