import type { Metadata } from "next";
import { PRIMITIVE_GUIDANCE } from "../../../content/colour";
import { PrimitiveTable } from "../../../components/PrimitiveTable";
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
      path="foundations/colour"
      summary={`Every colour ${project.name} generates, and the names a developer installs them under.`}
      sections={[
        ...PRIMITIVE_GUIDANCE,
        {
          heading: "The tracks",
          body: <PrimitiveTable colourFormat="hex" palettes={palettes} />,
        },
      ]}
      title="Colour"
    />
  );
}
