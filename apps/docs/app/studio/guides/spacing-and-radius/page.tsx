import type { Metadata } from "next";
import { FoundationsFrame } from "../../../../components/FoundationsFrame";
import { SPACING_AND_RADIUS_GUIDANCE } from "../../../../content/guides/spacing-and-radius";

export const metadata: Metadata = {
  title: "Spacing, radius and elevation",
  description:
    "The third of a system that is not colour or type: counting rather than multiplying, names rather than sizes.",
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
export default function SpacingAndRadiusGuidePage() {
  return (
    <FoundationsFrame
      path="studio/guides/spacing-and-radius"
      sections={SPACING_AND_RADIUS_GUIDANCE}
      summary={
        "Why spacing counts instead of multiplying, why radius is named for what it wraps, and why a shadow is held per mode."
      }
      title={"Spacing, radius and elevation"}
    />
  );
}
