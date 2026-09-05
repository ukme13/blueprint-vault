import type { Metadata } from "next";
import { Heading } from "@astryxdesign/core/Heading";
import { VStack } from "@astryxdesign/core/VStack";
import { PRIMITIVE_GUIDANCE } from "../../../content/colour";
import { PrimitiveTable } from "../../../components/PrimitiveTable";
import { Prose } from "../../../components/Prose";
import { FoundationsFrame } from "../../../components/FoundationsFrame";
import { readReferenceWorkspace } from "../../../lib/workspace";

export const metadata: Metadata = { title: "Colour" };

/**
 * The primitive palette, every track and every shade.
 *
 * Static, and rendered from the workspace file at build time. Nothing on this
 * page is written down: change a source colour in the reference workspace and
 * every row moves.
 */
export default function ColourFoundationPage() {
  const { project, palettes } = readReferenceWorkspace();

  return (
    <FoundationsFrame
      summary={`Every colour ${project.name} generates, and the names a developer installs them under.`}
      title="Colour"
    >
      <VStack gap={4}>
        {PRIMITIVE_GUIDANCE.map((block) => (
          <VStack gap={1} key={block.heading}>
            <Heading level={2}>{block.heading}</Heading>
            {block.paragraphs.map((paragraph) => (
              <Prose key={paragraph}>{paragraph}</Prose>
            ))}
          </VStack>
        ))}
      </VStack>

      <VStack gap={5}>
        <PrimitiveTable colourFormat="hex" palettes={palettes} />
      </VStack>
    </FoundationsFrame>
  );
}
