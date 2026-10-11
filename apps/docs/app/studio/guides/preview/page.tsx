import type { Metadata } from "next";
import { FoundationsFrame } from "../../../../components/FoundationsFrame";
import { PREVIEW_GUIDANCE } from "../../../../content/guides/preview";

export const metadata: Metadata = {
  title: "Preview and the inspector",
  description:
    "Selecting parts of the Preview page, what each offers, strokes and effects, and dressing a button.",
};

/**
 * Internal only, like every page under `/studio`.
 *
 * A thin page over a content module, which is how every page here is built
 * and, for a guide, is also what gets it past the hardcoded-value scanner:
 * prose is allowed to say 317px, JSX is not.
 *
 * See docs/roadmap/studio-guide.md.
 */
export default function PreviewGuidePage() {
  return (
    <FoundationsFrame
      path="studio/guides/preview"
      sections={PREVIEW_GUIDANCE}
      summary={
        "Selecting, the column beside the page, tokens not lengths, an edge that takes no room, and a button dressed two ways."
      }
      title={"Preview and the inspector"}
    />
  );
}
