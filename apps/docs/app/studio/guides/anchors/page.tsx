import type { Metadata } from "next";
import { FoundationsFrame } from "../../../../components/FoundationsFrame";
import { ANCHORS_GUIDANCE } from "../../../../content/guides/anchors";

export const metadata: Metadata = {
  title: "Anchors",
  description:
    "Keeping an exact brand colour inside a generated ramp, without breaking the row around it.",
};

/**
 * Internal only, like every page under `/studio`.
 *
 * A thin page over a content module, which is how every page here is built
 * and, for a guide, is also what gets it past the hardcoded-value scanner:
 * prose is allowed to say 4.5 and 12%, JSX is not.
 *
 * See docs/roadmap/studio-guide.md.
 */
export default function AnchorsGuidePage() {
  return (
    <FoundationsFrame
      path="studio/guides/anchors"
      sections={ANCHORS_GUIDANCE}
      summary={
        "How an exact colour survives contact with a generated palette, and how many is too many."
      }
      title={"Anchors"}
    />
  );
}
