import type { Metadata } from "next";
import { Heading } from "@astryxdesign/core/Heading";
import { VStack } from "@astryxdesign/core/VStack";
import { SPACING_GUIDANCE } from "../../../content/scale";
import { FoundationsFrame } from "../../../components/FoundationsFrame";
import { Prose } from "../../../components/Prose";
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
      summary={`The rhythm ${project.name} lays out on, and the names a developer installs it under.`}
      title="Spacing"
    >
      <VStack gap={4}>
        {SPACING_GUIDANCE.map((block) => (
          <VStack gap={1} key={block.heading}>
            <Heading level={2}>{block.heading}</Heading>
            {block.paragraphs.map((paragraph) => (
              <Prose key={paragraph}>{paragraph}</Prose>
            ))}
          </VStack>
        ))}
      </VStack>

      <VStack gap={3}>
        <Heading level={2}>The steps</Heading>
        <SpacingTable scale={project.spacing} />
      </VStack>

      <VStack gap={3}>
        <Heading level={2}>What each step looks like</Heading>
        <SpacingSpecimen scale={project.spacing} />
      </VStack>
    </FoundationsFrame>
  );
}
