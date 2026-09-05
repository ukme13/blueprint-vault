import type { Metadata } from "next";
import { Heading } from "@astryxdesign/core/Heading";
import { VStack } from "@astryxdesign/core/VStack";
import { ELEVATION_GUIDANCE } from "../../../content/scale";
import { FoundationsFrame } from "../../../components/FoundationsFrame";
import { Prose } from "../../../components/Prose";
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
      summary={`How ${project.name} lifts a surface off the page, and why the shadow is the same colour in both modes.`}
      title="Elevation"
    >
      <VStack gap={4}>
        {ELEVATION_GUIDANCE.map((block) => (
          <VStack gap={1} key={block.heading}>
            <Heading level={2}>{block.heading}</Heading>
            {block.paragraphs.map((paragraph) => (
              <Prose key={paragraph}>{paragraph}</Prose>
            ))}
          </VStack>
        ))}
      </VStack>

      <VStack gap={3}>
        <Heading level={2}>The levels</Heading>
        <ElevationTable palettes={palettes} scale={project.elevation} />
      </VStack>

      <VStack gap={3}>
        <Heading level={2}>On a light ground and a dark one</Heading>
        <ElevationSpecimen
          palettes={palettes}
          scale={project.elevation}
          tokens={tokens}
        />
      </VStack>
    </FoundationsFrame>
  );
}
