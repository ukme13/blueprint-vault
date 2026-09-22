import type { Metadata } from "next";
import { Heading } from "@astryxdesign/core/Heading";
import { VStack } from "@astryxdesign/core/VStack";
import { ContrastTable } from "../../../components/ContrastTable";
import { FoundationsFrame } from "../../../components/FoundationsFrame";
import { SemanticTable } from "../../../components/SemanticTable";
import { readReferenceWorkspace } from "../../../lib/workspace";

export const metadata: Metadata = { title: "Semantic tokens" };

/**
 * The semantic layer: every role, both modes, and what it measures.
 *
 * Both modes are on the page at once rather than following the reader's own
 * theme, because the pair is the thing being described. The theme control
 * changes what the page is drawn in; it does not change what the page says.
 */
export default function SemanticFoundationPage() {
  const { project, palettes } = readReferenceWorkspace();
  const tokens = project.semantics ?? [];

  return (
    <FoundationsFrame
      path="foundations/semantic"
      summary="A role says when to use a colour, not what it is. Each one points at a palette shade, once per mode."
      sections={[
        {
          heading: "The roles",
          body: <SemanticTable palettes={palettes} tokens={tokens} />,
        },
        {
          heading: "What this layer measures",
          paragraphs: [
            "The pairs below are the ones a page actually ships: a foreground on the surface it sits on. The ratios are the accessibility report's own, computed for this workspace, so what is written here and what the report exports cannot disagree.",
          ],
          body: (
            <VStack gap={4}>
              <VStack gap={1}>
                <Heading level={3}>Light</Heading>
                <ContrastTable
                  mode="light"
                  palettes={palettes}
                  tokens={tokens}
                />
              </VStack>

              <VStack gap={1}>
                <Heading level={3}>Dark</Heading>
                <ContrastTable
                  mode="dark"
                  palettes={palettes}
                  tokens={tokens}
                />
              </VStack>
            </VStack>
          ),
        },
      ]}
      title="Semantic tokens"
    />
  );
}
