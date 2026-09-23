import type { Metadata } from "next";
import { FoundationsFrame } from "../../../../components/FoundationsFrame";
import { ACCESSIBILITY_GUIDANCE } from "../../../../content/guides/accessibility";

export const metadata: Metadata = {
  title: "Simulation and accessibility",
  description:
    "What the contrast numbers mean, what the Vision chip does, and which pairs collapse for whom.",
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
export default function AccessibilityGuidePage() {
  return (
    <FoundationsFrame
      path="studio/guides/accessibility"
      sections={ACCESSIBILITY_GUIDANCE}
      summary={
        "WCAG thresholds, four simulations at published severities, and the pairs a ratio will never warn you about."
      }
      title={"Simulation and accessibility"}
    />
  );
}
