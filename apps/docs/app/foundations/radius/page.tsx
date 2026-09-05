import type { Metadata } from "next";
import { Heading } from "@astryxdesign/core/Heading";
import { VStack } from "@astryxdesign/core/VStack";
import { RADIUS_GUIDANCE } from "../../../content/scale";
import { FoundationsFrame } from "../../../components/FoundationsFrame";
import { Prose } from "../../../components/Prose";
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
      summary={`The corners ${project.name} uses, named for what they belong to rather than for how round they are.`}
      title="Radius"
    >
      <VStack gap={4}>
        {RADIUS_GUIDANCE.map((block) => (
          <VStack gap={1} key={block.heading}>
            <Heading level={2}>{block.heading}</Heading>
            {block.paragraphs.map((paragraph) => (
              <Prose key={paragraph}>{paragraph}</Prose>
            ))}
          </VStack>
        ))}
      </VStack>

      <VStack gap={3}>
        <Heading level={2}>The tokens</Heading>
        <RadiusTable scale={project.radius} />
      </VStack>

      <VStack gap={3}>
        <Heading level={2}>Drawn on a surface</Heading>
        <RadiusSpecimen scale={project.radius} />
      </VStack>
    </FoundationsFrame>
  );
}
